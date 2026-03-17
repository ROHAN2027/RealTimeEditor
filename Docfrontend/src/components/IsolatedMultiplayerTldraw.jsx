import React , { use, useEffect, useState } from 'react';
import * as Y from 'yjs';
import io from 'socket.io-client';
import { Tldraw }from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useYjsStore } from '../hooks/useYjsStore';
import api from '../api/axiosSetup'; 

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // Adjust if your backend is on a different URL/port

const IsolatedMultiplayerTldraw = ({ drawingId ,projectId , onMount , isolatedYdocRef, mainSocket }) => {
    const [isolatedYdoc, setIsolatedYdoc] = useState(null);
    const [isolatedMap, setIsolatedMap] = useState(null);

    useEffect(() => {
        console.log(`spining up isolated RAM for drawingId: ${drawingId}, projectId: ${projectId}`);
        const tempDoc = new Y.Doc();
        const tempMap = tempDoc.getMap('tldraw-data');

        if(isolatedYdocRef) {
            isolatedYdocRef.current = tempDoc;
        }

        // todo : add fetch call here later to load form MongoDb
        // ==========================================
        // STEP 1: FETCH THE DATABASE HISTORY
        // ==========================================

        const loadExistingDrawing = async()=>{
            try{
                const token = localStorage.getItem('jwt_token');
                const response = await api.get(`/drawings/${drawingId}`, {
                    responseType: 'arraybuffer', // Expect binary data (Yjs updates) from the server
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if(response.data && response.data.byteLength > 0){
                        const arrayBuffer = response.data;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        Y.applyUpdate(tempDoc, uint8Array,'server'); // Load the existing drawing data into the isolated Yjs document
                        console.log(`Existing drawing data loaded for drawingId: ${drawingId}`);
                }else{
                    console.log(`No existing drawing found for drawingId: ${drawingId}, starting with a blank canvas.`);
                }
                // Process the response and apply the drawing data to the isolated Yjs document
            } catch (error) {
               if (error.response && error.response.status === 404) {
                    console.log(`🆕 No existing drawing found for ${drawingId}, starting blank.`);
                } else {
                    console.error('Error fetching existing drawing:', error);
                }
            }
        }
        // fire the fetch request immediately to load the existing drawing data before setting up the WebSocket connection
        loadExistingDrawing();

        // ==========================================
        // STEP 2: MULTIPLEXED SOCKET CONNECTIONS
        // ==========================================

        if(!mainSocket) return; // Ensure mainSocket is available before proceeding

        const roomName = `drawing_${drawingId}`;

        mainSocket.emit('join-tldraw-room',  roomName );
        mainSocket.emit("request-tldraw-sync",  roomName ); // Request the latest drawing data from the server

        const handleSendDirectSync = (targetSocketId)=>{
            console.log(`📦 Sending direct sync to newcomer: ${targetSocketId}`);
             const currentLiveState = Y.encodeStateAsUpdate(tempDoc);
             mainSocket.emit('direct-tldraw-sync', { 
                targetId : targetSocketId, 
                roomName : roomName, 
                updateData : currentLiveState 
            });
        };

        const handleIncomingUpdate =({incomingDrawingId, updateData})=>{
            if(incomingDrawingId !== drawingId) return; // Ignore updates for other drawings
            Y.applyUpdate(tempDoc,new Uint8Array(updateData),'server'); // Apply incoming updates to the isolated Yjs document
            console.log(`🔄 Received update for drawingId: ${incomingDrawingId}, applying to isolated Yjs document.`);
        }

        mainSocket.on('send-direct-tldraw-sync', handleSendDirectSync);
        mainSocket.on('tldraw-update', handleIncomingUpdate);

        tempDoc.on('update', (update, origin) => {
            if (origin === 'server') {
                return;
            }
            console.log(`📤 Local update detected in isolated Yjs document for drawingId: ${drawingId}, broadcasting to room: ${roomName}`)
            mainSocket.emit('tldraw-update', { 
                roomName:roomName, 
                drawingId : drawingId, 
                updateData : update 
            });
        } );
        

        

        setIsolatedYdoc(tempDoc);
        setIsolatedMap(tempMap);
        // ==========================================
        // STEP 3: CLEANUP (Critical for multiplexing!)
        // ==========================================
        return () => {
            console.log(`cleaning up isolated RAM for drawingId: ${drawingId}, projectId: ${projectId}`);
            const cleanupRoomName = `drawing_${drawingId}`;
            mainSocket.emit('leave-tldraw-room', cleanupRoomName);
            mainSocket.off('send-direct-tldraw-sync', handleSendDirectSync);
            mainSocket.off('tldraw-update', handleIncomingUpdate);
            tempDoc.destroy();
            if(isolatedYdocRef) {
                isolatedYdocRef.current = null;
            }
        };
    },[drawingId,mainSocket,isolatedYdocRef]);

    const {store ,status} = useYjsStore(isolatedMap);
    if(status === 'loading' || !isolatedMap) {
        return <div style={{ padding: 20 }}>Loading isolated collaborative canvas...</div>;
    }
    return (<Tldraw
        store={store}
        components={{SharePanel: ()=>null}}
        onMount={onMount}
/>
    );  
};

export default IsolatedMultiplayerTldraw;
