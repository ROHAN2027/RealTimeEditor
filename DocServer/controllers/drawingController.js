import Drawing from '../models/Drawing.js';

export const saveDrawing = async (req, res) => {
    try{
        const { drawingId, projectId, thumbnailUrl } = req.body;
        if(!req.file) {
            return res.status(400).json({
                success: false,
                message: "No Yjs data uploaded"
            });
        }
        const ujsBuffer = req.file.buffer;

        const savedDrawing = await Drawing.findOneAndUpdate(
            { drawingId : drawingId },
            {
                projectId: projectId,
                thumbnailUrl: thumbnailUrl,
                yjsData: ujsBuffer
            },
            { upsert: true, new: true }
        )
        console.log(`Drawing saved successfully ${drawingId} to MongoDB` );
        return res.status(200).json({
            success: true,
            message: "Drawing saved successfully",
            drawing: savedDrawing
        });
    }catch(error){
        console.error("Error saving drawing:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to save drawing"
        });
    }
}

export const getDrawing = async (req, res) => {
    try{
        const { drawingId } = req.params;
        const drawing = await Drawing.findOne({ drawingId: drawingId });
        if(!drawing || !drawing.yjsData) {
            return res.status(404).json({
                success: false,
                message: "Drawing not found"
            });
        }
        res.set('Content-Type', 'application/octet-stream');
        // Notice that we explicitly set the Content-Type to application/octet-stream. This tells the browser: "Do not try to read this as text or JSON. This is raw computer memory!"
        return res.status(200).send(drawing.yjsData);
    }catch(error){
        console.error("Error retrieving drawing:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve drawing"
        });
    }
}