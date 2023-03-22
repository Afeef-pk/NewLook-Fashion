const mongoose = require("mongoose")

const couponSchema = new mongoose.Schema({

    couponCode: {
        type: String,
        required: true
    },
    discount:{
        type: Number,
        required: true
    },
    minAmount: {
        type: Number,
        required: true
    },
    maxDiscount:{
        type:Number,
        required:true
    }
    
})

module.exports = mongoose.model('coupon', couponSchema)