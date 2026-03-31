import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    passwordHash: {
        type: String,
    },
    authProvider: { 
        type: String, 
        default: 'local' 
    } // 🌟 Track how they signed up
},{
    timestamps: true,
});

export default mongoose.model("User", userSchema);