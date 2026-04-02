import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosSetup';
import { useSocket } from '../context/SocketContext';

import InvitationsList from '../components/InvitationsList';
import Button from '../components/comman/Buttons';
import Input from '../components/comman/Input';
import Logo from '../components/comman/Logo';

// 🌟 NEW MICRO-COMPONENTS
import Avatar from '../components/comman/Avatar';
import ProjectCard from '../components/comman/ProjectCard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState('individual');
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data?.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!socket) return; 
    const handleKicked = (kickedProjectId) => setProjects(prev => prev.filter(p => p._id !== kickedProjectId));
    const handleMyProjectsUpdated = () => fetchProjects(); 
    const handleInviteResolvedSelf = (resolvedInviteId) => {}; // Placeholder for your logic

    socket.on('invite-resolved-self', handleInviteResolvedSelf);
    socket.on('kicked-from-project', handleKicked);
    socket.on('user-projects-updated', handleMyProjectsUpdated);

    return () => {
      socket.off('user-projects-updated', handleMyProjectsUpdated);
      socket.off('kicked-from-project', handleKicked);
      socket.off('invite-resolved-self', handleInviteResolvedSelf);
    }
  }, [socket]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const payload = { title: newProjectName, type: newProjectType };
      if (newProjectDescription.trim()) payload.description = newProjectDescription.trim();
      const response = await api.post('/projects', payload);
      
      const createdProject = response.data?.project;
      if (response.data?.success && createdProject) {
        setProjects((prev) => [createdProject, ...prev]);
        setIsModalOpen(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectType('individual');
        navigate(`/project/${createdProject._id}`);
      }
    } catch (error) {
      alert("Failed to create project.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--theme-bg)] font-sans overflow-x-hidden selection:bg-[var(--theme-accent)] selection:text-white">
      
      {/* --- DEVELOPER WORKSPACE BACKGROUND --- */}
      {/* 1. Subtle Dot Matrix Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(var(--theme-text)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none"></div>
      {/* 2. Floating Orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[var(--theme-accent)]/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* --- FLOATING NAVIGATION DOCK --- */}
      <div className="pt-6 px-4 sm:px-8 relative z-50">
        <nav className="max-w-6xl mx-auto bg-[var(--theme-bg)]/70 backdrop-blur-2xl border border-[var(--theme-text)]/10 rounded-[2rem] px-6 py-3 flex justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <Logo hideTextOnMobile={true} />
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-3 bg-[var(--theme-text)]/5 rounded-full pl-2 pr-5 py-1.5 border border-[var(--theme-text)]/5">
              <Avatar name={user?.name} className="w-8 h-8 text-sm" />
              <span className="text-[var(--theme-text)]/80 font-bold text-sm">
                {user?.name}
              </span>
            </div>
            <Button onClick={logout} variant="ghost" size="sm" className="!text-[var(--theme-text)]/50 hover:!text-red-500 hover:!bg-red-500/10 rounded-full px-5">
              Log Out
            </Button>
          </div>
        </nav>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-16 pb-24">
        
        {/* Creative Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] text-xs font-black uppercase tracking-widest mb-6 border border-[var(--theme-accent)]/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-accent)]"></span>
              </span>
              Workspace Active
            </div>
            <h2 className="text-5xl sm:text-6xl font-black text-[var(--theme-text)] tracking-tighter leading-[1.1]">
              Create. <br/>
              <span className="text-[var(--theme-accent)] drop-shadow-sm">Collaborate.</span>
            </h2>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="primary" 
            size="lg" 
            className="rounded-full px-8 shadow-[0_10px_40px_-10px_var(--theme-accent)] hover:scale-105"
          >
            <span className="text-lg mr-2">+</span> New Project
          </Button>
        </div>

        {/* INVITATIONS */}
        <div className="mb-12">
            <InvitationsList onProjectJoined={fetchProjects} />
        </div>

        {/* PROJECTS GRID */}
        <div>
            <h3 className="text-lg font-black text-[var(--theme-text)]/40 uppercase tracking-widest mb-6 flex items-center gap-4">
                Recent Projects
                <div className="h-px bg-[var(--theme-text)]/10 flex-grow"></div>
            </h3>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-[var(--theme-text)]/10 border-t-[var(--theme-accent)] rounded-full animate-spin"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-32 bg-[var(--theme-text)]/5 backdrop-blur-md rounded-[3rem] border border-[var(--theme-text)]/10">
                    <div className="text-7xl mb-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 animate-float-smooth cursor-pointer">✨</div>
                    <h3 className="text-2xl font-extrabold text-[var(--theme-text)]">Blank Canvas</h3>
                    <p className="text-[var(--theme-text)]/50 mt-3 mb-8 font-medium max-w-md mx-auto leading-relaxed">
                    Your workspace is waiting. Create a new document to start mapping out your ideas.
                    </p>
                    <Button onClick={() => setIsModalOpen(true)} variant="secondary" size="lg" className="rounded-full">
                        Start Something New
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <ProjectCard 
                            key={project._id} 
                            project={project} 
                            currentUserId={user?._id} 
                            onClick={() => navigate(`/project/${project._id}`)} 
                        />
                    ))}
                </div>
            )}
        </div>
      </main>

      {/* --- CREATIVE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[var(--theme-bg)]/80 backdrop-blur-xl flex justify-center items-center z-[100] px-4">
          <div className="bg-[var(--theme-bg)] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.15)] border border-[var(--theme-text)]/10 w-full max-w-lg overflow-hidden relative">
            
            {/* Modal Header Decor */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--theme-accent)] to-blue-500"></div>

            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black text-[var(--theme-text)] tracking-tight">New Project</h3>
                <p className="text-[var(--theme-text)]/50 font-medium mt-1">Configure your new workspace.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--theme-text)]/5 text-[var(--theme-text)]/40 hover:text-[var(--theme-text)] hover:bg-[var(--theme-text)]/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="px-10 pb-10 space-y-6">
              <Input label="Project Name" name="name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required placeholder="e.g., Application Redesign" />

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-[var(--theme-text)]/80 ml-1">Description</label>
                <textarea rows={2} value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} className="w-full px-4 py-3 bg-[var(--theme-bg)]/80 backdrop-blur-sm border border-[var(--theme-text)]/20 rounded-xl text-[var(--theme-text)] placeholder-[var(--theme-text)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/50 focus:border-[var(--theme-accent)] transition-all resize-none shadow-inner" placeholder="Brief details about this project..." />
              </div>
              
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-[var(--theme-text)]/80 ml-1">Privacy & Type</label>
                <div className="grid grid-cols-2 gap-3">
                    {/* Custom Radio Button Styling */}
                    <div 
                        onClick={() => setNewProjectType('individual')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${newProjectType === 'individual' ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/5' : 'border-[var(--theme-text)]/10 hover:border-[var(--theme-text)]/30'}`}
                    >
                        <div className="font-bold text-[var(--theme-text)] mb-1">Private</div>
                        <div className="text-xs text-[var(--theme-text)]/50 font-medium">Only you have access</div>
                    </div>
                    <div 
                        onClick={() => setNewProjectType('group')}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${newProjectType === 'group' ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/5' : 'border-[var(--theme-text)]/10 hover:border-[var(--theme-text)]/30'}`}
                    >
                        <div className="font-bold text-[var(--theme-text)] mb-1">Group</div>
                        <div className="text-xs text-[var(--theme-text)]/50 font-medium">Invite your team</div>
                    </div>
                </div>
              </div>
              
              <div className="pt-6">
                <Button type="submit" variant="primary" size="lg" className="w-full rounded-full" isLoading={isCreating}>
                  {isCreating ? 'Creating...' : 'Launch Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}