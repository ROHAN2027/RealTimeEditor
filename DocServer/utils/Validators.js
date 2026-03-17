export const validateInviteRules = (project, senderId, receiver) => {
    if (!receiver) return "No user found with that email.";
    if (senderId === receiver._id.toString()) return "You cannot invite yourself.";
    if (project.collaborators.includes(receiver._id)) return "User is already a collaborator.";
    return null; // Null means no errors!
};