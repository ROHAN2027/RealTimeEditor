import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import connectDB from "./config/db.js";
import authRoutes from './router/auth.js';
import projectRoutes from './router/projects.js';
import invitationRoutes from './router/invitation.js';
import http from 'http';
import { initializeSocket } from './socket.js';
import imgRouter from "./router/imgUpload.js";
import drawingRoutes from "./router/drawingRoutes.js";

const allowedOrigins = process.env.CLIENT_URLS 
    ? process.env.CLIENT_URLS.split(',').map(url => url.trim()) 
    : ['http://localhost:5173', 'http://localhost:3000'];

await connectDB();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors(
    {
        origin : allowedOrigins,
        credentials : true
    }
));

// 🌟 UPDATE THESE TWO LINES: Increase Node.js payload limits to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invites', invitationRoutes);
app.use('/api/:projectId/iupload', imgRouter);
app.use('/api/drawings', drawingRoutes);

app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ 
        message: err.message || 'Internal Server Error' 
    });
});
const httpServer = http.createServer(app);
const io = initializeSocket(httpServer);
app.set('io', io);
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


