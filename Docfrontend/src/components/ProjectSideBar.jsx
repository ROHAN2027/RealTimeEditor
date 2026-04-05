import React, { useState, useEffect } from 'react';
import api from '../api/axiosSetup';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

// 🌟 PREMIUM REUSABLE COMPONENTS
import Button from '../components/comman/Buttons';
import Input from '../components/comman/Input';
import Avatar from '../components/comman/Avatar';
import Badge from '../components/comman/Badge';

export default function ProjectSideBar({
    isOpen,
    currentProjectId,
    onlineUsers = [], 
    onClose,
    onPreviewClick,
    versionRefreshTrigger
}) {
    const [activeTab, setActiveTab] = useState('projects'); 
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
    const [refreshTrigger, setRefreshTrigger] = useState(0); 

    // EDITING STATE
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // 🌟 BULLETPROOF OWNER CHECK
    const safeOwnerId = currentProjectDetails?.ownerId?._id || currentProjectDetails?.ownerId;
    const isOwner = Boolean(safeOwnerId && user?._id && String(safeOwnerId) === String(user._id));

    useEffect(() => {
        if (!socket) return;

        const handleInviteResponded = ({ inviteId, response }) => {
            setPendingSentInvites((prev) => prev.filter(inv => inv._id !== inviteId));
            if (response === 'accepted') setRefreshTrigger(prev => prev + 1); 
        };

        const handleProjectUpdated = () => setRefreshTrigger(prev => prev + 1);
        const handleMyProjectsUpdated = () => setRefreshTrigger(prev => prev + 1);
        
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
        try {
            const response = await api.get(`/projects/${currentProjectId}/invites`);
            setPendingSentInvites(response.data?.invitations || []);
        } catch (error) { console.error('Error fetching pending invites:', error); }
    }

    const handleInviteCollaborator = async (e) => {
        e.preventDefault();
        if(!inviteEmail.trim()) return;
        setIsInviting(true);
        try {
            const res = await api.post(`/projects/${currentProjectId}/collaborators`, { email: inviteEmail });
            if(res.data.success) {
                setInviteEmail('');
                fetchPendingInvites();
            }
        } catch (error) { alert(error.response?.data?.message || "Failed to send invite"); } 
        finally { setIsInviting(false); }
    };

    useEffect(() => {
        if (!isOpen) return;
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setAllProjects(res.data?.projects || []);
                const current = res.data?.projects?.find(p => p._id === currentProjectId);
                if (current) setCurrentProjectDetails(current);
            } catch (err) { console.error('Error fetching projects:', err); }
        };
        fetchProjects();
        if(isOwner) fetchPendingInvites();
    }, [isOpen, currentProjectId, refreshTrigger, isOwner]); 

    useEffect(() => {
        if (!isOpen || activeTab !== 'versions') return;
        const fetchVersions = async () => {
            try {
                const res = await api.get(`/projects/${currentProjectId}/versions`,{
                    headers: { 'Cache-Control': 'no-cache' } 
                });
                setVersions(res.data?.versions || []);
            } catch (err) { console.error('Error fetching versions:', err); }
        };
        fetchVersions();
    }, [isOpen, activeTab, currentProjectId, versionRefreshTrigger,refreshTrigger]);

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/projects/${currentProjectId}`, { name: editName, description: editDescription });
            setIsEditingProject(false);
        } catch (error) { alert("Failed to update project details."); }
    };

    const handleDeleteProject = async () => {
        const confirmDelete = window.confirm("🚨 Are you sure you want to DELETE this project?");
        if (!confirmDelete) return;
        try { await api.delete(`/projects/${currentProjectId}`); } 
        catch (error) { alert("Failed to delete project."); }
    };

    const handleRemoveCollaborator = async (collaboratorId) => {
        const confirmRemove = window.confirm("Revoke this user's access?");
        if (!confirmRemove) return;
        try { await api.delete(`/projects/${currentProjectId}/collaborators/${collaboratorId}`); } 
        catch (error) { alert("Failed to remove collaborator."); }
    };

    const handleUnsendInvite = async (inviteId) => {
        try {
            await api.delete(`/invites/${inviteId}`);
            setPendingSentInvites((prev) => prev.filter(invite => invite._id !== inviteId));
        } catch (error) { console.error('Error unsending invite:', error); }
    }

    const handleLeaveProject = async () => {
        const confirmLeave = window.confirm("Are you sure you want to leave this project?");
        if (!confirmLeave) return;
        try {
            await api.delete(`/projects/${currentProjectId}/collaborators/me`);
            window.location.href = '/dashboard';
        } catch (error) { alert(error.response?.data?.message || "Failed to leave project"); }
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
    const ownerIdStr = String(currentProjectDetails?.ownerId?._id || currentProjectDetails?.ownerId);

    const textAreaClass = "w-full px-4 py-3 bg-[var(--theme-bg,#ffffff)]/80 backdrop-blur-sm border border-[var(--theme-text,#cbd5e1)]/40 rounded-xl text-[var(--theme-text,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent,#3b82f6)]/50 transition-all resize-none shadow-inner";

    return (
        /* 🌟 THE SLIDING CLIPPER BOX: This outer div animates width to hide the inner content cleanly without squishing! */
        <div className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 overflow-hidden z-50 h-full ${isOpen ? 'w-[340px] shadow-[10px_0_30px_rgba(0,0,0,0.1)] border-r border-[var(--theme-text)]/10' : 'w-0 border-none shadow-none'}`}>
          
            <div className="w-[340px] flex flex-col h-full bg-[var(--theme-bg)]/95 backdrop-blur-3xl relative">
                
                {/* Ambient Sidebar Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--theme-accent)]/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* --- 1. FIXED HEADER (Never Scrolls) --- */}
                <div className="p-6 border-b border-[var(--theme-text)]/10 shrink-0 relative z-20 bg-[var(--theme-bg)]/80 backdrop-blur-md">
                    {isEditingProject ? (
                        <form onSubmit={handleUpdateProject} className="flex flex-col gap-3">
                            <span className="text-xs font-black uppercase tracking-widest text-[var(--theme-accent)] mb-1">Edit Workspace</span>
                            <Input name="editName" value={editName} onChange={e => setEditName(e.target.value)} required placeholder="Project Name" />
                            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description (Optional)" className={textAreaClass} rows={2} />
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsEditingProject(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" variant="primary" className="flex-1">Save</Button>
                            </div>
                        </form>
                    ) : (
                        <div className="relative group">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-extrabold text-[var(--theme-text)] truncate mb-1 tracking-tight">
                                        {currentProjectDetails?.name || 'Workspace'}
                                    </h3>
                                    {currentProjectDetails?.description && (
                                        <p className="text-xs text-[var(--theme-text)]/50 font-medium line-clamp-2 leading-relaxed">
                                            {currentProjectDetails.description}
                                        </p>
                                    )}
                                </div>
                                <button onClick={onClose} className="shrink-0 text-[var(--theme-text)]/40 hover:text-[var(--theme-text)] hover:bg-[var(--theme-text)]/10 p-1.5 rounded-lg transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="flex gap-2 mt-5">
                                {isOwner ? (
                                    <>
                                        <Button size="sm" variant="secondary" className="flex-1 text-[11px]" onClick={() => { setEditName(currentProjectDetails?.name || ''); setEditDescription(currentProjectDetails?.description || ''); setIsEditingProject(true); }}>
                                            Edit Details
                                        </Button>
                                        <Button size="sm" variant="ghost" className="flex-1 text-[11px] !text-red-500 hover:!bg-red-500/10" onClick={handleDeleteProject}>
                                            Delete
                                        </Button>
                                    </>
                                ) : (
                                    <Button size="sm" variant="danger" className="w-full text-[11px] shadow-lg shadow-red-500/20" onClick={handleLeaveProject}>
                                        Leave Project
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- 2. SCROLLABLE CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col relative z-10">
                    
                    {/* STICKY TABS */}
                    <div className="sticky top-0 z-30 bg-[var(--theme-bg)]/90 backdrop-blur-xl border-b border-[var(--theme-text)]/10 p-3 pt-4">
                        <div className="flex p-1 bg-[var(--theme-text)]/5 rounded-xl border border-[var(--theme-text)]/5 shadow-inner">
                            <button 
                                onClick={() => setActiveTab('projects')} 
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'projects' ? 'bg-[var(--theme-accent)] text-white shadow-[0_4px_15px_-3px_var(--theme-accent)]' : 'text-[var(--theme-text)]/50 hover:text-[var(--theme-text)] hover:bg-[var(--theme-text)]/5'}`}
                            >
                                Projects
                            </button>
                            <button 
                                onClick={() => setActiveTab('versions')} 
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'versions' ? 'bg-[var(--theme-accent)] text-white shadow-[0_4px_15px_-3px_var(--theme-accent)]' : 'text-[var(--theme-text)]/50 hover:text-[var(--theme-text)] hover:bg-[var(--theme-text)]/5'}`}
                            >
                                Versions
                            </button>
                        </div>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 p-4 pb-10">
                        {activeTab === 'projects' ? (
                            <div className="space-y-6">
                                {/* SEARCH BAR */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--theme-accent)] transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Search projects..." 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-text)]/5 hover:bg-[var(--theme-text)]/10 focus:bg-[var(--theme-bg)] border border-[var(--theme-text)]/10 focus:border-[var(--theme-accent)] rounded-xl text-sm font-bold text-[var(--theme-text)] focus:outline-none focus:ring-4 focus:ring-[var(--theme-accent)]/20 transition-all placeholder:font-medium placeholder-[var(--theme-text)]/30"
                                    />
                                </div>

                                {/* PROJECT LIST (With Glow Hover) */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]/40 ml-1">Your Workspaces</h4>
                                    {filteredProjects.map(p => (
                                        <div 
                                            key={p._id} 
                                            onClick={() => window.open(`/project/${p._id}`, '_blank')} 
                                            className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden border ${p._id === currentProjectId ? 'bg-[var(--theme-accent)]/10 border-[var(--theme-accent)]/40 shadow-sm' : 'bg-[var(--theme-text)]/[0.02] border-[var(--theme-text)]/10 hover:border-[var(--theme-accent)]/50 hover:shadow-[0_10px_30px_-10px_var(--theme-accent)] hover:-translate-y-0.5'}`}
                                        >
                                            {/* Glow Behind Item */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-accent)]/0 via-[var(--theme-accent)]/5 to-[var(--theme-accent)]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            
                                            <div className="relative z-10 flex justify-between items-start">
                                                <div className={`text-sm font-extrabold truncate pr-2 transition-colors ${p._id === currentProjectId ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text)] group-hover:text-[var(--theme-accent)]'}`}>
                                                    {p.name}
                                                </div>
                                                <Badge variant={p.type === 'group' ? 'purple' : 'emerald'} className="shrink-0">{p.type}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {versions.length === 0 ? (
                                    <div className="text-center py-16 opacity-50">
                                        <div className="text-4xl mb-3 grayscale opacity-70">🕰️</div>
                                        <h4 className="text-sm font-bold text-[var(--theme-text)]">No History</h4>
                                        <p className="text-xs font-medium mt-1">Saved versions will appear here.</p>
                                    </div>
                                ) : (
                                    versions.map(v => (
                                        <div key={v._id} className="p-4 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-text)]/10 shadow-sm hover:shadow-md hover:border-[var(--theme-accent)]/30 hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${v.saveType === 'auto' ? 'bg-[var(--theme-text)]/20' : 'bg-emerald-500'}`}></div>
                                            <div className="pl-3">
                                                <div className="text-sm font-bold text-[var(--theme-text)] group-hover:text-[var(--theme-accent)] transition-colors truncate mb-1.5">{v.versionName}</div>
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text)]/40 mb-4">
                                                    <span>{new Date(v.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className={v.saveType === 'auto' ? '' : 'text-emerald-500'}>{v.saveType}</span>
                                                </div>
                                                <Button size="sm" variant="secondary" className="w-full text-xs shadow-sm" onClick={() => onPreviewClick(v._id)}>
                                                    Preview & Restore
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* --- TEAM & INVITE SECTION --- */}
                        <div className="mt-8 pt-8 border-t border-[var(--theme-text)]/10 space-y-8">
                            
                            {/* TEAM PRESENCE */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]/40 mb-3 ml-1">Team Presence</h4>
                                <div className="space-y-1">
                                    {onlineUsers.map((u, i) => (
                                        <div key={`online-${i}`} className="flex items-center justify-between p-2 rounded-xl bg-[var(--theme-text)]/[0.02] border border-[var(--theme-text)]/5 hover:bg-[var(--theme-text)]/5 group transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar name={u.name} className="w-8 h-8 text-xs shadow-sm" />
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--theme-bg)] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                </div>
                                                <span className="text-sm font-bold text-[var(--theme-text)] truncate max-w-[110px]">
                                                    {u.name} {u.isMe && <span className="text-[var(--theme-accent)] ml-1 text-xs">(You)</span>}
                                                </span>
                                            </div>
                                            {isOwner && !u.isMe && String(u.id) !== ownerIdStr && (
                                                <button onClick={() => handleRemoveCollaborator(u.id)} className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
                                                    Kick
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {offlineUsers.map((u, i) => (
                                        <div key={`offline-${i}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--theme-text)]/5 group transition-all opacity-50 hover:opacity-100">
                                            <div className="flex items-center gap-3">
                                                <div className="relative grayscale">
                                                    <Avatar name={u.name || 'C'} className="w-8 h-8 text-xs shadow-sm" />
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--theme-text)]/30 border-2 border-[var(--theme-bg)] rounded-full"></div>
                                                </div>
                                                <span className="text-sm font-medium text-[var(--theme-text)] truncate max-w-[110px]">
                                                    {u.name || 'Collaborator'}
                                                </span>
                                            </div>
                                            {isOwner && String(u._id || u) !== ownerIdStr && (
                                                <button onClick={() => handleRemoveCollaborator(u._id || u)} className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* INVITE TEAM */}
                            {isOwner && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]/40 mb-3 ml-1">Invite Collaborator</h4>
                                    <form onSubmit={handleInviteCollaborator} className="flex gap-2">
                                        <div className="flex-1">
                                            <Input type="email" placeholder="colleague@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                                        </div>
                                        <Button type="submit" variant="primary" isLoading={isInviting} className="px-4 shadow-sm">
                                            {isInviting ? '' : 'Add'}
                                        </Button>
                                    </form>
                                    
                                    {pendingSentInvites.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2 ml-1">Pending Invites</h4>
                                            {pendingSentInvites.map(inv => (
                                                <div key={inv._id} className="flex justify-between items-center bg-[var(--theme-text)]/5 border border-[var(--theme-text)]/10 px-3 py-2.5 rounded-xl group transition-all hover:border-red-500/30 hover:bg-red-500/5">
                                                    <span className="text-xs font-medium text-[var(--theme-text)]/70 truncate pr-2">{inv.receiverId?.email}</span>
                                                    <button onClick={() => handleUnsendInvite(inv._id)} className="text-[10px] font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wide">
                                                        Revoke
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}