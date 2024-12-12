const mongoose = require("mongoose");

const WishlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, "Must have userId"],
  },
  item:[
    {
        productId:{
            type:String,
            required: true,
        },
        tags:{
            type:String,
            required: true,
        },
        quantity:{
            type:Number,
            required:true,
        }
    }
  ]
  
});

module.exports = mongoose.model("Wishlist",  WishlistSchema);
