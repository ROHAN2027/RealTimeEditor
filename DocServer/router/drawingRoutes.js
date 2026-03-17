import {Router} from 'express';
import {authMiddleware} from '../middlewares/authMiddleware.js';
import multer from 'multer';
import { saveDrawing,getDrawing } from '../controllers/drawingController.js';  

const drawingRoutes = Router();
drawingRoutes.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage() });

drawingRoutes.post('/save',upload.single('yjsData'), saveDrawing);
drawingRoutes.get('/:drawingId', getDrawing);

export default drawingRoutes;