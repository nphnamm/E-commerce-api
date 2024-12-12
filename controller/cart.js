const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Cart = require("../model/cart");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const { isSeller, isAdmin, isAuthenticated } = require("../middleware/auth");
const Product = require("../model/product");
const router = express.Router();

// create product
router.post(
  "/add-cart",
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

      let cart = await Cart.findOne({ userId });

      if (cart) {
        if (cart.item.length >= 50) {
          return res.status(400).json({ message: "cart cannot exceed 50 items." });
        }
        // Check if product already exists in cart
        const existingItem = cart.item.find((i) => i.productId.toString() === productId);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          // Add new item to cart
          cart.item.push({ productId, tags, quantity });
        }
        await cart.save();
        res.status(200).json({ message: "cart updated successfully.", cart });
      } else {
        // Create a new cart
        cart = new Cart({
          userId,
          item: [{ productId, tags, quantity }],
        });
        await cart.save();
        res.status(200).json({ message: "cart created successfully.", cart });

      }

    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);



// Add quantity to cart item
router.post(
  "/add-quantity",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user.id;
      console.log()
      const { productId, quantity } = req.body;

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({ message: "cart not found." });
      }

      const item = cart.item.find((i) => i.productId.toString() === productId);

      if (!item) {
        return res.status(404).json({ message: "Product not found in cart." });
      }

      const product = await Product.findById(productId);

      if (!product || product.stock < item.quantity + quantity) {
        return res.status(400).json({ message: "Insufficient stock." });
      }

      item.quantity += quantity;
      await Cart.save();

      res.status(200).json({ message: "Quantity updated successfully.", cart });
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// Reduce quantity from cart item
router.post(
  "/reduce-quantity",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({ message: "cart not found." });
      }

      const item = cart.item.find((i) => i.productId.toString() === productId);

      if (!item) {
        return res.status(404).json({ message: "Product not found in cart." });
      }

      if (item.quantity <= quantity) {
        // Remove item if quantity becomes zero or less
        cart.item = cart.item.filter((i) => i.productId.toString() !== productId);
      } else {
        item.quantity -= quantity;
      }

      await Cart.save();

      res.status(200).json({ message: "Quantity reduced successfully.", cart });
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);


module.exports = router;