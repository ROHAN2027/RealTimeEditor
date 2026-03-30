import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function ProjectSideBar({
    isOpen,
    currentProjectId,
    onlineUsers = [], 
    onClose,
    onPreviewClick,         // 🌟 FIX 1: Added missing prop
    versionRefreshTrigger   // 🌟 FIX 2: Added missing trigger prop
}) {
    const [activeTab, setActiveTab] = useState('projects'); 
    // 🌟 FIX 1: Extract 'user' from the Auth Context!
    const { user } = useAuth();
    const socket = useSocket();
    // Data States
    const [allProjects, setAllProjects] = useState([]);
    const [currentProjectDetails, setCurrentProjectDetails] = useState(null);
    const [versions, setVersions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [pendingSentInvites, setPendingSentInvites] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // 🌟 NEW: Forces project data reload

    // 🌟 EDITING STATE
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // 🌟 Check if current user is the owner (this now works safely!)
    const isOwner = currentProjectDetails?.ownerId?._id === user?._id || currentProjectDetails?.ownerId === user?._id;

    // 🌟 NEW: Listen for the receiver accepting/rejecting the invite
    useEffect(() => {
        if (!socket) return;

        const handleInviteResponded = ({ inviteId, response }) => {
            // Instantly remove it from the pending list
            setPendingSentInvites((prev) => prev.filter(inv => inv._id !== inviteId));
            
            // If they accepted, tell the sidebar to fetch the new collaborators list!
            if (response === 'accepted') {
                setRefreshTrigger(prev => prev + 1); 
            }
        };

        const handleProjectUpdated = () => {
            setRefreshTrigger(prev => prev + 1);
        };

        const handleMyProjectsUpdated = () => {
            setRefreshTrigger(prev => prev + 1); // Forces the sidebar to re-fetch!
        };
        socket.on('user-projects-updated', handleMyProjectsUpdated);
        socket.on('project-updated', handleProjectUpdated);

        socket.on('invite-responded', handleInviteResponded);

        return () => {
            socket.off('invite-responded', handleInviteResponded);
            socket.off('project-updated', handleProjectUpdated);
            socket.off('user-projects-updated', handleMyProjectsUpdated);
        };
    }, [socket]);

    const fetchPendingInvites = async () => {
        try{
            const response = await api.get(`/projects/${currentProjectId}/invites`);
            setPendingSentInvites(response.data?.invitations || []);
        } catch (error) {
            console.error('Error fetching pending invites:', error);

        }
    }

    const handleInviteCollaborator = async (e) => {
        e.preventDefault();
        if(!inviteEmail.trim()) return;
        setIsInviting(true);
        try {
            const res = await api.post(`/projects/${currentProjectId}/collaborators`, 
                { email: inviteEmail }
            );
            if(res.data.success) {
                alert("Invite sent successfully!");
                setInviteEmail('');
                fetchPendingInvites(); // Refresh the pending invites list
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to send invite");
        } finally {
            setIsInviting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setAllProjects(res.data?.projects || []);
                const current = res.data?.projects?.find(p => p._id === currentProjectId);
                if (current) setCurrentProjectDetails(current);
            } catch (err) {
                console.error('Error fetching projects:', err);
            }
        };

        fetchProjects();
        if(isOwner) fetchPendingInvites();
    }, [isOpen, currentProjectId, refreshTrigger , isOwner ]); // 🌟 Added refreshTrigger to dependencies so it refetches when an invite is accepted/rejected


    // 🌟 FETCH 2: Fetches versions when Tab opens OR when a save happens!
    useEffect(() => {
        // Only fetch if the sidebar is open and we are looking at the versions tab
        if (!isOpen || activeTab !== 'versions') return;

        const fetchVersions = async () => {
            try {
                const res = await api.get(`/projects/${currentProjectId}/versions`);
                setVersions(res.data?.versions || []);
            } catch (err) {
                console.error('Error fetching versions:', err);
            }
        };

        fetchVersions();
    // 👇 The magic is here: It listens to versionRefreshTrigger!
    }, [isOpen, activeTab, currentProjectId, versionRefreshTrigger]);

    // 🌟 OWNER API CALLS
    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${currentProjectId}`, { name: editName, description: editDescription });
            setIsEditingProject(false);
            // Socket will trigger re-fetch automatically!
        } catch (error) { alert("Failed to update project details."); }
    };

    const handleDeleteProject = async () => {
        const confirmDelete = window.confirm("🚨 Are you sure you want to DELETE this project? This will erase all documents, drawings, and versions permanently.");
        if (!confirmDelete) return;
        try {
            await api.delete(`/projects/${currentProjectId}`);
            // The backend emits 'kicked-from-project' and forces EVERYONE in the room (including you) to the dashboard safely!
        } catch (error) { alert("Failed to delete project."); }
    };

    const handleRemoveCollaborator = async (collaboratorId) => {
        const confirmRemove = window.confirm("Revoke this user's access?");
        if (!confirmRemove) return;
        try {
            await api.delete(`/projects/${currentProjectId}/collaborators/${collaboratorId}`);
            // Socket forces the user out and refreshes your list!
        } catch (error) { alert("Failed to remove collaborator."); }
    };

    const handleUnsendInvite = async (inviteId) => {
        try{
            await api.delete(`/invites/${inviteId}`);
            setPendingSentInvites((prev) => prev.filter(invite => invite._id !== inviteId));
        } catch (error) {
            console.error('Error unsending invite:', error);
        }
    }

    const handleLeaveProject = async () => {
        const confirmLeave = window.confirm("Are you sure you want to leave this project? You will lose access to it.");
        if (!confirmLeave) return;
        try {
            // const token = localStorage.getItem('jwt_token');
            await api.delete(`/projects/${currentProjectId}/collaborators/me`);
            // 🌟 SOCKET HANDLING: 
            // By redirecting to the dashboard, EditorRoom.jsx unmounts.
            // React automatically fires the useEffect cleanup, triggering socket.emit("leave-document") 
            // and destroying the Yjs doc, instantly cleanly disconnecting them!
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Error leaving project:', error);
            alert(error.response?.data?.message || "Failed to leave project");
        }
    }

    // --- RENDER PREP ---
    const filteredProjects = allProjects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const allCollaborators = [...(currentProjectDetails?.collaborators || [])];
    if (currentProjectDetails?.ownerId) {
        const hasOwner = allCollaborators.some(c => (c._id || c) === (currentProjectDetails.ownerId._id || currentProjectDetails.ownerId));
        if (!hasOwner) allCollaborators.push(currentProjectDetails.ownerId);
    }

    const onlineUserIds = onlineUsers.map(u => u.id);
    const offlineUsers = allCollaborators.filter(c => !onlineUserIds.includes(c._id || c));
    // 🌟 ADD THIS MISSING LINE HERE:
    // 🌟 FIX: Wrap it in String() to guarantee perfect matching
    const ownerIdStr = String(currentProjectDetails?.ownerId?._id || currentProjectDetails?.ownerId);


    return (
        <div style={{ width: isOpen ? '280px' : '0px', minWidth: isOpen ? '280px' : '0px', flexShrink: 0, backgroundColor: '#ffffff', borderRight: isOpen ? '1px solid #e2e8f0' : 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap', color: '#1e293b', zIndex: 50 }}>
            
            {/* 🌟 PROJECT HEADER (View & Edit Mode) */}
            {isEditingProject ? (
                <form onSubmit={handleUpdateProject} style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Project Name" style={{ padding: '8px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold' }} required />
                    <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Project Description (Optional)" style={{ padding: '8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'none' }} rows={2} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" style={{ flex: 1, padding: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                        <button type="button" onClick={() => setIsEditingProject(false)} style={{ flex: 1, padding: '6px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Cancel</button>
                    </div>
                </form>
            ) : (
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word', paddingRight: '10px' }}>
                            {currentProjectDetails?.name || 'Workspace'}
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {isOwner && (
                                <>
                                    <button onClick={() => { setEditName(currentProjectDetails?.name || ''); setEditDescription(currentProjectDetails?.description || ''); setIsEditingProject(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>Edit</button>
                                    <button onClick={handleDeleteProject} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>Delete</button>
                                </>
                            )}
                            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '22px', lineHeight: '1', padding: 0 }}>&times;</button>
                        </div>
                    </div>
                    {/* 🌟 SHOW DESCRIPTION */}
                    {currentProjectDetails?.description && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' }}>
                            {currentProjectDetails.description}
                        </div>
                    )}
                </div>
            )}

            {/* OWNER ONLY: INVITE SECTION */}
            {isOwner && (
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>Invite Collaborator</div>
                    <form onSubmit={handleInviteCollaborator} style={{ display: 'flex', gap: '8px' }}>
                        <input type="email" placeholder="User's email..." value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <button type="submit" disabled={isInviting} style={{ padding: '8px 12px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: isInviting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{isInviting ? '...' : 'Send'}</button>
                    </form>
                    {pendingSentInvites.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Pending Invites</div>
                            {pendingSentInvites.map(inv => (
                                <div key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', marginBottom: '4px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '11px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.receiverId?.email}</span>
                                    <button onClick={() => handleUnsendInvite(inv._id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Revoke</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* COLLABORATOR ONLY: LEAVE PROJECT */}
            {!isOwner && (
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef2f2' }}>
                    <button onClick={handleLeaveProject} style={{ width: '100%', padding: '8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Leave Project</button>
                </div>
            )}

            {/* Online/Offline Status Panel */}
            <div style={{ padding: '15px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>Currently In File</div>
                
                {onlineUsers.map((u, i) => (
                    <div key={`online-${i}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '8px', flexShrink: 0 }}></span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name} {u.isMe && '(You)'}</span>
                        {/* 🌟 KICK BUTTON (ONLINE) */}
                        {isOwner && !u.isMe && String(u.id) !== ownerIdStr && (
                            <button onClick={() => handleRemoveCollaborator(u.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Kick</button>
                        )}
                    </div>
                ))}

                {offlineUsers.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>Offline</div>
                        {offlineUsers.map((u, i) => (
                            <div key={`offline-${i}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '14px', color: '#94a3b8' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid #94a3b8', marginRight: '8px', flexShrink: 0 }}></span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Collaborator'}</span>
                                {/* 🌟 KICK BUTTON (OFFLINE) */}
                                {isOwner && String(u._id || u) !== ownerIdStr && (
                                    <button onClick={() => handleRemoveCollaborator(u._id || u)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs & Content */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <button onClick={() => setActiveTab('projects')} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'projects' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'projects' ? '#3b82f6' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>Projects</button>
                <button onClick={() => setActiveTab('versions')} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'versions' ? '2px solid #10b981' : '2px solid transparent', color: activeTab === 'versions' ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>Versions</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {activeTab === 'projects' ? (
                    <>
                        <input type="text" placeholder="🔍 Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b', boxSizing: 'border-box' }} />
                        {filteredProjects.map(p => (
                            <div key={p._id} onClick={() => window.open(`/project/${p._id}`, '_blank')} style={{ padding: '10px', marginBottom: '8px', borderRadius: '6px', backgroundColor: p._id === currentProjectId ? '#f1f5f9' : 'transparent', cursor: 'pointer', border: '1px solid', borderColor: p._id === currentProjectId ? '#cbd5e1' : 'transparent' }}>
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
                                    <button onClick={() => onPreviewClick(v._id)} style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>Preview & Restore</button>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}