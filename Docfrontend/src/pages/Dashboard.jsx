import { useState, useEffect, use } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosSetup';
import {useSocket} from '../context/SocketContext'; // <-- Import the useSocket hook

import InvitationsList from '../components/InvitationsList'; // 🌟 IMPORT THE NEW COMPONENT

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket(); // 🌟 GRAB GLOBAL SOCKET

  // --- STATE ---
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal StateT
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState('individual');
  const [isCreating, setIsCreating] = useState(false);

// 🌟 FIX: Moved the function outside so the whole component can use it!
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
  }, []); // It now just calls the function when the page loads

  useEffect(() => {
    if (!socket) return; 

    // Instantly hide the project card if revoked
    const handleKicked = (kickedProjectId) => {
        setProjects(prev => prev.filter(p => p._id !== kickedProjectId));
    };

    // 2. 🌟 NEW: Refresh the dashboard if a project was added/joined in another tab!
    const handleMyProjectsUpdated = () => {
        fetchProjects(); 
    };

    // When the backend says "Hey, you accepted this in another tab!"
    const handleInviteResolvedSelf = (resolvedInviteId) => {
      // Instantly delete it from the screen WITHOUT doing a full API refetch!
        setInvitations((prev) => prev.filter(invite => invite._id !== resolvedInviteId));
    };

    socket.on('invite-resolved-self', handleInviteResolvedSelf);
    socket.on('kicked-from-project', handleKicked);
    socket.on('user-projects-updated', handleMyProjectsUpdated);

    return () => {
      socket.off('user-projects-updated', handleMyProjectsUpdated);
      socket.off('kicked-from-project', handleKicked);
      socket.off('invite-resolved-self', handleInviteResolvedSelf);
    }
  }, [socket]);

  // --- CREATE NEW PROJECT ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const payload = {
        title: newProjectName,
        type: newProjectType
      };

      if (newProjectDescription.trim()) {
        payload.description = newProjectDescription.trim();
      }

      const response = await api.post('/projects', 
        payload
      );
      
      // Add the new project to our list instantly
      const createdProject = response.data?.project;
      if (response.data?.success && createdProject) {
        setProjects((prevProjects) => [createdProject, ...prevProjects]);
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

  // --- UI RENDERING ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* 1. TOP NAVBAR */}
      <nav className="bg-white shadow-sm border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">SyncEditor</h1>
        <div className="flex items-center space-x-4">
          <span className="text-slate-600 font-medium">Hello, {user?.name}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header & Action Button */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Your Workspace</h2>
            <p className="text-slate-500 mt-1">Manage your individual and group projects.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            + New Project
          </button>
        </div>

        {/* 🌟 MOUNT THE INVITATIONS LIST HERE! */}
        {/* We pass fetchProjects so if they click "Accept", the projects grid updates instantly! */}
        <InvitationsList onProjectJoined={fetchProjects} />

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          
          /* Empty State */
          <div className="text-center py-24 bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-bold text-slate-800">No projects yet</h3>
            <p className="text-slate-500 mt-2 mb-6">Create your first document to start collaborating.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition"
            >
              Create Project
            </button>
          </div>
        ) : (
          
          /* Project Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project._id}
                onClick={() => navigate(`/project/${project._id}`)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer group flex flex-col"
              >
                {/* Title + Type Badge */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition truncate pr-4">
                    {project.name}
                  </h3>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                    project.type === 'group' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {project.type}
                  </span>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                )}

                {/* Role */}
                <p className="text-xs font-medium text-slate-400 mb-3">
                  Role: <span className="text-slate-600">{/* 🌟 FIX: Checks for the ID whether it is a populated object OR a raw string */}
{(project.ownerId?._id || project.ownerId) === user?._id ? 'Owner' : 'Collaborator'}</span>
                </p>

                {/* Footer: collaborators count + date */}
                <div className="mt-auto text-xs text-slate-400 border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span>
                    {project.type === 'group'
                      ? `👥 ${project.collaborators?.length ?? 0} collaborator${project.collaborators?.length !== 1 ? 's' : ''}`
                      : '🔒 Private'}
                  </span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 3. NEW PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex justify-center items-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Create New Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Q3 Marketing Plan"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Add a short description..."
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
                <select 
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="individual">Individual (Private)</option>
                  <option value="group">Group (Collaborative)</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}