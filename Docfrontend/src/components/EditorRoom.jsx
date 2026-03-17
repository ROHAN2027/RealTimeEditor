import React, { useEffect, useState, useRef, use } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import QuillCursor from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import api from '../api/axiosSetup'; 
import {Tldraw} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import IsolatedMultiplayerTldraw from './IsolatedMultiplayerTldraw';
import { TLdrawBlot } from './TLdrawBlot';

import { useAuth } from '../context/AuthContext'; 
import { calculateFileHash,getColorFromUserId } from '../utils/fileHelpers';
Quill.register('modules/cursors', QuillCursor);
Quill.register(TLdrawBlot);


const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const EditorRoom = () => {
    const { projectId } = useParams();
    const { user } = useAuth(); 
    const editorRef = useRef(null);
    const quillInstance = useRef(null); 

    const ydocRef = useRef(null);
    const isolatedYdocRef = useRef(null);

    const [isConnected, setIsConnected] = useState(false);
    const [mainSocket, setMainSocket] = useState(null);

    // states for the TLdraw integration demo
    const [isTLdrawOpen, setIsTLdrawOpen] = useState(false);
    const [activeDrawingId, setActiveDrawingId] = useState(null);

    const [tldrawEditor, setTldrawEditor] = useState(null); // Store the TLdraw editor instance for future use

    const handleSaveDrawing = async () =>{
        if(!tldrawEditor) { return;}
        const shapeIds = Array.from(tldrawEditor.getCurrentPageShapeIds());
        if(shapeIds.length === 0){
            alert("No shapes to save!");
            return;
        }
        try{
            const token = localStorage.getItem('jwt_token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };
            const { blob } = await tldrawEditor.toImage(shapeIds, {
                format: 'png',
                background: true,
                padding: 20
            });

        console.log("hashing image");
        const fileHash = await calculateFileHash(blob);
        console.log("Frontend generated pure pixel hash for drawing export:", fileHash);

        const imageFile = new File([blob],`${activeDrawingId}.png`,{type : 'image/png'});
        const imageFormData = new FormData();
        imageFormData.append('image',imageFile);
        console.log("☁️ Uploading to Cloudinary...");
        const imgResponse = await api.post('/iupload', imageFormData, {
            params: { hash: fileHash, drawingId: activeDrawingId },
            headers: authHeaders
        });
        if (!imgResponse.data.success) {
                throw new Error("Failed to upload image to Cloudinary");
            }

        const finalImageUrl = imgResponse.data.imageUrl;
        console.log("✅ Image uploaded! URL:", finalImageUrl);

        console.log("compacting Yjs math..");
        const compactedYjsUpdate = Y.encodeStateAsUpdate(isolatedYdocRef.current);
        const yjsBlob = new Blob([compactedYjsUpdate]);

        const mathFormData = new FormData();
        mathFormData.append('yjsData', yjsBlob, `${activeDrawingId}.bin`);
        mathFormData.append('drawingId', activeDrawingId);
        mathFormData.append('projectId', projectId);
        mathFormData.append('thumbnailUrl', finalImageUrl);

        console.log("saving math to database...");
        const dbResponse = await api.post('/drawings/save', mathFormData, {
            headers: authHeaders
        });

        if (dbResponse.data.success) {
            alert("Drawing saved successfully!");

            if (quillInstance.current) {
                // 1. 🌟 THE DOM FIX: Bypass Quill's internal tree completely.
                // Search the actual HTML for the specific drawing ID.
                const boardNode = quillInstance.current.root.querySelector(`.custom-tldraw-blot[data-drawing-id="${activeDrawingId}"]`);

                if (boardNode) {
                    // 2. We found the HTML! Ask Quill to convert it into a Blot object.
                    const targetBlot = Quill.find(boardNode);
                    const index = quillInstance.current.getIndex(targetBlot);
                    
                    // 3. Swap the Red Box for the Image
                    quillInstance.current.formatText(index, 1, 'tldraw-board', { 
                        id: activeDrawingId, 
                        url: finalImageUrl 
                    }, 'user');
                    
                    console.log("✅ Editor successfully updated with the saved image!");
                } else {
                    console.error("❌ Could not find board in the DOM with ID:", activeDrawingId);
                }
            }
            setIsTLdrawOpen(false);
        } else {
                alert("Failed to save drawing math on the server.");
            }
        } catch (error) {
            console.error("Failed to save drawing:", error);
            alert("Error saving drawing: " + error.message);
        }
    }

    const insertDummyBoard = () => {
        if (!quillInstance.current) return;

        const range = quillInstance.current.getSelection(true);
        const cursorPosition = range ? range.index : 0;

        const fakeDrawingId = `draw_${Math.floor(Math.random() * 10000)}`;

        quillInstance.current.insertEmbed(
            cursorPosition, 
            'tldraw-board', // Must match TldrawBlot.blotName
            { id: fakeDrawingId }, 
            'user'
        );
    };

    // ✅ FIX 1: Moved this INSIDE the component so it can access quillInstance!
    const uploadFileAndEmbed = async (file) => {
        if (!quillInstance.current) return;

        const range = quillInstance.current.getSelection(true);
        const cursorPosition = range ? range.index : 0;
        
        try {
            quillInstance.current.insertText(cursorPosition, 'Uploading image...', { italic: true }, 'user');
            const formData = new FormData();
            const fileHash = await calculateFileHash(file); 
            console.log("Frontend generated pure pixel hash:", fileHash);

            formData.append('image', file);
            const token = localStorage.getItem('jwt_token');
            // ✅ FIX 3: Axios automatically parses JSON. No need for response.json()
            const response = await api.post('/iupload', formData, {
                params: { hash: fileHash },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });// Ensure your backend route matches this
            const data = response.data; 

            quillInstance.current.deleteText(cursorPosition, 'Uploading image...'.length, 'user');
            
            if(data.success && data.imageUrl){
                quillInstance.current.insertEmbed(cursorPosition, 'image', data.imageUrl, 'user');
            } else {
                alert("Upload failed: " + (data.message || "Unknown error"));
            }

        } catch (error) {
            console.error("Image Upload Error:", error);
            quillInstance.current.deleteText(cursorPosition, 'Uploading image...'.length, 'user');
            alert("Failed to upload image. Please try again.");
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('jwt_token'); 
        if (!token || !user) return;

        if (!ydocRef.current) {
            ydocRef.current = new Y.Doc();
        }
        const ydoc = ydocRef.current;
        const socket = io(backendUrl, { auth: { token } });
        setMainSocket(socket); // Store the main socket in state for passing to child components
        const ytext = ydoc.getText('quill');
        let binding;

        const awareness = new awarenessProtocol.Awareness(ydoc);
        awareness.setLocalStateField('user', {
            name: user.name || 'Anonymous',
            color: getColorFromUserId(user._id)
        });

        const imageHandler = () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = async () => {
                const file = input.files[0];
                if (file) {
                    await uploadFileAndEmbed(file);
                }
            };
        };

        if (editorRef.current && !quillInstance.current) {
            editorRef.current.innerHTML = '';
            const editorElement = document.createElement('div');
            editorRef.current.appendChild(editorElement);

            quillInstance.current = new Quill(editorElement, {
                theme: 'snow',
                modules: {
                    cursors: true, 
                    // ✅ FIX 2: Handlers are now properly nested inside the toolbar object
                    toolbar: {
                        container: [
                            [{ header: [1, 2, false] }],
                            ['bold', 'italic', 'underline'],
                            ['image', 'code-block', 'link']
                        ],
                        handlers: {
                            image: imageHandler 
                        }
                    }
                }
            });

            quillInstance.current.root.addEventListener('paste', (e) => {
                if(e.clipboardData && e.clipboardData.items) {
                    const items = e.clipboardData.items;
                    for(let i = 0; i < items.length; i++) {
                        if(items[i].type.indexOf('image') !== -1) {
                            e.preventDefault();
                            const file = items[i].getAsFile();
                            if(file) {
                                uploadFileAndEmbed(file);
                            }
                            return;
                        }
                    }
                }
            });

            quillInstance.current.root.addEventListener('dblclick', (e) => {
                const blotnode = e.target.closest('.custom-tldraw-blot');
                if (blotnode) {
                    const drawingId = blotnode.getAttribute('data-drawing-id');
                    console.log(`TLdraw board ${drawingId} was double-clicked!`);
                    setActiveDrawingId(drawingId);
                    setIsTLdrawOpen(true);

                }
            });
            
            binding = new QuillBinding(ytext, quillInstance.current, awareness);
        }

        socket.on('connect', () => {
            console.log("🟢 Connected to server");
            setIsConnected(true);
            socket.emit("join-document", projectId);
        });

        socket.on('connect_error', () => setIsConnected(false));
        socket.on('disconnect', () => setIsConnected(false));

        socket.on('yjs-init', (updateData) => {
            if (!updateData || updateData.byteLength === 0) return; 
            try {
                Y.applyUpdate(ydoc, new Uint8Array(updateData), 'server');
            } catch (error) {
                console.error("Yjs Init Error - Database data might be corrupted:", error);
            }
        });

        socket.on('yjs-update', (updateData) => {
            if (!updateData || updateData.byteLength === 0) return;
            try {
                Y.applyUpdate(ydoc, new Uint8Array(updateData), 'server');
            } catch (error) {
                console.error("Yjs Update Error:", error);
            }
        });

        ydoc.on('update', (update, origin) => {
            if (origin !== 'server') {
                socket.emit('yjs-update', projectId, update);
            }
        });

        awareness.on('update', ({ added, updated, removed }, origin) => {
            if (origin !== 'server') {
                const changedClients = added.concat(updated, removed);
                const updateBuffer = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
                socket.emit('yjs-awareness', projectId, updateBuffer);
            }
        });

        socket.on('yjs-awareness', (updateBuffer) => {
            if (!updateBuffer || updateBuffer.byteLength === 0) return;
            try {
                awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(updateBuffer), 'server');
            } catch (error) {
                console.error("Awareness Update Error:", error);
            }
        });

        return () => {
            console.log("🔴 Cleaning up Editor...");
            socket.disconnect();
            if (binding) binding.destroy();
            awareness.destroy(); 
            ydoc.destroy();
            quillInstance.current = null;
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
        };

    }, [projectId, user?._id, user?.name]); 

    return (
        <div className="editor-container">
            <div className="editor-header">
                <h2>Project Editor</h2>
                <span style={{ color: isConnected ? 'green' : 'red', marginLeft: '10px' }}>
                    {isConnected ? 'Live' : 'Connecting...'}
                </span>
                <button 
                    onClick={insertDummyBoard} 
                    style={{ marginLeft: '20px', padding: '5px 10px', cursor: 'pointer' }}
                >
                    Insert Dummy TLDraw
                </button>
            </div>
            <div ref={editorRef} style={{ height: '80vh' }}></div>
            {/* 🌟 NEW: The Fixed TLDraw Full-Screen Modal */}
            {isTLdrawOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', padding: '20px',
                    boxSizing: 'border-box' // 🔧 FIX: Stops the padding from pushing it off-screen!
                }}>
                    {/* Modal Header */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px 8px 0 0',
                        borderBottom: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ margin: 0 }}>Editing Drawing: {activeDrawingId}</h3>
                        
                        {/* 🔧 FIX: Added a gap and the new Save Button */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={handleSaveDrawing} 
                                style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Save Drawing
                            </button>
                            <button 
                                onClick={() => setIsTLdrawOpen(false)} 
                                style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* The Actual Canvas */}
                    <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '0 0 8px 8px', overflow: 'hidden', position: 'relative' }}>
                        {/* 🌟 Use the wrapper and pass the global Yjs Doc! */}
                        {
                            <IsolatedMultiplayerTldraw 
                                drawingId={activeDrawingId}
                                projectId={projectId}
                                onMount={setTldrawEditor}
                                isolatedYdocRef={isolatedYdocRef}
                                mainSocket={mainSocket}
                                // 🌟 NEW: Pass the empty bucket
                            />
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorRoom;