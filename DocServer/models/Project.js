import mongoose from "mongoose";    

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    type :{
        type: String,
        enum:['individual', 'group'],
        default: 'individual',
    },
    ownerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
        index: true,
    }],
    documentData:{
        type : Buffer,
        default: null,
    }
},{
    timestamps: true,
});

export default mongoose.model("Project", projectSchema);