import React,{useEffect , useRef , useState} from 'react';
import * as Y from 'yjs';
import Quill from 'quill';
import { QuillBinding } from 'y-quill';
import api from '../api/axiosSetup';

export default function VersionPreviewModal({projectId, versionId, onClose,onRestore}) {
    const editorRef = useRef(null);
    const quillInstance = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [versionData, setVersionData] = useState(null);
    const [binaryPayload, setBinaryPayload] = useState(null); // <-- This is the one that was missing!

    useEffect(() => {
        const fetchVersion = async () => {
            try{
                const res = await api.get(`/projects/${projectId}/versions/${versionId}`);
                const data =res.data.version;
                setVersionData(data);

                const rawData = data.yjsBinary?.data || data.yjsBinary; // Handle both ArrayBuffer and Uint8Array
                const uint8Array = new Uint8Array(rawData);
                // 🌟 Save it to the state so the button can use it later!
                setBinaryPayload(uint8Array);

                const tempYdoc = new Y.Doc();
                Y.applyUpdate(tempYdoc, uint8Array);

                if(editorRef.current && !quillInstance.current) {
                    quillInstance.current = new Quill(editorRef.current, {
                        theme: 'snow',
                        readOnly: true,
                        modules: {
                            toolbar: false
                        }
                    });
                    // 3. Bind the temporary document to the preview editor
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
                quillInstance.current=null;
            }
        }
    },[projectId, versionId, onClose]);
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', flexDirection: 'column', padding: '40px', boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px 8px 0 0' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>Previewing Version</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        {versionData ? `${versionData.versionName} - ${new Date(versionData.createdAt).toLocaleString()}` : 'Loading...'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => onRestore(binaryPayload)} 
                        disabled={isLoading || !binaryPayload} // Safely disable if payload isn't ready
                        style={{ padding: '8px 16px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '4px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                    >
                        ⚠️ Revert to this Version
                    </button>
                    <button 
                        onClick={onClose} 
                        style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '0 0 8px 8px', padding: '20px', overflowY: 'auto' }}>
                {isLoading && <div>Loading preview data...</div>}
                <div ref={editorRef} style={{ border: 'none' }}></div>
            </div>
        </div>
    );
}
