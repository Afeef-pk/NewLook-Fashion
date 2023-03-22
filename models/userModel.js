const mongoose= require("mongoose")

const userSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    is_verified:{
        type:Number,
        default:0
    },
    token:{
        type:String,
        default:''
    },
    is_blocked:{
        type:Number,
        default:0
    },
    address:{
        type:Array,
        required:false
    }
})

module.exports = mongoose.model('User', userSchema)