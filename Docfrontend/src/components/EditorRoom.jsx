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
import Button from '../components/comman/Buttons'; // (or 'Button' depending on what you named the file)
import Input from '../components/comman/Input';

import ProjectSideBar from './ProjectSideBar';
import VersionPreviewModal from './VersionPreviewModal';

import { useAuth } from '../context/AuthContext'; 
import { useSocket } from '../context/SocketContext';

import { calculateFileHash, getColorFromUserId } from '../utils/fileHelpers';
Quill.register('modules/cursors', QuillCursor);
Quill.register(TLdrawBlot);
Quill.register(PageBreakBlot);

// 🌟 CUSTOM LINK OVERRIDE
const Link = Quill.import('formats/link');

class CustomLink extends Link {
  static sanitize(url) {
    // 1. Let Quill do its default security sanitization first
    let sanitizedUrl = super.sanitize(url);
    
    // 2. Force it to be an absolute URL by adding "https://" if missing
    if (sanitizedUrl && !/^(https?:\/\/|mailto:|tel:)/i.test(sanitizedUrl)) {
      sanitizedUrl = `https://${sanitizedUrl}`;
    }
    
    return sanitizedUrl;
  }
}

// The 'true' flag at the end overwrites Quill's default Link format with ours
Quill.register(CustomLink);

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
            
            const { blob } = await tldrawEditor.toImage(shapeIds, { format: 'png', background: true, padding: 20 });

            const fileHash = await calculateFileHash(blob);
            const imageFile = new File([blob],`${activeDrawingId}.png`,{type : 'image/png'});
            const imageFormData = new FormData();
            imageFormData.append('image',imageFile);
            
            const imgResponse = await api.post(`${projectId}/iupload`, imageFormData, {
                params: { hash: fileHash, drawingId: activeDrawingId },
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

            const dbResponse = await api.post(`/drawings/${projectId}/save`, mathFormData);

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
            
            const response = await api.post(`${projectId}/iupload`, formData, {
                params: { hash: fileHash },
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
            await api.post(`/projects/${projectId}/versions`, {
                versionName: customName,
                binaryData: Array.from(currentBlob),
                saveType: 'manual'
            });
            
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
            
            // Backup current state
            await api.post(`/projects/${projectId}/versions`, {
                versionName: `Pre-Revert Auto-Backup`,
                binaryData: Array.from(currentBlob),
                saveType: 'auto' 
            });
            
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
                    });

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
            _id: user?._id || user?.id,
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

        // 🌟 THE BOUNCER (Boot them out if the owner kicks them)
        const handleKicked = (kickedProjectId) => {
            if (kickedProjectId === projectId) {
                // 1. 🌟 INSTANTLY wipe their green dot from everyone else's screen!
                if (awarenessRef.current) awarenessRef.current.setLocalState(null);
                
                // 🌟 ADD THIS 1 LINE: Instantly kill their socket connection so they vanish from the owner's screen!
                socket.disconnect(); 
                
                // Then show the freezing alert
                alert("Your access to this project has been revoked by the owner.");
                window.location.href = '/dashboard'; // Hard redirect
            }
        };
        socket.on('kicked-from-project', handleKicked);

        // 🌟 NEW: REFRESH SIDEBAR IF SOMEONE ELSE LEAVES
        const handleProjectUpdated = () => {
            setVersionRefreshTrigger(prev => prev + 1); // Triggers the sidebar to re-fetch!
        };
        socket.on('project-updated', handleProjectUpdated);

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

        const handleSocketError = (errorMessage) => {
            alert(errorMessage || "Failed to join project.");
            window.location.href = '/dashboard'; // Kick them back to safety
        };
        socket.on('error', handleSocketError);

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
            const localClientId = awareness.clientID; 
            const stateEntries = Array.from(awareness.getStates().entries()); 
            
            const uniqueUsersMap = new Map();

            stateEntries.forEach(([clientId, state]) => {
                if (!state.user) return; // Skip empty ghost states

                // 🌟 THE FIX: Grab the ID and FORCE it to be a strict String!
                const rawId = state.user._id || state.user.id;
                if (!rawId) return;
                const dbId = String(rawId); 

                const isThisSpecificTab = (clientId === localClientId);

                if (uniqueUsersMap.has(dbId)) {
                    // Agar ye insaan list mein already hai, bas check karo ki kya ye wahi exact tab hai
                    if (isThisSpecificTab) {
                        uniqueUsersMap.get(dbId).isMe = true;
                    }
                } else {
                    // Pehli baar list mein add kar rahe hain
                    uniqueUsersMap.set(dbId, {
                        id: dbId, // String ID use kar rahe hain
                        name: state.user.name || 'Anonymous',
                        color: state.user.color || '#000000',
                        isMe: isThisSpecificTab
                    });
                }
            });
            
            setOnlineUsers(Array.from(uniqueUsersMap.values()));
        };

        awareness.on('change', updateOnlineUsers);
        updateOnlineUsers(); 

        // 🌟 NEW: THE BROWSER REFRESH CATCHER
        // This fires the exact millisecond the user clicks "Reload" or closes the tab
        const handleBeforeUnload = () => {
            // 1. Instantly erase this specific tab's "ghost" from the Yjs network
            if (awarenessRef.current) {
                awarenessRef.current.setLocalState(null);
            }
            // 2. Sever the socket cleanly
            if (socket) {
                socket.emit("leave-document", projectId);
                socket.disconnect();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (awarenessRef.current) {
                awarenessRef.current.setLocalState(null);
            }
            if (binding) binding.destroy();
            ydoc.destroy();

            window.removeEventListener('beforeunload', handleBeforeUnload);
            
            socket.emit('leave-document', projectId);
            socket.off('connect', handleReconnect);
            socket.off('yjs-init', handleInit);
            socket.off('yjs-update', handleUpdate);
            socket.off('yjs-awareness', handleAwareness);
            socket.off('disconnect', handleDisconnect);
            socket.off('kicked-from-project', handleKicked);
            socket.off('project-updated', handleProjectUpdated);
            socket.off('error', handleSocketError);

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
                });
                
                setVersionRefreshTrigger(prev => prev + 1);
            } catch (error) { console.error("Auto-save failed:", error); }
            
        }, 600000); // 🌟 10 Minutes
        
        return () => clearInterval(pulseInterval);
    }, [projectId, user?._id, user?.name, socket]);
return (
    <>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans selection:bg-[var(--theme-accent)]/30">
        
        {/* 🌟 SIDEBAR */}
        <ProjectSideBar 
          isOpen={isSidebarOpen} 
          currentProjectId={projectId} 
          onlineUsers={onlineUsers}
          onClose={() => setIsSidebarOpen(false)}
          onPreviewClick={(vId) => setPreviewVersionId(vId)}
          versionRefreshTrigger={versionRefreshTrigger}
        />

        {/* 🌟 MAIN WORKSPACE COLUMN */}
        <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.15)]">
          
          {/* --- PREMIUM HEADER (Untouched) --- */}
          <header className="h-16 px-4 sm:px-6 border-b border-[var(--theme-text)]/10 bg-[var(--theme-bg)] shadow-sm flex items-center justify-between shrink-0 z-30 relative">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="p-2 rounded-xl bg-[var(--theme-text)]/5 hover:bg-[var(--theme-text)]/10 text-[var(--theme-text)]/70 hover:text-[var(--theme-text)] transition-colors focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
              </button>
              
              <h2 className="text-xl font-extrabold truncate max-w-[150px] sm:max-w-xs tracking-tight">Project Editor</h2>
              
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${isConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                <span className="relative flex h-2 w-2">
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                {isConnected ? 'Live Sync' : 'Connecting'}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button onClick={insertDummyBoard} variant="secondary" size="sm" className="hidden lg:flex shadow-sm">
                <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Whiteboard
              </Button>
              <Button onClick={insertPageBreak} variant="secondary" size="sm" className="hidden md:flex shadow-sm">
                <svg className="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                Add Break
              </Button>
              <Button onClick={() => setIsPdfModalOpen(true)} variant="danger" size="sm" className="shadow-md shadow-red-500/20 hover:shadow-red-500/40">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export PDF
              </Button>
              <Button onClick={handleManualSave} isLoading={isSaving} variant="primary" size="sm" className="shadow-md shadow-[var(--theme-accent)]/20 hover:shadow-[var(--theme-accent)]/40">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {isSaving ? 'Saving...' : 'Save Version'}
              </Button>
            </div>
          </header>

          {/* --- 🌟 THE "PAPER" EDITOR CANVAS (Untouched) --- */}
          <div className="flex-1 relative bg-[var(--theme-text)]/5 overflow-hidden flex flex-col">
             <div className="absolute inset-0 bg-[radial-gradient(var(--theme-text)_1.5px,transparent_1.5px)] [background-size:30px_30px] opacity-[0.04] pointer-events-none z-0"></div>
             
             <div className="absolute inset-0 z-10 overflow-y-auto scrollbar-hide flex justify-center px-4 sm:px-8">
                 <div className="w-full max-w-[850px] mt-10 mb-32 bg-[var(--theme-bg)] rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-[var(--theme-text)]/20 flex flex-col relative h-max min-h-[1056px]">
                    <div ref={editorRef} className="w-full flex-1 flex flex-col"></div>
                 </div>
             </div>
          </div>

        </div>
      </div>
      {/* 🛑 END OF MAIN APP LAYOUT 🛑 */}


      {/* ========================================================= */}
      {/* 🌟 ROOT-LEVEL MODALS (Safely covers the entire screen!)   */}
      {/* ========================================================= */}

      {/* VERSION PREVIEW MODAL */}
      {previewVersionId && (
        <VersionPreviewModal projectId={projectId} versionId={previewVersionId} onClose={() => setPreviewVersionId(null)} onRestore={executeRestore} />
      )}

      {/* PREMIUM PDF MODAL */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex justify-center items-center p-4 sm:p-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row w-full max-w-6xl h-full max-h-[900px] bg-[var(--theme-bg)] rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-[var(--theme-text)]/10 overflow-hidden">
            <div className="w-full md:w-80 p-8 bg-[var(--theme-text)]/5 border-r border-[var(--theme-text)]/10 flex flex-col gap-6 shrink-0 overflow-y-auto">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--theme-text)] tracking-tight">Export PDF</h2>
                <p className="text-sm text-[var(--theme-text)]/50 mt-1 font-medium">Configure document format.</p>
              </div>
              <div className="space-y-5 flex-1">
                <Input label="File Name" value={pdfSettings.filename} onChange={(e) => setPdfSettings({...pdfSettings, filename: e.target.value})} />
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-bold text-[var(--theme-text)]/80 ml-1">Paper Size</label>
                  <select value={pdfSettings.format} onChange={(e) => setPdfSettings({...pdfSettings, format: e.target.value})} className="w-full px-4 py-3 bg-[var(--theme-bg)]/80 backdrop-blur-sm border border-[var(--theme-text)]/20 rounded-xl text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/50 appearance-none cursor-pointer">
                    <option value="a4" className="bg-white text-black">A4 (Standard)</option><option value="letter" className="bg-white text-black">Letter (US)</option><option value="legal" className="bg-white text-black">Legal (Long)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-bold text-[var(--theme-text)]/80 ml-1">Orientation</label>
                  <select value={pdfSettings.orientation} onChange={(e) => setPdfSettings({...pdfSettings, orientation: e.target.value})} className="w-full px-4 py-3 bg-[var(--theme-bg)]/80 backdrop-blur-sm border border-[var(--theme-text)]/20 rounded-xl text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/50 appearance-none cursor-pointer">
                    <option value="portrait" className="bg-white text-black">Portrait (Tall)</option><option value="landscape" className="bg-white text-black">Landscape (Wide)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-6 mt-auto">
                <Button variant="danger" className="w-full py-3.5 shadow-lg" onClick={() => {}} disabled={isGeneratingPreview}>
                   <a href={pdfPreviewUrl} download={`${pdfSettings.filename}.pdf`} className="w-full h-full flex items-center justify-center">
                      {isGeneratingPreview ? 'Processing...' : 'Download PDF'}
                   </a>
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setIsPdfModalOpen(false)}>Cancel</Button>
              </div>
            </div>
            <div className="flex-1 relative bg-black/5 flex justify-center items-center overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}></div>
              {isGeneratingPreview ? (
                <div className="flex flex-col items-center gap-6 z-10 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 border-4 border-[var(--theme-accent)]/20 border-t-[var(--theme-accent)] rounded-full animate-spin"></div>
                  <span className="text-lg font-bold text-[var(--theme-text)]/70 tracking-wide">Rendering High-Res Preview...</span>
                </div>
              ) : (
                <div className="w-full h-full p-4 sm:p-8 z-10 drop-shadow-2xl">
                  <iframe src={pdfPreviewUrl} className="w-full h-full rounded-lg border border-[var(--theme-text)]/10 bg-white" title="PDF Preview" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM TLDRAW MODAL */}
      {isTLdrawOpen && (
        <div className="fixed inset-0 bg-[var(--theme-bg)]/80 backdrop-blur-xl z-[9999] flex flex-col p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto w-full max-w-7xl flex justify-between items-center bg-[var(--theme-bg)]/60 backdrop-blur-2xl px-6 py-4 rounded-2xl border border-[var(--theme-text)]/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <div>
                <h3 className="font-extrabold text-[var(--theme-text)] leading-tight">Interactive Whiteboard</h3>
                <p className="text-xs font-bold text-[var(--theme-text)]/40 uppercase tracking-widest mt-0.5">ID: {activeDrawingId?.substring(0,8)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsTLdrawOpen(false)} className="hidden sm:flex">Cancel</Button>
              <Button variant="primary" onClick={handleSaveDrawing} className="!bg-emerald-500 hover:!bg-emerald-600 !border-emerald-400 shadow-emerald-500/20">Save to Document</Button>
            </div>
          </div>
          <div className="flex-1 max-w-7xl w-full mx-auto bg-[var(--theme-bg)] rounded-3xl border border-[var(--theme-text)]/10 shadow-2xl overflow-hidden relative">
            <IsolatedMultiplayerTldraw drawingId={activeDrawingId} projectId={projectId} onMount={setTldrawEditor} isolatedYdocRef={isolatedYdocRef} mainSocket={mainSocket} />
          </div>
        </div>
      )}
    </>
  );
}

export default EditorRoom;