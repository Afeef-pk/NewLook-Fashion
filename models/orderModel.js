const { ObjectID } = require("bson")
const mongoose = require("mongoose")

const orderedProductSchema = new mongoose.Schema({

    productID: {
        type: ObjectID,

    },
    name: {
        type: String
    },
    price: {
        type: Number,

    },
    quantity: {
        type: Number,
    }
})

const orderSchema = new mongoose.Schema({

    createdAt: {
        type: Date,
        required: true
    },
    userID: {
        type: ObjectID,
        required: true
    },
    orders: [orderedProductSchema],
    address: {
        type: Array
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String
    },
    orderStatus: {
        type: String
    }
})

module.exports = mongoose.model('order', orderSchema)