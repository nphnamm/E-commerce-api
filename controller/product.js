const express = require("express");
const cactchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Shop = require("../model/shop");
// const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const fs = require("fs");
const Order = require("../model/order");
const cloudinary = require("cloudinary");
const multer = require("multer");
const upload = multer();

// create product
router.post(
  "/create-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      console.log("images", req.body);
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        // const files = req.files;
        // console.log("files", files);
        // const imageUrls = files.map((file) => `${file.filename}`);
        // const productData = req.body;
        // productData.images = imageUrls;
        // productData.shop = shop;
        // const product = await Product.create(productData);
        // res.status(201).json({
        //   success: true,
        //   product,
        // });
        let images = [];
        if (typeof req.body.images === "array") {
          images.push(req.body.images);
        } else {
          images = req.body.images;
        }
        const imagesLinks = [];
        for (let i = 0; i < images.length; i++) {
          if (typeof images[i] === "string") {
            const result = await cloudinary.v2.uploader.upload(images[i], {
              folder: "products",
            });
            imagesLinks.push({
              public_id: result.public_id,
              url: result.secure_url,
            });
          }
        }
        const productData = req.body;
        productData.images = imagesLinks;
        productData.shop = shop;
        const product = await Product.create(productData);
        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);

// create product
router.post(
  "/create-product-test",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      console.log("images", req.files);
      console.log("shop id", req.body.shopId);
      let images = req.files;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        // const files = req.files;
        // console.log("files", files);
        // const imageUrls = files.map((file) => `${file.filename}`);
        // const productData = req.body;
        // productData.images = imageUrls;
        // productData.shop = shop;
        // const product = await Product.create(productData);
        // res.status(201).json({
        //   success: true,
        //   product,
        // });
        // let images = [];
        // if (typeof req.file === "object") {
        //   images.push(req.file);
        // } else {
        //   images.push(req.file);
        // }
        // if (typeof req.files === "array") {
        //   images = req.files;
        // }
        const imagesLinks = [];
        console.log(images);
        for (let i = 0; i < images.length; i++) {
          const imageBuffer = images[i].buffer;
          const base64Image = `data:${
            req.files[i].mimetype
          };base64,${imageBuffer.toString("base64")}`;

          const result = await cloudinary.v2.uploader.upload(base64Image, {
            folder: "products",
          });

          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
        const productData = req.body;
        productData.images = imagesLinks;
        productData.shop = shop;
        const product = await Product.create(productData);
        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);

//update product
router.put(
  "/update-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // const productId = req.body.id;
      // const product = await Product.findById(productId)
      const shopId = req.body.shopId;
      // console.log(req.body.images[0]);
      console.log(req.body.shopId);
      // console.log(req.body.storage);

      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        const productData = req.body;

        // const files = req.files;
        // console.log("files", files);
        // const imageUrls = files.map((file) => `${file.filename}`);
        // const productData = req.body;
        // productData.images = imageUrls;
        // productData.shop = shop;
        // const product = await Product.create(productData);
        // res.status(201).json({
        //   success: true,
        //   product,
        // });

        if (req.body.images) {
          let images = [];

          if (typeof req.body.images === "array") {
            images.push(req.body.images);
          } else {
            images = req.body.images;
          }
          const imagesLinks = [];

          for (let i = 0; i < images.length; i++) {
            if (typeof images[i] === "string") {
              const result = await cloudinary.v2.uploader.upload(images[i], {
                folder: "products",
              });
              imagesLinks.push({
                public_id: result.public_id,
                url: result.secure_url,
              });
            } else {
              imagesLinks.push(images[i]);
            }
          }
          productData.images = imagesLinks;
        }

        productData.shop = shop;
        const product = await Product.findByIdAndUpdate(
          req.body.id,
          productData
        );
        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);

router.patch(
  "/list",
  catchAsyncErrors(async (req, res) => {
    try {
      const { filter = "{}", pageNum = 1, pageSize = 10, sort = [] } = req.body;
      const parsedFilter = JSON.parse(filter);
      const filters = {};

      // Xử lý các điều kiện lọc từ parsedFilter
      if (parsedFilter.minPrice || parsedFilter.maxPrice) {
        filters.discountPrice = {
          $gte: parsedFilter.minPrice,
          $lte: parsedFilter.maxPrice,
        };
      }
      if (parsedFilter.keyword) {
        filters.name = { $regex: parsedFilter.keyword, $options: "i" };
      }
      if (parsedFilter.storage) {
        filters.storage = { $in: parsedFilter.storage };
      }
      if (parsedFilter.size) {
        filters.size = { $in: parsedFilter.size };
      }
      if (parsedFilter.category) {
        filters.category = { $in: parsedFilter.category };

      }
      if (parsedFilter.brand) {
        const shops = await Shop.find({ name: parsedFilter.brand });
        const shopIds = shops.map(shop => shop._id);

        // Thêm điều kiện lọc `shop` vào `filters`
        filters.shop = shops;
      }
      // console.log('shop',filters.shop);


      // Phân trang
      const limit = parseInt(pageSize, 10);
      const page = parseInt(pageNum, 10);
      const skip = (page - 1) * limit;

      // Sắp xếp
      const sortOptions = {};
      sort.forEach((sortField) => {
        const key = Object.keys(sortField)[0];
        sortOptions[key] = sortField[key] === "asc" ? 1 : -1;
      });
      const allProducts = await Product.find(filters)
      .populate("shop")
      .sort(sortOptions)
      
      // Truy vấn dữ liệu từ MongoDB với bộ lọc, phân trang và sắp xếp
      const products = await Product.find(filters)
      .populate("shop") // Populate để lấy dữ liệu shop đầy đủ
      .limit(limit)
      .skip(skip)
      .sort(sortOptions);
      // console.log(products);
      // Lọc ra các sản phẩm có `shop` hợp lệ (tức là `shop` có `name` trùng với `brand`)
      const filteredProducts = products.filter(product => product.shop);

      // Tổng số sản phẩm thỏa mãn bộ lọc
      const totalItems = filteredProducts.length;

      // Trả về kết quả
      res.json({
        totalProducts:allProducts.length,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        products: filteredProducts,
      });
    } catch (error) {
      console.log("error", error);
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });
      // console.log('check product', products);
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
//get product by Id
router.get(
  "/get-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const productData = await Product.findById(productId);

      console.log("product data", productData);

      if (!productData) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }

      res.status(201).json({
        product: productData,
        success: true,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
router.get(
  "/get-product-by-type",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const tags = req.query.tags;
      const products = await Product.find({ tags: tags });

      // console.log("product data", productData);

      // if (!productData) {
      //   return next(new ErrorHandler("Product is not found with this id", 404));
      // }

      res.status(201).json({
        products: products,
        success: true,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const productData = await Product.findById(productId);

      console.log("product data", productData);

      if (!productData) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }

      productData.images.forEach((imageUrl) => {
        const filename = imageUrl;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      });
      const product = await Product.findByIdAndDelete(productId);

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// log out user
router.get(
  "/logout",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Logged Out Successfully !",
      });
    } catch (err) {
      return next(new ErrorHandler(err.message, 500));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
