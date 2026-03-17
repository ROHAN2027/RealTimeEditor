import {Router} from 'express';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import * as invitationController from '../controllers/invitationController.js';

const invitationRouter = Router();

invitationRouter.use(authMiddleware); // Apply auth middleware to all routes in this router

invitationRouter.get('/', invitationController.getPendingInvites);
invitationRouter.post('/:inviteId', invitationController.respondToInvitation);
invitationRouter.delete('/:inviteId', invitationController.unsendInvitation);

export default invitationRouter;