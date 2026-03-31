import {Router} from 'express';
import * as authController from '../controllers/authController.js';
import {authMiddleware} from '../middlewares/authMiddleware.js';

const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/google/login', authController.googleLogin);
authRouter.get('/profile', authMiddleware, authController.getProfile);

export default authRouter;