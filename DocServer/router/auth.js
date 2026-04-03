import {Router} from 'express';
import * as authController from '../controllers/authController.js';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import { auth } from 'google-auth-library';

const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/google/login', authController.googleLogin);
authRouter.get('/profile', authMiddleware, authController.getProfile);
// ✅ CORRECT (Make sure it looks EXACTLY like this)
authRouter.post('/verify-otp', authController.verifyotp);
export default authRouter;