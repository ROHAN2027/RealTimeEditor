import {Router} from 'express';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import {requireProjectOwnership , requireProjectAccess } from '../middlewares/projectMiddleware.js';
import * as projectController from '../controllers/projectController.js';
import * as invitationController from '../controllers/invitationController.js';
const projectRouter = Router();

projectRouter.use(authMiddleware); // Apply auth middleware to all routes in this router

projectRouter.post('/', projectController.createProject);
projectRouter.get('/', projectController.getProjects);
projectRouter.get('/:projectId', requireProjectAccess, projectController.getProjectById);
projectRouter.delete('/:projectId', requireProjectOwnership, projectController.deleteProject);
projectRouter.put('/:projectId', requireProjectOwnership, projectController.updateProject);
projectRouter.delete('/:projectId/collaborators/:collaboratorId', requireProjectOwnership, projectController.removeCollaborator);
projectRouter.delete('/:projectId/collaborators/me', requireProjectAccess, projectController.leaveProject);
projectRouter.post('/:projectId/collaborators', requireProjectOwnership, invitationController.sendInvitation);
projectRouter.get('/:projectId/invites', requireProjectOwnership, invitationController.getProjectInvitations);

projectRouter.post('/:projectId/versions', requireProjectAccess, projectController.createProjectVersion);
projectRouter.get('/:projectId/versions', requireProjectAccess, projectController.getProjectVersions);
projectRouter.get('/:projectId/versions/:versionId', requireProjectAccess, projectController.getProjectVersionById);
export default projectRouter;