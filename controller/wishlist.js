const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const WishList = require("../model/wishlist");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const router = express.Router();
const fs = require("fs");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth");
const Product = require("../model/product");

// create product
router.post(
  "/add-wishlist",
  catchAsyncErrors(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { productId, tags, quantity } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: "Insufficient stock." });
        }

        let wishList = await WishList.findOne({ userId });

        if (wishList) {
            if (wishList.item.length >= 50) {
                return res.status(400).json({ message: "Wishlist cannot exceed 50 items." });
            }
            // Add item to existing cart
            wishList.item.push({ productId, tags, quantity });
            await wishList.save();
        } else {
            // Create a new cart
            wishList = new WishList({
                userId,
                item: [{ productId, tags, quantity }],
            });
            await wishList.save();
        }

    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);


exports.addItemToWishlist = async (req, res) => {
    try {
        const { userId, productId, tags, quantity } = req.body;

        if (!userId || !productId || !tags || !quantity) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check stock for the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: "Insufficient stock." });
        }

        // Check if cart for user already exists
        let cart = await Cart.findOne({ userId });

        if (cart) {
            // Add item to existing cart
            cart.item.push({ productId, tags, quantity });
            await cart.save();
        } else {
            // Create a new cart
            cart = new Cart({
                userId,
                item: [{ productId, tags, quantity }],
            });
            await cart.save();
        }

        res.status(201).json(cart);
    } catch (error) {
        res.status(500).json({ message: "Failed to add item to wishlist.", error: error.message });
    }
};
// get all events
router.get("/get-all-events", async (req, res, next) => {
  try {
    const events = await Event.find();
    res.status(201).json({
      success: true,
      events,
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
});

// get all events of a shop
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// delete event of a shop
router.delete(
  "/delete-shop-event/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const eventId = req.params.id;
      const eventData = await Event.findById(eventId);

      if (!eventData) {
        return next(new ErrorHandler("Event is not found with this id", 404));
      }

      eventData.images.forEach((imageUrl) => {
        const filename = imageUrl;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      });
      const event = await Event.findByIdAndDelete(eventId);

      res.status(201).json({
        success: true,
        message: "Event Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// all events --- for admin
router.get(
  "/admin-all-events",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const events = await Event.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
