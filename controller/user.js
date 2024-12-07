const express = require("express");
const path = require("path");
const router = express.Router();
const User = require("../model/user");
const { upload } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
require("dotenv").config({ path: "config/.env" });
const cloudinary = require("cloudinary");

const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const sendMail = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

router.post("/create-user", async (req, res, next) => {
  try {
    const { name, email, password, avatar } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      // const filename = req.file.filename;
      // const filePath = `uploads/${filename}`;

      // fs.unlink is a Node. js function used to delete a file from the filesystem.
      // It's part of the fsmodule, which provides an interface for
      //interacting with the file system.
      // fs.unlink(filePath, (err) => {
      //   if (err) {
      //     console.log(err);
      //     res.status(500).json({ message: "Error deleting file" });
      //   }
      // });

      //  res.status(400).json({ message: "User already exists" });
       return next(new ErrorHandler("User already exists", 400));
    }
    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });

    // const filename = req.file.filename;
    // const fileUrl = path.join(filename);
    const user = {
      name: name,
      email: email,
      password: password,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
    };
    // console.log('user',user);
    const activationToken = createActivationToken(user);
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;

    console.log("check", activationUrl);
    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to active your account: ${activationUrl}`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email: ${user.email} to activate your account`,
      });
    } catch (error) {
      // console.log("Error", error);
      return next(new ErrorHandler(error.message, 500));
    }

    // console.log(user);
    // const newUser = await User.create(user);
    // res.status(201).json({
    //     success: true,
    //     newUser,

    // })
  } catch (error) {
    // console.log("error 1", error);
    return next(new ErrorHandler(error.message, 500));
  }
});

// Crete Activation Token
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, { expiresIn: "5m" });
};

router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );
      // console.log("check secret", process.env.ACTIVATION_SECRET);
      if (!newUser) {
        return next(new ErrorHandler("Invalid Activation Link", 400));
      }
      // console.log("check user", newUser);

      // console.log("check activation", activation_token);

      const { name, email, password, avatar } = newUser;

      let user = await User.findOne({ email });
      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }

      user = await User.create({
        name,
        email,
        avatar,
        password,
      });
      // console.log("check activation", user);
      sendToken(user, 201, res);
    } catch (error) {
      // console.log(error);
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// login user
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Please Provide The All Fields!" });

        //return next(new ErrorHandler("!", 400));
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(400).json({ message: "User Doesn't Exist !" });

        return next(new ErrorHandler("", 400));
      }

      const isPasswordValid = await user.comparePassword(password);
      // const isPasswordValid = user.password.find(
      //   (passwordEnter) => passsword === passwordEnter
      // );
      if (!isPasswordValid) {
        return res
          .status(400)
          .json({ message: "Please Provide Correct Informations !" });
      }

      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// load user

router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (err) {
      return next(new ErrorHandler(err.message, 500));
    }
  })
);

// log out user
router.get(
  "/logout",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
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

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      console.log(error.message);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let existsUser = await User.findById(req.user.id);
      // const existAvatarPath = `uploads/${existsUser.avatar}`;
      // fs.unlinkSync(existAvatarPath);

      // const fileUrl = path.join(req.file.filename);
      // const user = await User.findByIdAndUpdate(req.user.id, {
      //   avatar: fileUrl,
      // });
      if (req.body.avatar !== "") {
        if (existsUser.avatar?.public_id && existsUser.avatar?.url) {
          const imageId = existsUser.avatar.public_id;
          await cloudinary.v2.uploader.destroy(imageId);
        }
        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: "avatars",
          width: 150,
        });
        existsUser.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      await existsUser.save();

      res.status(200).json({
        success: true,
        user: existsUser,
      });
    } catch (error) {
      // console.log("log", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      // const user = await User.findById(req.);

      // if (!user) {
      //   return next(
      //     new ErrorHandler("User is not available with this id", 400)
      //   );
      // }

      // const imageId = user.avatar.public_id;

      // await cloudinary.v2.uploader.destroy(imageId);

      let existsUser = await User.findById(req.params.id);
      const existAvatarPath = `uploads/${existsUser.avatar}`;
      fs.unlinkSync(existAvatarPath);

      // const fileUrl = path.join(req.file.filename);

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
