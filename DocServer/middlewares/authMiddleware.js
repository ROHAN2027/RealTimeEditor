import User from '../models/User.js';
import {verifyToken} from '../services/jwt.js';

export const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.Authorization || req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({message: "Authorization header missing or malformed"});
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        req.userId = decoded.userId; // Store the user ID in the request object for later use
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({message: error.message}); 
        // this is throw error from jwt.js when token is invalid or expired
    }
}