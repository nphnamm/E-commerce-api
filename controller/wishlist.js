const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const WishList = require("../model/wishlist");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth");
const Product = require("../model/product");
const router = express.Router();

// create product
router.post(
  "/add-wishlist",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user.id;
      console.log(req.user.id);
      const { productId, tags, quantity } = req.body;
      const products = await Product.find({ tags: tags });
      const product = products.find((p) => p._id.toString() === productId);
      console.log('product', product);
      console.log('products', products)
      // if (!product) {
      //     return res.status(404).json({ message: "Product not found." });
      // }

      // if (product.stock < quantity) {
      //     return res.status(400).json({ message: "Insufficient stock." });
      // }

      let wishList = await WishList.findOne({ userId });

      if (wishList) {
        if (wishList.item.length >= 50) {
          return res.status(400).json({ message: "Wishlist cannot exceed 50 items." });
        }
        // Check if product already exists in wishlist
        const existingItem = wishList.item.find((i) => i.productId.toString() === productId);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          // Add new item to wishlist
          wishList.item.push({ productId, tags, quantity });
        }
        await wishList.save();
        res.status(200).json({ message: "Wishlist updated successfully.", wishList });
      } else {
        // Create a new cart
        wishList = new WishList({
          userId,
          item: [{ productId, tags, quantity }],
        });
        await wishList.save();
        res.status(200).json({ message: "Wishlist created successfully.", wishList });

      }

    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);



// Add quantity to wishlist item
router.post(
  "/add-quantity",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user.id;
      console.log()
      const { productId, quantity } = req.body;

      let wishList = await WishList.findOne({ userId });

      if (!wishList) {
        return res.status(404).json({ message: "Wishlist not found." });
      }

      const item = wishList.item.find((i) => i.productId.toString() === productId);

      if (!item) {
        return res.status(404).json({ message: "Product not found in wishlist." });
      }

      const product = await Product.findById(productId);

      if (!product || product.stock < item.quantity + quantity) {
        return res.status(400).json({ message: "Insufficient stock." });
      }

      item.quantity += quantity;
      await wishList.save();

      res.status(200).json({ message: "Quantity updated successfully.", wishList });
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// Reduce quantity from wishlist item
router.post(
  "/reduce-quantity",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;

      let wishList = await WishList.findOne({ userId });

      if (!wishList) {
        return res.status(404).json({ message: "Wishlist not found." });
      }

      const item = wishList.item.find((i) => i.productId.toString() === productId);

      if (!item) {
        return res.status(404).json({ message: "Product not found in wishlist." });
      }

      if (item.quantity <= quantity) {
        // Remove item if quantity becomes zero or less
        wishList.item = wishList.item.filter((i) => i.productId.toString() !== productId);
      } else {
        item.quantity -= quantity;
      }

      await wishList.save();

      res.status(200).json({ message: "Quantity reduced successfully.", wishList });
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);


module.exports = router;