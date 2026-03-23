import mongoose from "mongoose";

const projectVersionSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Project"
    },
    versionName:{
        type: String,
        required: true
    },
    saveType:{
        type: String,
        enum:["manual","auto"],
        required:true
    },
    yjsBinary : {
        type: Buffer,
        required: true
    },
    savedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("ProjectVersion", projectVersionSchema);