const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    icon: {
        type: String,
    },
    subTitle: {
        type: String,

    },
    image_Url: {
        type: String,
    }
});

module.exports = mongoose.model("Category", categorySchema);
