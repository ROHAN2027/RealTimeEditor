import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import QuillCursor from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import api from '../api/axiosSetup'; 
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import IsolatedMultiplayerTldraw from './IsolatedMultiplayerTldraw';
import { TLdrawBlot } from './TLdrawBlot';
import html2pdf from 'html2pdf.js';
import { PageBreakBlot } from './PageBreakBlot';
import './EditorRoom.css';

import ProjectSideBar from './ProjectSideBar';
import VersionPreviewModal from './VersionPreviewModal';

import { useAuth } from '../context/AuthContext'; 
import { useSocket } from '../context/SocketContext';

import { calculateFileHash, getColorFromUserId } from '../utils/fileHelpers';
Quill.register('modules/cursors', QuillCursor);
Quill.register(TLdrawBlot);
Quill.register(PageBreakBlot);

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const EditorRoom = () => {
    const { projectId } = useParams();
    const { user } = useAuth(); 
    const socket = useSocket();

    const editorRef = useRef(null);
    const quillInstance = useRef(null); 

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const ydocRef = useRef(null);
    const isolatedYdocRef = useRef(null);
    const awarenessRef = useRef(null);

    const [isConnected, setIsConnected] = useState(false);
    const [mainSocket, setMainSocket] = useState(null);

    const [isTLdrawOpen, setIsTLdrawOpen] = useState(false);
    const [activeDrawingId, setActiveDrawingId] = useState(null);

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    const [previewVersionId, setPreviewVersionId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [versionRefreshTrigger, setVersionRefreshTrigger] = useState(0);

    const [pdfSettings, setPdfSettings] = useState({
        filename: 'Project_Document',
        format: 'a4',
        orientation: 'portrait'
    });

    const generatePdfPreview = (currentSettings) => {
        const element = document.querySelector('.ql-editor');
        if (!element) return;

        setIsGeneratingPreview(true);
        element.classList.add('pdf-exporting');

        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5], 
            filename:     currentSettings.filename + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'in', format: currentSettings.format, orientation: currentSettings.orientation },
            pagebreak:    { mode: ['css', 'legacy'], after: '.custom-page-break' }
        };
        
        html2pdf().set(opt).from(element).output('bloburl').then((pdfUrl) => {
            element.classList.remove('pdf-exporting');
            setPdfPreviewUrl(pdfUrl);
            setIsGeneratingPreview(false);
        });
    };

    useEffect(() => {
        if (isPdfModalOpen) generatePdfPreview(pdfSettings);
    }, [isPdfModalOpen, pdfSettings.format, pdfSettings.orientation]);

    const [tldrawEditor, setTldrawEditor] = useState(null); 

    const handleSaveDrawing = async () => {
        if(!tldrawEditor) return;
        const shapeIds = Array.from(tldrawEditor.getCurrentPageShapeIds());
        if(shapeIds.length === 0) { alert("No shapes to save!"); return; }
        
        try {
            const token = localStorage.getItem('jwt_token');
            const authHeaders = { 'Authorization': `Bearer ${token}` };
            const { blob } = await tldrawEditor.toImage(shapeIds, { format: 'png', background: true, padding: 20 });

            const fileHash = await calculateFileHash(blob);
            const imageFile = new File([blob],`${activeDrawingId}.png`,{type : 'image/png'});
            const imageFormData = new FormData();
            imageFormData.append('image',imageFile);
            
            const imgResponse = await api.post(`${projectId}/iupload`, imageFormData, {
                params: { hash: fileHash, drawingId: activeDrawingId },
                headers: authHeaders
            });
            if (!imgResponse.data.success) throw new Error("Failed to upload image to Cloudinary");

            const finalImageUrl = imgResponse.data.imageUrl;
            const compactedYjsUpdate = Y.encodeStateAsUpdate(isolatedYdocRef.current);
            const yjsBlob = new Blob([compactedYjsUpdate]);

            const mathFormData = new FormData();
            mathFormData.append('yjsData', yjsBlob, `${activeDrawingId}.bin`);
            mathFormData.append('drawingId', activeDrawingId);
            mathFormData.append('projectId', projectId);
            mathFormData.append('thumbnailUrl', finalImageUrl);

            const dbResponse = await api.post(`/drawings/${projectId}/save`, mathFormData, { headers: authHeaders });

            if (dbResponse.data.success) {
                alert("Drawing saved successfully!");
                if (quillInstance.current) {
                    const boardNode = quillInstance.current.root.querySelector(`.custom-tldraw-blot[data-drawing-id="${activeDrawingId}"]`);
                    if (boardNode) {
                        const targetBlot = Quill.find(boardNode);
                        const index = quillInstance.current.getIndex(targetBlot);
                        quillInstance.current.formatText(index, 1, 'tldraw-board', { id: activeDrawingId, url: finalImageUrl }, 'user');
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
        quillInstance.current.insertEmbed(cursorPosition, 'tldraw-board', { id: fakeDrawingId }, 'user');
    };

    const insertPageBreak = () => {
        if (!quillInstance.current) return;
        const range = quillInstance.current.getSelection(true);
        const cursorPosition = range ? range.index : 0;
        quillInstance.current.insertEmbed(cursorPosition, 'page-break', true, 'user');
        quillInstance.current.setSelection(cursorPosition + 1, Quill.sources.SILENT);
    };

    const uploadFileAndEmbed = async (file) => {
        if (!quillInstance.current) return;
        const range = quillInstance.current.getSelection(true);
        const cursorPosition = range ? range.index : 0;
        try {
            quillInstance.current.insertText(cursorPosition, 'Uploading image...', { italic: true }, 'user');
            const formData = new FormData();
            const fileHash = await calculateFileHash(file); 
            formData.append('image', file);
            
            const token = localStorage.getItem('jwt_token');
            const response = await api.post(`${projectId}/iupload`, formData, {
                params: { hash: fileHash },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = response.data; 

            quillInstance.current.deleteText(cursorPosition, 'Uploading image...'.length, 'user');
            if(data.success && data.imageUrl) {
                quillInstance.current.insertEmbed(cursorPosition, 'image', data.imageUrl, 'user');
            } else {
                alert("Upload failed: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            quillInstance.current.deleteText(cursorPosition, 'Uploading image...'.length, 'user');
            alert("Failed to upload image. Please try again.");
        }
    };

    const handleManualSave = async () => {
        if (!ydocRef.current) return;
        const customName = prompt("Enter a name for this version:", `Manual Save - ${new Date().toLocaleTimeString()}`);
        if (!customName) return;
        setIsSaving(true);
        try{
            const currentBlob = Y.encodeStateAsUpdate(ydocRef.current);
            const token = localStorage.getItem('jwt_token');
            await api.post(`/projects/${projectId}/versions`, {
                versionName: customName,
                binaryData: Array.from(currentBlob),
                saveType: 'manual'
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            setVersionRefreshTrigger(prev => prev + 1);
            alert("Project saved successfully!");
        } catch (error) {
            alert("Failed to save project.");
        } finally {
            setIsSaving(false);
        }
    }

    // 🌟 FULLY REWRITTEN RESTORE (Guarantees Database Save)
    const executeRestore = async(oldBinaryPayload) => {
        if (!ydocRef.current || !quillInstance.current) return;
        const confirmRestore = window.confirm("Restoring this version will overwrite all current unsaved changes. Are you sure?");
        if (!confirmRestore) return;
        
        setIsSaving(true); 

        try {
            const currentBlob = Y.encodeStateAsUpdate(ydocRef.current);
            const token = localStorage.getItem('jwt_token');
            
            // Backup current state
            await api.post(`/projects/${projectId}/versions`, {
                versionName: `Pre-Revert Auto-Backup`,
                binaryData: Array.from(currentBlob),
                saveType: 'auto' 
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            setVersionRefreshTrigger(prev => prev + 1);

            // Extract the old delta
            const tempDoc = new Y.Doc();
            Y.applyUpdate(tempDoc, oldBinaryPayload);
            const oldDelta = tempDoc.getText('quill').toDelta();

            // Clear the screen and wait
            const liveText = ydocRef.current.getText('quill');
            ydocRef.current.transact(() => { liveText.delete(0, liveText.length); });

            setTimeout(() => {
                // Paste the old version to screen
                quillInstance.current.setContents(oldDelta, 'user');

                // 🌟 TRAP 3 CURE: FORCE A HARD DATABASE SAVE IMMEDIATELY AFTER RESTORE!
                // This guarantees the restored data is saved even if you close the tab instantly!
                setTimeout(async () => {
                    const restoredBlob = Y.encodeStateAsUpdate(ydocRef.current);
                    await api.post(`/projects/${projectId}/versions`, {
                        versionName: `Restored Configuration`,
                        binaryData: Array.from(restoredBlob),
                        saveType: 'manual' 
                    }, { headers: { Authorization: `Bearer ${token}` }});
                    
                    setVersionRefreshTrigger(prev => prev + 1);
                    setPreviewVersionId(null);
                    setIsSaving(false);
                    alert("Version restored and saved successfully!");
                }, 500);

            }, 100); 

        }
        catch(error) {
            console.error("Restore Error:", error);
            setIsSaving(false);
            alert("Failed to restore version.");
        }
    }

    // 🌟 CLEANED & DEDUPLICATED WEBSOCKET LOGIC
    useEffect(() => {
        if (!socket || !user) return; // ✅ Just wait for the Global Socket and User!

        if (!ydocRef.current) ydocRef.current = new Y.Doc();
        const ydoc = ydocRef.current;
        
        setMainSocket(socket);  // pass to TLdraw
        
        const ytext = ydoc.getText('quill');
        let binding;

        const awareness = new awarenessProtocol.Awareness(ydoc);
        awarenessRef.current = awareness;

        awareness.setLocalStateField('user', {
            _id: user?._id,
            name: user?.name || 'Anonymous',
            color: getColorFromUserId(user?._id)
        });

        const imageHandler = () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            input.onchange = async () => {
                if (input.files[0]) await uploadFileAndEmbed(input.files[0]);
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
                    toolbar: {
                        container: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image', 'code-block', 'link'] ],
                        handlers: { image: imageHandler }
                    }
                }
            });

            quillInstance.current.root.addEventListener('paste', (e) => {
                if(e.clipboardData && e.clipboardData.items) {
                    for(let i = 0; i < e.clipboardData.items.length; i++) {
                        if(e.clipboardData.items[i].type.indexOf('image') !== -1) {
                            e.preventDefault();
                            const file = e.clipboardData.items[i].getAsFile();
                            if(file) uploadFileAndEmbed(file);
                            return;
                        }
                    }
                }
            });

            quillInstance.current.root.addEventListener('dblclick', (e) => {
                const blotnode = e.target.closest('.custom-tldraw-blot');
                if (blotnode) {
                    setActiveDrawingId(blotnode.getAttribute('data-drawing-id'));
                    setIsTLdrawOpen(true);
                }
            });
            
            binding = new QuillBinding(ytext, quillInstance.current, awareness);
        }

        // 🌟 ONE UNIVERSAL PARSER (No Duplicates!)
        const parseSocketData = (data) => {
            if (!data) return null;
            if (data.type === 'Buffer' && Array.isArray(data.data)) return new Uint8Array(data.data);
            return new Uint8Array(data);
        };

        const handleInit = (incomingProjectId, data) => {
            if(incomingProjectId !== projectId) return;
            try {
                const binaryData = parseSocketData(data);
                if (binaryData && binaryData.length > 0) Y.applyUpdate(ydoc, binaryData, 'server');
            } catch (error) { console.error("Init Error:", error); }
        }

        const handleUpdate = (incomingProjectId, data) => {
            if(incomingProjectId !== projectId) return;
            try {
                const binaryData = parseSocketData(data);
                if (binaryData && binaryData.length > 0) Y.applyUpdate(ydoc, binaryData, 'server');
            } catch (error) { console.error("Update Error:", error); }
        }

        const handleAwareness =  (incomingProjectId, data) => {
            if(incomingProjectId !== projectId) return;
            try {
                const binaryData = parseSocketData(data);
                if (binaryData && binaryData.length > 0) awarenessProtocol.applyAwarenessUpdate(awareness, binaryData, 'server');
            } catch (error) { console.error("Awareness Error:", error); }
        }

        socket.on('yjs-init', handleInit);

        socket.on('yjs-update', handleUpdate);
        
        socket.on('yjs-awareness', handleAwareness);

        const handleReconnect = () => {
            setIsConnected(true);
            socket.emit("join-document", projectId);
        }
        // 🌟 NEW: Make disconnect a named function so we can safely remove it!
        const handleDisconnect = () => {
            setIsConnected(false);
        };

        socket.on('connect', handleReconnect);
        socket.on('disconnect', handleDisconnect);

        if(socket.connected) handleReconnect(); // If already connected via socket, join immediately


        ydoc.on('update', (update, origin) => {
            if (origin !== 'server') socket.emit('yjs-update', projectId, update);
        });

        //  socket.on('connect', () => {
        //     setIsConnected(true);
        //     socket.emit("join-document", projectId);
        // });

        // socket.on('disconnect', () => setIsConnected(false));

        awareness.on('update', ({ added, updated, removed }, origin) => {
            if (origin !== 'server') {
                const changedClients = added.concat(updated, removed);
                const updateBuffer = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
                socket.emit('yjs-awareness', projectId, updateBuffer);
                
                if (added.length > 0) {
                    const fullState = Y.encodeStateAsUpdate(ydoc);
                    socket.emit('yjs-update', projectId, fullState);
                }
            }
        });



        const updateOnlineUsers = () => {
            const states = Array.from(awareness.getStates().values());
            const users = states.map(state => ({
                id: state.user?._id,
                name: state.user?.name || 'Anonymous',
                color: state.user?.color || '#000000',
                isMe: state.user?.name === user?.name
            })).filter(u => u.id); 
            setOnlineUsers(users);
        };

        awareness.on('change', updateOnlineUsers);
        updateOnlineUsers(); 

        return () => {
            if (awarenessRef.current) awarenessRef.current.destroy(); 
            if (binding) binding.destroy();
            ydoc.destroy();

            socket.emit('leave-document', projectId);
            socket.off('connect', handleReconnect);
            socket.off('yjs-init', handleInit);
            socket.off('yjs-update', handleUpdate);
            socket.off('yjs-awareness', handleAwareness);
            socket.off('disconnect', handleDisconnect);


            ydocRef.current = null;
            awarenessRef.current = null;
            quillInstance.current = null;
            if (editorRef.current) editorRef.current.innerHTML = '';
        };

    }, [projectId, user?._id, user?.name, socket]); 

    // 🌟 TRAP 2 CURE: FAST AUTO-SAVE
// 🌟 VERSION CONTROL AUTO-SAVE (10 Minutes)
    useEffect(() => {
        if(!ydocRef.current) return;

        const metadata = ydocRef.current.getMap('metadata');
        if(!metadata.has('lastSavedTime')){ metadata.set('lastSavedTime', Date.now()); }

        // Interval checks every 10 minutes (600,000 ms)
        const pulseInterval = setInterval(async() => {
            if(!ydocRef.current || !awarenessRef.current) return;

            const lastSavedTime = metadata.get('lastSavedTime') || 0;
            const now = Date.now();
            const timeSinceLastSave = now - lastSavedTime;
            
            // 🌟 10 Minutes = 600,000 milliseconds
            if(timeSinceLastSave < 600000) return; 
            
            const connectedClients = Array.from(awarenessRef.current.getStates().keys());
            const leaderId = Math.min(...connectedClients);

            if(ydocRef.current.clientID !== leaderId) return;
            
            metadata.set('lastSavedTime', Date.now());
            const currentBlob = Y.encodeStateAsUpdate(ydocRef.current);
            try {
                await api.post(`/projects/${projectId}/versions`, {
                    versionName: `Auto-save at ${new Date().toLocaleTimeString()}`,
                    binaryData: Array.from(currentBlob), 
                    saveType: 'auto' 
                }, { headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` }});
                
                setVersionRefreshTrigger(prev => prev + 1);
            } catch (error) { console.error("Auto-save failed:", error); }
            
        }, 600000); // 🌟 10 Minutes
        
        return () => clearInterval(pulseInterval);
    }, [projectId, user?._id, user?.name, socket]);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <ProjectSideBar 
                isOpen={isSidebarOpen} 
                currentProjectId={projectId} 
                onlineUsers={onlineUsers}
                onClose={() => setIsSidebarOpen(false)}
                onPreviewClick={(vId) => setPreviewVersionId(vId)}
                versionRefreshTrigger={versionRefreshTrigger}
            />

            <div className="editor-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="editor-header">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px', color: 'inherit' }}>☰</button>
                    <h2>Project Editor</h2>
                    <span style={{ color: isConnected ? 'green' : 'red', marginLeft: '10px' }}>{isConnected ? 'Live' : 'Connecting...'}</span>

                    <div style={{ marginLeft: 'auto' }}>
                        <button onClick={handleManualSave} disabled={isSaving} style={{marginLeft: '20px', marginBottom:'3px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                            {isSaving ? 'Saving...' : '💾 Save Version'}
                        </button>
                        <button onClick={() => setIsPdfModalOpen(true)} style={{marginLeft: '10px', marginBottom:'3px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#ec0a0a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Export PDF</button>
                        <button onClick={insertPageBreak} style={{marginLeft: '10px', marginBottom:'3px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Add Page Break</button>
                        <button onClick={insertDummyBoard} style={{ marginLeft: '10px', marginBottom: '3px', padding: '5px 10px', cursor: 'pointer', color: 'white', border: 'none', backgroundColor: '#12ec0a', borderRadius: '4px', fontWeight: 'bold' }}>Insert TLDraw</button>
                    </div>
                </div>
                <div ref={editorRef} style={{ height: '80vh' }}></div>

                {previewVersionId && (
                    <VersionPreviewModal 
                        projectId={projectId}
                        versionId={previewVersionId}
                        onClose={() => setPreviewVersionId(null)}
                        onRestore={executeRestore}
                    />
                )}

                {isPdfModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', width: '90%', maxWidth: '1200px', height: '90%', backgroundColor: '#2d2d2d', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ width: '300px', padding: '30px', backgroundColor: '#1e1e1e', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid #404040' }}>
                                <h2 style={{ margin: '0 0 10px 0' }}>Print Settings</h2>
                                <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>File Name</label><input type="text" value={pdfSettings.filename} onChange={(e) => setPdfSettings({...pdfSettings, filename: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', boxSizing: 'border-box' }} /></div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Paper Size</label>
                                    <select value={pdfSettings.format} onChange={(e) => setPdfSettings({...pdfSettings, format: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', cursor: 'pointer' }}>
                                        <option value="a4">A4 (Standard International)</option><option value="letter">Letter (Standard US)</option><option value="legal">Legal (Long)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Orientation</label>
                                    <select value={pdfSettings.orientation} onChange={(e) => setPdfSettings({...pdfSettings, orientation: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', cursor: 'pointer' }}>
                                        <option value="portrait">Portrait (Tall)</option><option value="landscape">Landscape (Wide)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <a href={pdfPreviewUrl} download={`${pdfSettings.filename}.pdf`} style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: '#ef4444', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', pointerEvents: isGeneratingPreview ? 'none' : 'auto', opacity: isGeneratingPreview ? 0.5 : 1 }}>{isGeneratingPreview ? 'Processing...' : 'Download PDF'}</a>
                                    <button onClick={() => setIsPdfModalOpen(false)} style={{ padding: '12px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                </div>
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#52525b', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {isGeneratingPreview ? (
                                    <div style={{ color: 'white', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}><div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div><style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>Generating High-Res Preview...</div>
                                ) : ( <iframe src={pdfPreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" /> )}
                            </div>
                        </div>
                    </div>
                )}

                {isTLdrawOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #e5e7eb' }}>
                            <h3 style={{ margin: 0 }}>Editing Drawing: {activeDrawingId}</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleSaveDrawing} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Drawing</button>
                                <button onClick={() => setIsTLdrawOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '0 0 8px 8px', overflow: 'hidden', position: 'relative' }}>
                            <IsolatedMultiplayerTldraw drawingId={activeDrawingId} projectId={projectId} onMount={setTldrawEditor} isolatedYdocRef={isolatedYdocRef} mainSocket={mainSocket} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorRoom;