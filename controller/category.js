const express = require("express");
const Category = require("../model/category");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const router = express.Router();

// Create a new category
exports.createCategory = catchAsyncErrors(async (req, res, next) => {
    try {
        const { title, icon, subTitle, image_Url } = req.body;

        const category = await Category.create({
            title,
            icon,
            subTitle,
            image_Url
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            category
        });
    } catch (error) {
        console.error("Error creating category:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});

// Get all categories
exports.getAllCategories = catchAsyncErrors(async (req, res, next) => {
    try {
        const categories = await Category.find();
        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});

// Get a single category by ID
exports.getCategoryById = catchAsyncErrors(async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.status(200).json({
            success: true,
            category
        });
    } catch (error) {
        console.error("Error fetching category:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});

// Update a category by ID
exports.updateCategory = catchAsyncErrors(async (req, res, next) => {
    try {
        const { title, icon, subTitle, image_Url } = req.body;

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { title, icon, subTitle, image_Url },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        console.error("Error updating category:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});

// Delete a category by ID
exports.deleteCategory = catchAsyncErrors(async (req, res, next) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        return next(new ErrorHandler(error.message, 400));
    }
});
module.exports = router;