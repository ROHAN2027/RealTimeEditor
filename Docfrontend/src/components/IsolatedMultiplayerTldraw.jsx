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
                const response = await api.get(`/drawings/${projectId}/${drawingId}`, {
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

// ==========================================
        // 🌟 1. THE ECHO LOCK (Mutex)
        // ==========================================
        let isApplyingRemoteUpdate = false;


        const handleIncomingUpdate = ({incomingDrawingId, updateData}) => {
            if(incomingDrawingId !== drawingId) return;
            
            // 🔒 1. LOCK THE BROADCASTER
            isApplyingRemoteUpdate = true;

            try {
                let parsedData;
                if (updateData && updateData.type === 'Buffer' && Array.isArray(updateData.data)) {
                    parsedData = new Uint8Array(updateData.data);
                } else {
                    parsedData = new Uint8Array(updateData);
                }

                if (parsedData && parsedData.length > 0) {
                    Y.applyUpdate(tempDoc, parsedData, 'server'); 
                }
            } catch (error) {
                console.error("Error applying incoming tldraw sync:", error);
            } 
            
            // 🔓 2. THE ZERO-MILLISECOND UNLOCK
            // requestAnimationFrame waits for the exact moment the browser finishes 
            // painting the new drawing to the screen, guaranteeing the echo has passed.
            requestAnimationFrame(() => {
                setTimeout(() => {
                    isApplyingRemoteUpdate = false;
                }, 0);
            });
        }

        mainSocket.on('send-direct-tldraw-sync', handleSendDirectSync);
        mainSocket.on('tldraw-update', handleIncomingUpdate);

        // ==========================================
        // 🌟 2. BATCHED BROADCASTER WITH LOCK CHECK
        // ==========================================
        let pendingUpdates = [];
        let batchTimeout = null;

        tempDoc.on('update', (update, origin) => {
            if (origin === 'server') return;
            
            // 🛑 IF THE LOCK IS ACTIVE, DO NOT ECHO!
            if (isApplyingRemoteUpdate) return; 

            pendingUpdates.push(update);

            if (!batchTimeout) {
                batchTimeout = setTimeout(() => {
                    if (pendingUpdates.length > 0) {
                        const mergedUpdate = Y.mergeUpdates(pendingUpdates);
                        mainSocket.emit('tldraw-update', { 
                            roomName: roomName, 
                            drawingId : drawingId, 
                            updateData : mergedUpdate 
                        });
                        pendingUpdates = [];
                    }
                    batchTimeout = null;
                }, 50); // 20 Frames Per Second (Smooth and Network Friendly)
            }
        });
        

        

        setIsolatedYdoc(tempDoc);
        setIsolatedMap(tempMap);
        // ==========================================
        // STEP 3: CLEANUP (Critical for multiplexing!)
        // ==========================================
        return () => {
            console.log(`cleaning up isolated RAM for drawingId: ${drawingId}, projectId: ${projectId}`);
            if(batchTimeout) {
                clearTimeout(batchTimeout);
            }
            

            if(pendingUpdates.length > 0) {
                const finalMergedUpdate = Y.mergeUpdates(pendingUpdates);
                console.log(`📤 Sending final batch of updates before cleanup for drawingId: ${drawingId}`);
                mainSocket.emit('tldraw-update', { 
                    roomName:`drawing_${drawingId}`, 
                    drawingId : drawingId, 
                    updateData : finalMergedUpdate 
                });
                pendingUpdates = [];
            }
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
