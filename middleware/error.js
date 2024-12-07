const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server Error";
  // wrong mongo db id error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
  }
  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }
  // Wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Your url is invalid please try again later`;
    err = new ErrorHandler(message, 400);
  }
  //JWT expired
  if (err.name === "TokenExpiredError") {
    const message = `Your url is expired please try again later`;
    err = new ErrorHandler(message, 400);
  }
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
