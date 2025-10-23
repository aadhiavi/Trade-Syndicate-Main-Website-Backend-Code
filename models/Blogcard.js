const mongoose = require('mongoose');

const blogcardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    summary: {
        type: String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: true,
        unique: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
}, {
    timestamps: true
});

const Blogcard = mongoose.model('Blogcard', blogcardSchema);

module.exports = Blogcard;
