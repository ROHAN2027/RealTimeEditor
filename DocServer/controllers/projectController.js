import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectVersion from '../models/ProjectVersion.js';
import {z} from 'zod';

const projectSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
    description: z.string().optional(),
    type: z.enum(["individual", "group"])
}).refine((data) => {
    if(data.type === "individual" && data.collaborators && data.collaborators.length > 0) {
        return false;
    }

    return true;
},{message: "Individual projects cannot have collaborators"});

//  req.body is conssit of the foolowing :
//{
//  "title": "Project Title",
//  "description": "Project Description" optional
//  "type": "individaul" or "group"
//}
// req.userId is the id of the user making the request (from auth middleware)
export const createProject = async (req, res) => {
    try {
        const {title, description, type} = projectSchema.parse(req.body);
        const userId = req.userId;
        const newProject = new Project({
            name: title,
            description: description || "",
            type: type,
            ownerId: userId,
            collaborators: []
        });
        const savedProject = await newProject.save();
        return res.status(201).json({
            success: true,
            message: "Project created successfully", 
            project: savedProject
        });
    } catch (error) {
        if(error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.errors.map(e => ({field: e.path[0], message: e.message}))
            });
        }
        console.error("Error creating project:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getProjects = async (req, res) => {
    try {
        const userId = req.userId;
        const projects = await Project.find({
            $or: [
                {ownerId: userId},
                {collaborators: userId}
            ]
        })
        .select('-documentData')
        .populate('ownerId', 'name email')       // 🌟 FIX 2: Fetch the owner's name
        .populate('collaborators', 'name email')
        .sort({ updatedAt: -1 });//this will move most resent to first
         // Exclude document data to save bandwidth
        return res.status(200).json({
            success: true,
            message: "Projects retrieved successfully",
            projects: projects
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in fetching projects"
        });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const currentUserId = req.userId;
        const project = await Project.findById(projectId)
        .select('-documentData')
        .populate('ownerId', 'name email')
        .populate('collaborators', 'name email'); // Exclude document data to save bandwidth
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }
        if (project.ownerId._id.toString() !== currentUserId && !project.collaborators.some(collab => collab._id.toString() === currentUserId)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to view this project."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project retrieved successfully",
            project: project
        });
    } catch (error) {
        console.error("Error fetching project by ID:", error);

        if(error.name === 'CastError' ) {
            return res.status(404).json({
                success: false,
                message: "invalid project ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching project by ID"
        });
    }
};

export const deleteProject = async (req, res) => {
    try {
        // 1. Instantly delete the document we already have in memory
        await req.project.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting project"
        });
    }
}

// Route: PUT /api/projects/:projectId
export const updateProject = async (req, res) => {
    try {
        const {name , description} = req.body;
        const project = req.project; // from middleware
        if(name) project.name = name;
        if(description) project.description = description;
        await project.save();
        return res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: project
        });
    }
    catch (error) {
        console.error("Error updating project:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating project"
        });
    }   
};

// Route: DELETE /api/projects/:projectId/collaborators/:collaboratorId

export const removeCollaborator = async (req, res) => {
    try {
        const { collaboratorId } = req.params;
        const project = req.project; // from middleware
        // THE FIX: Convert the Mongoose ObjectId to a string before comparing!
        const isCollaborator = project.collaborators.some(
            id => id.toString() === collaboratorId
        );

        if (!isCollaborator) {
            return res.status(404).json({
                success: false,
                message: "User is not a collaborator on this project."
            });
        }
        project.collaborators.pull(collaboratorId);
        // If after removal, there are no collaborators left, we can optionally change the project type back to 'individual'
        if(project.collaborators.length === 0) {
            project.type = 'individual';
        }
        await project.save();
        return res.status(200).json({
            success: true,
            message: "Collaborator removed successfully",
            project: project
        });
    }
    catch (error) {
        console.error("Error removing collaborator:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while removing collaborator"
        });
    }
};

export const leaveProject = async (req, res) => {
    try {
        const currentUserId = req.userId;
        const project = req.project; // from middleware
        if(project.ownerId.toString() === currentUserId) {
            return res.status(400).json({
                success: false,
                message: "Project owners cannot leave their own projects. Consider deleting the project instead."
            });
        }
        project.collaborators.pull(currentUserId);
        await project.save();
        return res.status(200).json({
            success: true,
            message: "You have successfully left the project."
        });
    }
    catch (error) {
        console.error("Error leaving project:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while leaving project"
        });
    }
}


export const createProjectVersion = async (req, res) => {
    try {
        const {projectId} = req.params;
        const {versionName, binaryData, saveType} = req.body;

        const newVersion = await ProjectVersion.create({
            projectId: projectId,
            versionName: versionName,
            yjsBinary: Buffer.from(binaryData), // Assuming binaryData is sent as a base64 string
            savedBy: req.userId,
            saveType: saveType
        });

        const Maxversions = saveType === 'auto' ? 5 : 10;
        // Clean up old versions if we exceed the limit
        const oldversions = await ProjectVersion.find({ projectId: projectId, saveType: saveType })
            .sort({ createdAt: -1 })
            .skip(Maxversions)
            .select('_id'); // Only select the _id field for deletion

        if (oldversions.length > 0) {
            const oldVersionIds = oldversions.map(v => v._id);
            await ProjectVersion.deleteMany({ _id: { $in: oldVersionIds } });
            console.log(`Deleted ${oldVersionIds.length} old ${saveType} versions for project ${projectId}`);
        }
        res.status(201).json({
            success: true,
            message: "Project version created successfully",
            version: newVersion._id
        });
    } catch (error) {
        console.error("Error creating project version:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while creating project version"
        });
    }
}

export const getProjectVersions = async (req, res) => {
    try{
        const {projectId} = req.params;
        const versions = await ProjectVersion.find({ projectId: projectId })
        .select('-yjsBinary') // Exclude the binary data to save bandwidth
        .populate('savedBy', 'name email')
        .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            versions: versions
        });
    } catch (error) {
        console.error("Error fetching project versions:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching project versions"
        });
    }
};

export const getProjectVersionById = async (req, res) => {
    try {
        const {projectId, versionId} = req.params;
        const version = await ProjectVersion.findOne({ _id: versionId, projectId: projectId }).populate('savedBy', 'name email');
        if (!version) {
            return res.status(404).json({
                success: false,
                message: "Version not found"
            });
        }
        res.status(200).json({
            success: true,
            version: version
        });
    } catch (error) {
        console.error("Error fetching project version:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error while fetching project version"
        });
    }
}

// const oldVersionData = response.data.version.yjsBinary.data; // Access the inner 'data' array
// const uint8ArrayBlob = new Uint8Array(oldVersionData); // Convert it back for Yjs

// // Apply it to the document!
// Y.applyUpdate(ydocRef.current, uint8ArrayBlob);