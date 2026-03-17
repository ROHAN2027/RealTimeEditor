import User from '../models/User.js';
import Project from '../models/Project.js';
import Invitation from '../models/Invitation.js';
import { validateInviteRules } from '../utils/Validators.js';   


export const sendInvitation = async (req, res) => {
    try {
        const receiver = await User.findOne({email: req.body.email});

        const errorMessage = validateInviteRules(req.project, req.userId, receiver);
        if (errorMessage) {
            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }
        // If we reach here, it means all validations passed and we can proceed to add the collaborator
        const newInvitation = new Invitation({
            projectId: req.project._id,
            senderId: req.userId,
            receiverId: receiver._id
        });
        await newInvitation.save();
        return res.status(200).json({
            success: true,
            message: "Invitation sent successfully"
        });
    } catch (error) {
        if(error.code === 11000) { // Duplicate key error (unique index violation)
            return res.status(400).json({
                success: false,
                message: "An invitation has already been sent to this user for this project."
            });
        }
        return res.status(500).json({
            success: false,
            message: "An error occurred while sending the invitation."
        });
    }
}

// export const sendInvitation = async (req, res) => {
//     try {
//         const receiver = await User.findOne({email: req.body.email});

//         const errorMessage = validateInviteRules(req.project, req.userId, receiver);
//         if (errorMessage) {
//             return res.status(400).json({
//                 success: false,
//                 message: errorMessage
//             });
//         }

//         // 1. Check if an invitation document already exists for this user/project combo
//         let invite = await Invitation.findOne({
//             projectId: req.project._id,
//             receiverId: receiver._id
//         });

//         if (invite) {
//             // If it's already pending, stop them.
//             if (invite.status === 'pending') {
//                 return res.status(400).json({ 
//                     success: false, 
//                     message: "An invitation is already pending for this user." 
//                 });
//             }
            
//             // 2. THE FIX: If it exists but is 'accepted' or 'declined', recycle it!
//             // (We know they aren't in the project anymore because validateInviteRules passed)
//             invite.status = 'pending';
//             invite.senderId = req.userId; // Update sender in case a different owner invited them
//             await invite.save();
            
//         } else {
//             // 3. If no document exists at all, create a brand new one
//             invite = new Invitation({
//                 projectId: req.project._id,
//                 senderId: req.userId,
//                 receiverId: receiver._id
//             });
//             await invite.save();
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Invitation sent successfully"
//         });

//     } catch (error) {
//         console.error("sendInvitation Error:", error); // NEVER swallow errors.

//         // FIX: It is error.code, not error.name
//         if(error.code === 11000) { 
//             return res.status(400).json({
//                 success: false,
//                 message: "An invitation has already been sent to this user for this project."
//             });
//         }
        
//         return res.status(500).json({
//             success: false,
//             message: "An error occurred while sending the invitation."
//         });
//     }
// }
// for the receiver to see all the invitations they have received and respond to them (accept/reject)
export const getPendingInvites = async (req, res) => {
    try {
        const invitations = await Invitation.find({
            receiverId: req.userId,
            status: 'pending'
        })
        .populate('senderId', 'name email')
        .populate('projectId', 'name')
        .sort({ createdAt: -1 }); // Sort by most recent invitations first
        return res.status(200).json({
            success: true,
            message: "Invitations retrieved successfully",
            invitations: invitations
        });

    }catch (error) {
        console.error("Error fetching invitations:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching invitations."
        });
    }
}

export const respondToInvitation = async (req, res) => {
    try {
        const { inviteId } = req.params;
        const { response } = req.body; // expected to be 'accepted' or 'rejected'
        if (!['accepted', 'rejected'].includes(response)) {
            return res.status(400).json({
                success: false,
                message: "Invalid response. Must be 'accepted' or 'rejected'."
            });
        }

        const invitation = await Invitation.findById(inviteId);
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found."
            });
        }
        if (invitation.receiverId.toString() !== req.userId) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to respond to this invitation."
            });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "This invitation has already been responded to."
            });
        }
        if(response === 'accepted') {
            // Add the user to the project's collaborators
            // We use $addToSet to avoid duplicates, just in case
            await Project.findByIdAndUpdate(invitation.projectId, {
                $addToSet: { collaborators: invitation.receiverId },
                type : 'group'
            });
        }

        // Update the invitation status
        await invitation.deleteOne();
        // invitation.status = response;
        // await invitation.save();

        return res.status(200).json({
            success: true,
            message: `Invitation ${response} successfully.`
        });

    } catch (error) {
        console.error("Error responding to invitation:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while responding to the invitation."
        });
    }
}


// for the owner to get the invites
// Route: GET /api/projects/:projectId/invites

export const getProjectInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.find({
            projectId: req.project._id,
            status: 'pending'
        }).populate('receiverId', 'name email')
        .sort({ createdAt: -1 }); // Sort by most recent invitations first
        return res.status(200).json({
            success: true,
            message: "Project invitations retrieved successfully",
            invitations: invitations
        });
    }
    catch (error) {
        console.error("Error fetching project invitations:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching project invitations."
        }); 
    }
}

// Route: DELETE /api/invites/:inviteId/unsend

export const unsendInvitation = async (req, res) => {
    try {
        const { inviteId } = req.params;
        const invitation = await Invitation.findOneAndDelete({
            _id: inviteId,
            senderId: req.userId,
            status: 'pending'
        });
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found or cannot be unsent."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Invitation unsent successfully."
        });
    } catch (error) {
        console.error("Error unsending invitation:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while unsending the invitation."
        });
    }
}