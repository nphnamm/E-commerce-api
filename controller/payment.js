const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const stripe = require('stripe')('sk_test_51PYKQtKvZ8GzQADcyjUg0RpQOM5MsxqM9jBjTzML6Yh7qeLUiOKbscvnjbTWQzgLI2EHlBnMSGe4nVmsSPvdriFW00KvZRCH83');
router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    const myPayment = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "vnd",
      metadata: {
        company: "Shopii",
      },
    });
    res.status(200).json({
      success: true,
      client_secret: myPayment.client_secret,
    });
  })
);

router.get(
  "/stripeapikey",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({ stripeApikey: process.env.STRIPE_API_KEY });
  })
);

module.exports = router;
