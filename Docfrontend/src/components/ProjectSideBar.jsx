import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup';

export default function ProjectSideBar({
    isOpen,
    currentProjectId,
    onlineUsers = [], 
    onClose,
    onPreviewClick,         // 🌟 FIX 1: Added missing prop
    versionRefreshTrigger   // 🌟 FIX 2: Added missing trigger prop
}) {
    const [activeTab, setActiveTab] = useState('projects'); 
    
    // Data States
    const [allProjects, setAllProjects] = useState([]);
    const [currentProjectDetails, setCurrentProjectDetails] = useState(null);
    const [versions, setVersions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isOpen) return;

const fetchProjects = async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const res = await api.get('/projects', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAllProjects(res.data?.projects || []);
                const current = res.data?.projects?.find(p => p._id === currentProjectId);
                if (current) setCurrentProjectDetails(current);
            } catch (err) {
                console.error('Error fetching projects:', err);
            }
        };

        fetchProjects();
    }, [isOpen, currentProjectId]);


    // 🌟 FETCH 2: Fetches versions when Tab opens OR when a save happens!
    useEffect(() => {
        // Only fetch if the sidebar is open and we are looking at the versions tab
        if (!isOpen || activeTab !== 'versions') return;

        const fetchVersions = async () => {
            try {
                const token = localStorage.getItem('jwt_token');
                const res = await api.get(`/projects/${currentProjectId}/versions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setVersions(res.data?.versions || []);
            } catch (err) {
                console.error('Error fetching versions:', err);
            }
        };

        fetchVersions();
    // 👇 The magic is here: It listens to versionRefreshTrigger!
    }, [isOpen, activeTab, currentProjectId, versionRefreshTrigger]);

    const filteredProjects = allProjects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const allCollaborators = [...(currentProjectDetails?.collaborators || [])];
    if (currentProjectDetails?.ownerId) {
        const hasOwner = allCollaborators.some(c => (c._id || c) === (currentProjectDetails.ownerId._id || currentProjectDetails.ownerId));
        if (!hasOwner) {
            allCollaborators.push(currentProjectDetails.ownerId);
        }
    }

    const onlineUserIds = onlineUsers.map(u => u.id);
    const offlineUsers = allCollaborators.filter(c => !onlineUserIds.includes(c._id || c));

    return (
        <div style={{ 
            width: isOpen ? '280px' : '0px', 
            minWidth: isOpen ? '280px' : '0px',
            flexShrink: 0, 
            backgroundColor: '#ffffff', // 🌟 Light Background
            borderRight: isOpen ? '1px solid #e2e8f0' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            whiteSpace: 'nowrap',
            color: '#1e293b', // 🌟 Dark Text
            zIndex: 50
        }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentProjectDetails?.name || 'Workspace'}
                </h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '22px' }}>&times;</button>
            </div>

            {/* Online/Offline Status Panel */}
            <div style={{ padding: '15px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>Currently In File</div>
                
                {/* Online */}
                {onlineUsers.map((u, i) => (
                    <div key={`online-${i}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '8px' }}></span>
                        {u.name} {u.isMe && '(You)'}
                    </div>
                ))}

                {/* Offline */}
                {offlineUsers.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>Offline</div>
                        {offlineUsers.map((u, i) => (
                            <div key={`offline-${i}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '14px', color: '#94a3b8' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid #94a3b8', marginRight: '8px' }}></span>
                                {u.name || 'Collaborator'}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button 
                    onClick={() => setActiveTab('projects')}
                    style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'projects' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'projects' ? '#3b82f6' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Projects
                </button>
                <button 
                    onClick={() => setActiveTab('versions')}
                    style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'versions' ? '2px solid #10b981' : '2px solid transparent', color: activeTab === 'versions' ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Versions
                </button>
            </div>

            {/* Tab Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                
                {activeTab === 'projects' ? (
                    <>
                        <input 
                            type="text" 
                            placeholder="🔍 Search projects..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', boxSizing: 'border-box' }}
                        />
                        {filteredProjects.map(p => (
                            <div 
                                key={p._id} 
                                onClick={() => window.open(`/project/${p._id}`, '_blank')}
                                style={{ padding: '10px', marginBottom: '8px', borderRadius: '6px', backgroundColor: p._id === currentProjectId ? '#f1f5f9' : 'transparent', cursor: 'pointer', border: '1px solid', borderColor: p._id === currentProjectId ? '#cbd5e1' : 'transparent' }}
                            >
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: p._id === currentProjectId ? '#3b82f6' : '#1e293b' }}>{p.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{p.type.toUpperCase()}</div>
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        {versions.length === 0 ? (
                            <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No versions saved yet.</div>
                        ) : (
                            versions.map(v => (
                                <div key={v._id} style={{ padding: '10px', marginBottom: '8px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: v.saveType === 'auto' ? '3px solid #94a3b8' : '3px solid #10b981' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{v.versionName}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                                        <span style={{ textTransform: 'capitalize' }}>{v.saveType}</span>
                                    </div>
                                    {/* 🌟 NEW: The Preview Button */}
                                    <button 
                                        onClick={() => onPreviewClick(v._id)}
                                        style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                                    >
                                        Preview & Restore
                                    </button>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}