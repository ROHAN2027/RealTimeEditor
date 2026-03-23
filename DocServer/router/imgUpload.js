import {Router} from 'express';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import { uploadImage } from '../controllers/uploadImgController.js';
import {requireProjectAccess } from '../middlewares/projectMiddleware.js';
import multer from 'multer';

const imgRouter = Router({ mergeParams: true }); // Merge params to access projectId in the controller
imgRouter.use(authMiddleware); // Apply auth middleware to all routes in this router
imgRouter.use(requireProjectAccess); // Apply project access middleware to all routes in this router

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

imgRouter.post('/', upload.single('image'), uploadImage);
// upload.single('image').

// Multer catches the file.

// It looks for a form field specifically named 'image'.

// It takes that file, holds it in the server's RAM (because we configured multer.memoryStorage()), and attaches it to req.file.
export default imgRouter;
