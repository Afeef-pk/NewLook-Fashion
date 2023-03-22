const mongoose = require("mongoose")

const categorySchema = new mongoose.Schema({

    categoryName: {
        type: String,
        required: true
    },
    image:{
        type: String,
        required: false
    }
})

module.exports = mongoose.model('categorie', categorySchema)