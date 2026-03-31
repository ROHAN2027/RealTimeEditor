import {hashPassword, verifyPassword} from '../services/hash.js';
import { OAuth2Client } from 'google-auth-library';
import {generateToken} from '../services/jwt.js';
import User from '../models/User.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
    try{
        const { credential } = req.body;
        // console.log("Received Google credential:", credential);

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email } = ticket.getPayload();

        // 🌟 FIX 2 & 3: Use 'let user' and fix the Mongoose creation logic
        let user = await User.findOne({ email: email });
        if(!user) {
            user = new User({
                name: name,
                email: email,
                authProvider: 'google'
            });
            await user.save();
        }

        const token = generateToken({ userId: user._id });

        res.cookie(
            'jwt_token',token,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                sameSite: 'lax', // Adjust as needed (e.g., 'lax' or 'none' if you have cross-origin requests)
                maxAge: 7 * 24 * 60 * 60 * 1000 // Cookie expires in 7 days
            }
        )

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email
        };
        
        res.status(200).json({message: "Login successful", user: userResponse});

    }
    catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: "Invalid Google Token" });
    }
}

export const register = async (req, res) => {
    const {name, email, password} = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({message: "Name, email and password are required"});  
        // 400 Bad Request: The server couldn't understand the request due to invalid syntax or missing data.
    }
    const existingUser = await User.findOne({email: email});
    if (existingUser) {
        return res.status(400).json({message: "User with this email already exists"});
    }
    try{
        const hashedpwd = await hashPassword(password);
        const newUser = new User({
            name: name,
            email: email,
            passwordHash: hashedpwd
        });
        await newUser.save();
        res.status(201).json({message: "User created successfully"});
        // 201 Created: A request was successful and a new resource was created.
    } catch (error) {
        console.error("Error in register controller:", error);
        res.status(500).json({message: "Error creating user"});
        // 500 Internal Server Error: The generic "catch-all" error. Something broke on the server, and it doesn't know how to handle it.
    }
}

export const login = async (req, res) => {
    try{
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({message: "Email and password are required"});
        }
        const user = await User.findOne({email: email});
        if (!user) {
            return res.status(400).json({message: "no user with this email"});
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({message: "Invalid password"});
        }
        const token = generateToken({ userId: user._id });

        res.cookie(
            'jwt_token',token,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                sameSite: 'lax', // Adjust as needed (e.g., 'lax' or 'none' if you have cross-origin requests)
                maxAge: 7 * 24 * 60 * 60 * 1000 // Cookie expires in 7 days
            }
        )
        
        // Return user data without password
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email
        };
        
        res.status(200).json({message: "Login successful", user: userResponse});
    } catch (error) {
        console.error("Error in login controller:", error);
        res.status(500).json({message: "Error logging in"});
    }
}

export const logout = (req, res) => {
    res.clearCookie('jwt_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.status(200).json({message: "Logout successful"});
}

export const getProfile = async (req, res) => {
    const userId = req.userId; 
    // This is set by the authMiddleware after verifying the token
    try {
        const user = await User.findById(userId).select('-passwordHash');
        res.status(200).json({message: "Profile retrieved successfully", user: user});
    } catch (error) {
        console.error("Error in getProfile controller:", error);
        res.status(500).json({message: "Error retrieving profile"});
    }
}