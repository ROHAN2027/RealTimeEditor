import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from './router/auth.js';
import projectRoutes from './router/projects.js';
import invitationRoutes from './router/invitation.js';
import http from 'http';
import { initializeSocket } from './socket.js';
import imgRouter from "./router/imgUpload.js";
import drawingRoutes from "./router/drawingRoutes.js";


await connectDB();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());
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


