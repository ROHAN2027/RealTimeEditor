import {Router} from 'express';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import multer from 'multer';
import { saveDrawing,getDrawing } from '../controllers/drawingController.js';  
import {requireProjectAccess } from '../middlewares/projectMiddleware.js';

const drawingRoutes = Router();
drawingRoutes.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage() });

drawingRoutes.post('/:projectId/save', requireProjectAccess, upload.single('yjsData'), saveDrawing);
drawingRoutes.get('/:projectId/:drawingId', requireProjectAccess, getDrawing);

export default drawingRoutes;