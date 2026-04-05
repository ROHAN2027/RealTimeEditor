import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import api from '../api/axiosSetup';

// 🌟 IMPORT YOUR PREMIUM BUTTON COMPONENT
import Button from '../components/comman/Buttons'; 

export default function VersionPreviewModal({ projectId, versionId, onClose, onRestore }) {
    const editorRef = useRef(null);
    const quillInstance = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [versionData, setVersionData] = useState(null);
    const [binaryPayload, setBinaryPayload] = useState(null);

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const res = await api.get(`/projects/${projectId}/versions/${versionId}`);
                const data = res.data.version;
                setVersionData(data);

                const rawData = data.yjsBinary?.data || data.yjsBinary; 
                const uint8Array = new Uint8Array(rawData);
                setBinaryPayload(uint8Array);

                const tempYdoc = new Y.Doc();
                Y.applyUpdate(tempYdoc, uint8Array);

                // 🌟 Because the div is now always in the DOM, this Ref will work immediately!
                if(editorRef.current && !quillInstance.current) {
                    quillInstance.current = new Quill(editorRef.current, {
                        theme: 'snow',
                        readOnly: true, // Prevents editing
                        modules: {
                            toolbar: false // Hides the toolbar completely
                        }
                    });
                    
                    const tempYtext = tempYdoc.getText('quill');
                    new QuillBinding(tempYtext, quillInstance.current);
                }
                setIsLoading(false);
            }
            catch(error) {
                console.error("Error fetching version data:", error);
                alert("Failed to load version data. Please try again later.");
                onClose();
            }
        };
        fetchVersion();

        return () => {
            if(quillInstance.current) {
                quillInstance.current = null;
            }
        }
    // 🌟 FIX 1: Removed onClose to prevent the infinite network loop!
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, versionId]); 

    return (
        /* 🌟 FULLSCREEN GLASS BACKGROUND */
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex justify-center items-center p-4 sm:p-8 animate-in fade-in duration-200">
            
            {/* 🌟 MODAL CONTAINER */}
            <div className="flex flex-col w-full max-w-5xl h-full max-h-[900px] bg-[var(--theme-bg)] rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-[var(--theme-text)]/10 overflow-hidden">
                
                {/* --- PREMIUM HEADER --- */}
                <div className="flex justify-between items-center p-6 sm:px-8 border-b border-[var(--theme-text)]/10 bg-[var(--theme-text)]/[0.02] shrink-0">
                    <div>
                        <h2 className="text-2xl font-extrabold text-[var(--theme-text)] tracking-tight">Version Preview</h2>
                        <p className="text-xs font-bold text-[var(--theme-text)]/50 uppercase tracking-widest mt-1">
                            {versionData ? `${versionData.versionName} - ${new Date(versionData.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Loading Document Data...'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose} className="hidden sm:flex">
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => onRestore(binaryPayload)} 
                            disabled={isLoading || !binaryPayload}
                            className="!bg-amber-500 hover:!bg-amber-600 !border-amber-400 !text-white shadow-lg shadow-amber-500/20"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Revert to this Version
                        </Button>
                    </div>
                </div>
                
                {/* --- DOCUMENT SCROLL AREA --- */}
                <div className="flex-1 relative bg-black/5 dark:bg-white/5 overflow-y-auto scrollbar-hide flex flex-col items-center pt-8 pb-32 px-4 sm:px-8">
                    
                    {/* Subtle Developer Dots */}
                    <div className="absolute inset-0 bg-[radial-gradient(var(--theme-text)_1.5px,transparent_1.5px)] [background-size:30px_30px] opacity-[0.04] pointer-events-none z-0 fixed"></div>

                    {/* 🌟 FIX 2: ALWAYS RENDER BOTH, BUT USE CSS TO HIDE/SHOW */}
                    
                    {/* 1. The Loader Overlay (Sits on top while loading) */}
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--theme-bg)]/60 backdrop-blur-sm rounded-xl">
                            <div className="w-12 h-12 border-4 border-[var(--theme-text)]/20 border-t-[var(--theme-accent)] rounded-full animate-spin"></div>
                            <p className="text-sm font-bold uppercase tracking-widest text-[var(--theme-text)] mt-4">Decrypting Version...</p>
                        </div>
                    )}

                    {/* 2. The Document Preview (ALWAYS in the DOM, so the Ref works instantly!) */}
                    <div className={`w-full max-w-[850px] bg-[var(--theme-bg)] rounded-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] border border-[var(--theme-text)]/10 flex flex-col relative z-10 min-h-[800px] transition-all duration-700 ease-out ${isLoading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 animate-in fade-in slide-in-from-bottom-8'}`}>
                        
                        {/* Read-Only Badge */}
                        <div className="absolute top-4 right-4 z-20 pointer-events-none">
                            <div className="px-3 py-1 rounded-full bg-[var(--theme-text)]/5 border border-[var(--theme-text)]/10 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]/40">
                                Read Only
                            </div>
                        </div>

                        {/* Quill mounts here safely because it ALWAYS exists! */}
                        <div ref={editorRef} className="w-full flex-1"></div>
                    </div>
                </div>

            </div>
        </div>
    );
}