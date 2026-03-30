import React , { useEffect, useState } from 'react';
import api from '../api/axiosSetup';
import { useSocket } from '../context/SocketContext';

export default function InvitationsList({ onProjectJoined }) {
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const socket = useSocket();

    // 1. fetching pending invites on load
    useEffect(() => {
        const fetchInvitations = async () => {
            try{
                const response = await api.get('/invites');
                setInvitations(response.data?.invitations || []);
            } catch (error) {
                console.error('Error fetching invitations:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInvitations();
    }, []);

    // 🌟 FIX: Removed the early closing bracket that was here!

    // 2. Listen for live socket Invites & cancellations
    useEffect(() => {
        if (!socket) return;
       
        const handleNewInvite = (newInvite) => {
            setInvitations((prev) => [newInvite, ...prev]);
        };

        const handleInviteCancelled = (cancelledInviteId) => {
            setInvitations((prev) => prev.filter(invite => invite._id !== cancelledInviteId));
        };
        const handleInviteResolvedSelf = (resolvedInviteId) => {
            setInvitations((prev) => prev.filter(invite => invite._id !== resolvedInviteId));
        };

        socket.on('new-invite', handleNewInvite);
        socket.on('invite-cancelled', handleInviteCancelled);
        socket.on('invite-resolved-self', handleInviteResolvedSelf);
        
        return () => {
            socket.off('new-invite', handleNewInvite);
            socket.off('invite-cancelled', handleInviteCancelled);
            socket.off('invite-resolved-self', handleInviteResolvedSelf);
        };
    }, [socket]);

    const handleResponse = async (inviteId, responseType) => {
        try {
            await api.post(`/invites/${inviteId}`, { response: responseType });
            setInvitations((prev) => prev.filter(invite => invite._id !== inviteId));
            
            // 🌟 FIX: Checked for 'accepted' to match your backend and buttons
            if (responseType === 'accepted' && onProjectJoined) {
                onProjectJoined();
            }
        } catch (error) {
            console.error(`Error responding to invitation:`, error);
        }
    }

    if (isLoading) return <div>Loading invitations...</div>;
    if (invitations.length === 0) return null;

    return (
        <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex justify-center items-center text-xs mr-2 animate-pulse">
                    {invitations.length}
                </span>
                Pending Invitations
            </h3>
            
            <div className="flex flex-col gap-3">
                {invitations.map((invite) => (
                    <div key={invite._id} className="bg-white border border-amber-200 shadow-sm p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
                        <div>
                            <p className="text-slate-800 font-medium">
                                <span className="font-bold text-blue-600">{invite.senderId?.name}</span> invited you to join <span className="font-bold">{invite.projectId?.name || "a project"}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Received: {new Date(invite.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={() => handleResponse(invite._id, 'accepted')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-md transition"
                            >
                                Accept
                            </button>
                            <button 
                                onClick={() => handleResponse(invite._id, 'rejected')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-md transition"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} // 🌟 FIX: The closing bracket belongs down here!