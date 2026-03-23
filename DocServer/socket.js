import {Server} from 'socket.io';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import Project from './models/Project.js';


// 🧠 THE RAM BUFFER
// This Map holds all active documents in the server's memory.
// Structure: { "projectId": { doc: Y.Doc, isDirty: boolean, clients: Set } }
const activeDocuments = new Map(); // Map to store active Yjs documents in memory

setInterval(async() => {
    for(const [projectId, data] of activeDocuments.entries()) {
        if(data.isDirty) {
            try{
                const stateVector = Y.encodeStateAsUpdate(data.doc);
                await Project.findByIdAndUpdate(projectId, { 
                    documentData: Buffer.from(stateVector)
                });
                data.isDirty = false; // Mark as clean after saving
                console.log(`Project ${projectId} autosaved to database.`);
            }catch(error) {
                console.error(`Error saving project ${projectId} to database:`, error);
            }
        }
    }

},30000);

export const initializeSocket = (httpServer) => {
    const allowedOrigins = (process.env.CLIENT_URLS || 'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const io = new Server(httpServer, {
        cors:{
            origin : allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    // 🛑 1. Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        }catch (error) {
            console.error("Authentication error:", error);
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    // 🟢 2. Handle Connections
    io.on('connection', (socket) => {
        let currentRoom = null;

        socket.on("join-document", async (projectId) => {
            try{
                const project = await Project.findById(projectId).select('+documentData');
                if (!project) {
                    return socket.emit("error", "Project not found");
                }
                if (project.ownerId.toString() !== socket.userId && !project.collaborators.includes(socket.userId)) {
                    return socket.emit("error", "Access denied. You do not have permission to access this project.");
                }
                socket.join(projectId);
                currentRoom = projectId;

                if(!activeDocuments.has(projectId)) {
                    const ydoc = new Y.Doc();
                    if(project.documentData) {
                        const uint8Array = new Uint8Array(project.documentData);
                        Y.applyUpdate(ydoc, uint8Array);
                    }
                    activeDocuments.set(projectId,{ 
                        doc: ydoc,
                        isDirty: false, 
                        clients: new Set([socket.id]) 
                    });
                }else{
                    activeDocuments.get(projectId).clients.add(socket.id);
                }

                const serverDoc = activeDocuments.get(projectId).doc;
                const stateVector = Y.encodeStateAsUpdate(serverDoc);
                socket.emit("yjs-init", stateVector);
            }catch(error) {
                console.error("Error joining document:", error);
                socket.emit("error", "An error occurred while joining the document.");
            }
        });   
        
        socket.on("yjs-update", (projectId, update) => {
            socket.to(projectId).emit("yjs-update", update);// Broadcast the update to other clients in the same room

            //applyq the update to the server's Yjs document
            const roomdata = activeDocuments.get(projectId);
            if(roomdata) {
                const updateUint8 = new Uint8Array(update);
                Y.applyUpdate(roomdata.doc, updateUint8);
                roomdata.isDirty = true; // Mark the document as dirty since it has unsaved changes
            }
        });

        socket.on("yjs-awareness",(projectId, awarenessData) => {
            // Handle awareness updates
            socket.to(projectId).emit("yjs-awareness", awarenessData);
        });

        // socket.on("disconnect",async() => {
        //     if(currentRoom && activeDocuments.has(currentRoom)) {
        //         const roomdata = activeDocuments.get(currentRoom);
        //         roomdata.clients.delete(socket.id);
        //         if(roomdata.clients.size === 0) {
        //             if(roomdata.isDirty) {
        //                 const stateVector = Y.encodeStateAsUpdate(roomdata.doc);
        //                 await Project.findByIdAndUpdate(currentRoom, {
        //                     documentData: Buffer.from(stateVector)
        //                 });
        //                 console.log(`Project ${currentRoom} saved to database on last client disconnect.`);
        //             }
        //             activeDocuments.delete(currentRoom);
        //             console.log(`Project ${currentRoom} removed from memory as no clients are connected.`);
        //         }
        //     }
        // });
        socket.on("disconnect", async () => {
            if(currentRoom && activeDocuments.has(currentRoom)) {
                const roomdata = activeDocuments.get(currentRoom);
                roomdata.clients.delete(socket.id);
                
                // If the room is empty, we need to save and clean up
                if(roomdata.clients.size === 0) {
                    if(roomdata.isDirty) {
                        const stateVector = Y.encodeStateAsUpdate(roomdata.doc);
                        try {
                            await Project.findByIdAndUpdate(currentRoom, {
                                documentData: Buffer.from(stateVector)
                            });
                            console.log(`Project ${currentRoom} saved to database on disconnect.`);
                            roomdata.isDirty = false;
                        } catch (error) {
                            console.error(`Error saving project ${currentRoom} on disconnect:`, error);
                        }
                    }
                    
                    // 🌟 THE RACE CONDITION CURE:
                    // Because 'await' pauses the code, we must check if a user quickly 
                    // refreshed and rejoined the room while we were waiting for MongoDB!
                    // Only delete the RAM buffer if the room is STILL empty.
                    if(roomdata.clients.size === 0) {
                        activeDocuments.delete(currentRoom);
                        console.log(`Project ${currentRoom} removed from memory as no clients are connected.`);
                    } else {
                        console.log(`Project ${currentRoom} kept in memory (User rejoined during save).`);
                    }
                }
            }
        });

        // ==========================================
        // MULTIPLEXED TLDRaw ROUTING
        // ==========================================

        socket.on('join-tldraw-room', (roomName ) => {
            socket.join(roomName);
            console.log(`Socket ${socket.id} joined tldraw room: ${roomName}`);
        });

        socket.on('leave-tldraw-room', (roomName) => {
            socket.leave(roomName);
            console.log(`Socket ${socket.id} left tldraw room: ${roomName}`);
        });

        socket.on('request-tldraw-sync', async (roomName) => {
            console.log(`Received tldraw sync request from ${socket.id} for room: ${roomName}`);
            const socketsInRoom  = await io.in(roomName).fetchSockets();
            const otherusers = socketsInRoom.filter(s => s.id !== socket.id);
            if(otherusers.length > 0) {
                const designatedSender = otherusers[0]; // Just pick the first one we find
                console.log(`Forwarding direct sync request from ${socket.id} to ${designatedSender.id} in room: ${roomName}`);
                io.to(designatedSender.id).emit('send-direct-tldraw-sync', socket.id); // Ask the designated sender to send a direct sync to the requester
            }
        });

        socket.on('direct-tldraw-sync', ({ targetId, roomName, updateData }) => {
            const room = io.sockets.adapter.rooms.get(roomName);
            console.log(`Received direct sync data from ${socket.id} for target ${targetId} in room: ${roomName}`);
            if (room && room.has(targetId) && room.has(socket.id)) {
                const incomingDrawingId = roomName.replace('drawing_', '');
            io.to(targetId).emit('tldraw-update', { incomingDrawingId, updateData });
            }
        });

        // 4. standard Live Drawing Broadcast
        socket.on('tldraw-update', ({ roomName, drawingId, updateData }) => {
            socket.to(roomName).emit('tldraw-update', { 
                incomingDrawingId: drawingId,
                updateData 
            }); // Broadcast the update to other clients in the same room
        });
    });

}
