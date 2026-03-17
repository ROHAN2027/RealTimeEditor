import Project from '../models/Project.js';

export const requireProjectOwnership = async (req, res, next) => {
    try{
        const projectId = req.params.projectId;
        const currentUserId = req.userId; // Assuming authMiddleware has already set req.userId
        const project = await Project.findById(projectId).select('-documentData'); // not induce the document data to save memory   
        if (!project) {
            return res.status(404).json({
                sucess: false,
                message: "Project not found"
            });
        }
        if (project.ownerId.toString() !== currentUserId) {
            return res.status(403).json({
                sucess: false,
                message: "Access denied. You must be the owner of this project to perform this action."
            });
        }
        req.project = project; // Store the project in the request object for later use
        next();
    }
    catch(error) {
        console.error("Error in requireProjectOwnership middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while verifying project ownership"
        });
    }
};


export const requireProjectAccess = async (req, res, next) => {
    try{
        const projectId = req.params.projectId;
        const currentUserId = req.userId; // Assuming authMiddleware has already set req.userId
        const project = await Project.findById(projectId).select('-documentData'); // not induce the document data to save memory   
        if (!project) {
            return res.status(404).json({
                sucess: false,
                message: "Project not found"
            });
        }
        if (project.ownerId.toString() !== currentUserId && !project.collaborators.includes(currentUserId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You must be the owner or a collaborator of this project to perform this action."
            });
        }
        req.project = project; // Store the project in the request object for later use
        next();
    }
    catch(error) {
        console.error("Error in requireProjectAccess middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while verifying project access"
        });
    }
}
