import mongoose from 'mongoose';

const DrawingSchema = new mongoose.Schema({
    drawingId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    projectId: { 
        type: String, 
        required: true
    },
    thumbnailUrl: {
        type: String,
        required: true
    },
    yjsData: {
        type: Buffer, // Store Yjs document as binary data
        required: true
    },
},{timestamps: true});

export default mongoose.model('Drawing', DrawingSchema);