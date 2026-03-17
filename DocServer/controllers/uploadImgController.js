import {v2 as cloudinary} from 'cloudinary';
import stramifier from 'streamifier';
import crypto from 'crypto';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadImage = async (req, res) => {
    try{
        if(!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }
        const { hash, drawingId } = req.query;
        const targetPublicId = drawingId ? drawingId : hash;
        console.log("Backend received hash from URL:", hash);
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: 'doc_images',
                resource_type: 'image', 
                public_id: targetPublicId, // Use the target public ID to avoid duplicates
                overwrite: true // Overwrite existing image with the same hash
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload image to Cloudinary"
                    });
                }
                return res.status(200).json({
                    success: true,
                    message: "Image uploaded successfully",
                    imageUrl: result.secure_url
                });
            }
        );
        stramifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (error) {
        console.error("Error in uploadImage controller:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while uploading image"
        });
    }
}