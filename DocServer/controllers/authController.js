import {hashPassword, verifyPassword} from '../services/hash.js';
import { OAuth2Client } from 'google-auth-library';
import {generateToken} from '../services/jwt.js';
import User from '../models/User.js';
import sendEmail from '../utils/SendEmails.js';


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
                authProvider: 'google',
                isEmailVerified: true, // 🌟 Mark Google accounts as verified since Google has already verified the email
                verificationToken: undefined, // 🌟 No need for OTP for Google accounts
                verificationTokenExpires: undefined // 🌟 No need for OTP expiration for Google accounts
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
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });  
    }
    
    try {
        let existingUser = await User.findOne({ email: email });
        
        // Generate the 6-digit OTP (Fixed typo: optCode -> otpCode)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); 
        const hashedpwd = await hashPassword(password);

        if (existingUser) {
            // If the user exists AND is verified, stop them.
            if (existingUser.isEmailVerified) {
                return res.status(400).json({ message: "User with this email already exists." });
            } 
            // 🌟 THE FIX: If they exist but ARE NOT verified, update their OTP and resend it!
            else {
                existingUser.passwordHash = hashedpwd; // Update password just in case they typed a new one
                existingUser.name = name;
                existingUser.verificationToken = otpCode;
                existingUser.verificationTokenExpires = Date.now() + 10 * 60 * 1000;
                await existingUser.save();
            }
        } else {
            // Create a brand new user
            const newUser = new User({
                name: name,
                email: email,
                passwordHash: hashedpwd,
                isEmailVerified: false,
                verificationToken: otpCode,
                verificationTokenExpires: Date.now() + 10 * 60 * 1000 
            });
            await newUser.save();
        }

        // Send the email (using the correct otpCode variable)
        const emailMessage = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to SyncEditor, ${name}!</h2>
            <p>Your 6-digit verification code is:</p>
            <h1 style="font-size: 36px; letter-spacing: 8px; color: #3b82f6; background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px;">${otpCode}</h1>
            <p>This code will expire in 10 minutes. Please enter it in the app to verify your email address.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 40px;">If you did not create an account, please ignore this email.</p>
        </div>
        `;
        
        await sendEmail({
            email: email,
            subject: "Verify your SyncEditor account",
            message: emailMessage
        });

        res.status(201).json({ message: "OTP sent to email, please verify your account" });
        
    } catch (error) {
        console.error("Error in register controller:", error);
        res.status(500).json({ message: "Error creating user" });
    }
}

export const verifyotp = async (req, res) => {
    const {email, otp} = req.body;
    try{
        if (!email || !otp) {
            return res.status(400).json({message: "Email and password are required"});
        }
        const user = await User.findOne({email: email});
        if (!user) {
            return res.status(400).json({message: "no user with this email"});
        }
        // 2. Check if they are already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: "Account is already verified." });
        }
        // 3. Check if the OTP matches AND has not expired
        if (user.verificationToken !== otp) {
            return res.status(400).json({ success: false, message: "Invalid verification code." });
        }
        if (user.verificationTokenExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
        }

        user.isEmailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        res.status(200).json({ success: true, message: "Account verified successfully! You can now log in." });

        } catch (error) {
            res.status(500).json({ success: false, message: "Server error during verification." });
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
        // 🌟 ADD THIS SAFETY CHECK:
        if (!user.passwordHash) {
            return res.status(400).json({ error: "Invalid account setup. Please sign in with Google." });
        }
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return res.status(400).json({message: "Invalid password"});
        }
        if (!user.isEmailVerified) {
            return res.status(400).json({message: "Email not verified. Please verify your email before logging in."});
        }
        const token = generateToken({ userId: user._id });

        res.cookie(
            'jwt_token',token,
            {
                httpOnly: true,
                // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                secure: true,      // 🌟 MANDATORY for Cloudflare/HTTPS!
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