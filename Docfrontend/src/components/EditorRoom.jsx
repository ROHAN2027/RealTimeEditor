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
import html2pdf from 'html2pdf.js';
import {PageBreakBlot} from './PageBreakBlot';
import './EditorRoom.css';




import { useAuth } from '../context/AuthContext'; 
import { calculateFileHash,getColorFromUserId } from '../utils/fileHelpers';
Quill.register('modules/cursors', QuillCursor);
Quill.register(TLdrawBlot);
Quill.register(PageBreakBlot);



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

    // 🌟 PDF Modal States
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

    // Default PDF Settings
    const [pdfSettings, setPdfSettings] = useState({
        filename: 'Project_Document',
        format: 'a4',
        orientation: 'portrait'
    });

    // This generates the live preview
    const generatePdfPreview = (currentSettings) => {
        const element = document.querySelector('.ql-editor');
        if (!element) return;

        setIsGeneratingPreview(true);
        // 🌟 1. TURN STEALTH MODE ON
        // This instantly hides the lines right before the camera takes a picture
        element.classList.add('pdf-exporting');

        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5], 
            filename:     currentSettings.filename + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'in', format: currentSettings.format, orientation: currentSettings.orientation },

            pagebreak:    { mode: ['css', 'legacy'], after: '.custom-page-break' }
        };
        

        // Tell html2pdf to give us a URL instead of saving!
        html2pdf().set(opt).from(element).output('bloburl').then((pdfUrl) => {
            // 🌟 2. TURN STEALTH MODE OFF
            // The picture is done, bring the lines back for the user!
            element.classList.remove('pdf-exporting');
            setPdfPreviewUrl(pdfUrl);
            setIsGeneratingPreview(false);
        });
    };
    // Whenever the modal opens OR the user changes a setting, regenerate the preview
    useEffect(() => {
        if (isPdfModalOpen) {
            generatePdfPreview(pdfSettings);
        }
    }, [isPdfModalOpen, pdfSettings.format, pdfSettings.orientation]);

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

    const insertPageBreak = () => {
        if (!quillInstance.current) return;
        const range = quillInstance.current.getSelection(true);
        const cursorPosition = range ? range.index : 0;
        
        quillInstance.current.insertEmbed(cursorPosition, 'page-break', true, 'user');
        quillInstance.current.setSelection(cursorPosition + 1, Quill.sources.SILENT);
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
                        onClick={() => setIsPdfModalOpen(true)} 
                        style={{marginLeft: '20px', marginBottom:'3px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#ec0a0a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                    >
                        Export PDF
                </button>

                <button 
                        onClick={insertPageBreak} 
                        style={{marginLeft: '10px', marginBottom:'3px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                    >
                        Add Page Break
                </button>

                <button 
                    onClick={insertDummyBoard} 
                    style={{ marginLeft: '10px', marginBottom: '3px', padding: '5px 10px', cursor: 'pointer', color: 'white', border: 'none', backgroundColor: '#12ec0a', borderRadius: '4px', fontWeight: 'bold' }}
                >
                    Insert TLDraw
                </button>
            </div>
            <div ref={editorRef} style={{ height: '80vh' }}></div>

            {isPdfModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
                    
                    {/* Modal Container */}
                    <div style={{ display: 'flex', width: '90%', maxWidth: '1200px', height: '90%', backgroundColor: '#2d2d2d', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        
                        {/* LEFT SIDE: Settings Sidebar */}
                        <div style={{ width: '300px', padding: '30px', backgroundColor: '#1e1e1e', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid #404040' }}>
                            <h2 style={{ margin: '0 0 10px 0' }}>Print Settings</h2>

                            {/* Filename Input */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>File Name</label>
                                <input 
                                    type="text" 
                                    value={pdfSettings.filename}
                                    onChange={(e) => setPdfSettings({...pdfSettings, filename: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Format Dropdown */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Paper Size</label>
                                <select 
                                    value={pdfSettings.format}
                                    onChange={(e) => setPdfSettings({...pdfSettings, format: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', cursor: 'pointer' }}
                                >
                                    <option value="a4">A4 (Standard International)</option>
                                    <option value="letter">Letter (Standard US)</option>
                                    <option value="legal">Legal (Long)</option>
                                </select>
                            </div>

                            {/* Orientation Dropdown */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Orientation</label>
                                <select 
                                    value={pdfSettings.orientation}
                                    onChange={(e) => setPdfSettings({...pdfSettings, orientation: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #404040', backgroundColor: '#2d2d2d', color: 'white', cursor: 'pointer' }}
                                >
                                    <option value="portrait">Portrait (Tall)</option>
                                    <option value="landscape">Landscape (Wide)</option>
                                </select>
                            </div>

                            {/* Spacer to push buttons to the bottom */}
                            <div style={{ flex: 1 }}></div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Download Button Trick: Use an <a> tag pointing to the Blob URL! */}
                                <a 
                                    href={pdfPreviewUrl} 
                                    download={`${pdfSettings.filename}.pdf`}
                                    style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: '#ef4444', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', pointerEvents: isGeneratingPreview ? 'none' : 'auto', opacity: isGeneratingPreview ? 0.5 : 1 }}
                                >
                                    {isGeneratingPreview ? 'Processing...' : 'Download PDF'}
                                </a>
                                <button 
                                    onClick={() => setIsPdfModalOpen(false)}
                                    style={{ padding: '12px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Live Iframe Preview */}
                        <div style={{ flex: 1, backgroundColor: '#52525b', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {isGeneratingPreview ? (
                                <div style={{ color: 'white', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                    Generating High-Res Preview...
                                </div>
                            ) : (
                                <iframe 
                                    src={pdfPreviewUrl} 
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="PDF Preview"
                                />
                            )}
                        </div>

                    </div>
                </div>
            )}

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