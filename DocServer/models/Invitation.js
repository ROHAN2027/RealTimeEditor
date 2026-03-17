import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
},{
    timestamps: true, // Automatically gives us createdAt to show "Invited 2 days ago"
});

// --------------------------------------------------------
// ✨ PRO TIP: The "Anti-Spam" Compound Index
// --------------------------------------------------------
// This tells MongoDB: "A receiver can only have ONE active invite per project."
// If the owner clicks "Send Invite" 50 times, the database will block the duplicates!
invitationSchema.index({ projectId: 1, receiverId: 1 }, { unique: true });

export default mongoose.model("Invitation", invitationSchema);
