const request = require("supertest");
const app = require("../../app"); // Import app từ file chính của bạn
const mongoose = require("mongoose");
const Shop = require("../../model/shop");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: ".env.test" });

afterAll(async () => {
  await mongoose.connection.close();
});
console.log("Database connection status:", mongoose.connection.readyState); // 1 means connected

// beforeEach(async () => {
//   await User.deleteMany({}); // Clear data before each test
// });

// Khởi tạo biến lưu trữ để sử dụng trong các bài test
let activationToken;
let testShopEmail = "testShop@example.com";
let testPassword = "test1234";
let testAddress ="1 Lê Lợi, Quận 1";
let testPhoneNumber = "0559515293"
let testZipCode ="90000";
let token;

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: "mocked_public_id",
        secure_url: "http://mocked_url.com/avatar.jpg",
      }),
      destroy: jest.fn().mockResolvedValue({
        result: "ok",
      }),
    },
  },
}));

// Mock `sendMail` trực tiếp trong file test
const sendMail = require("../../utils/sendMail");
jest.mock("../../utils/sendMail", () =>
  jest.fn().mockResolvedValue("Email sent successfully")
);
// Thiết lập các bài test cho chức năng đăng ký, kích hoạt và đăng nhập
describe("Auth Routes", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // Kiểm tra chức năng đăng ký người dùng
  describe("POST /create-shop", () => {
    it("should register a new user and send an activation email", async () => {
      const res = await request(app).post("/api/v2/shop/create-shop").send({
        name: "Test Shop",
        email: testShopEmail,
        password: testPassword,
        avatar: "mock_avatar_data",
        address: testAddress,
        phoneNumber: testPhoneNumber,
        zipCode: testZipCode
      });

      // console.log('active', activationToken)
      console.log(res.body.activationToken);
       activationToken = res.body.activationToken;
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("please check your email");
      // Kiểm tra các mock function đã được gọi đúng cách
      expect(require("cloudinary").v2.uploader.upload).toHaveBeenCalledWith(
        "mock_avatar_data",
        { folder: "avatars" }
      );
      // Kiểm tra các mock function đã được gọi đúng cách
      // Kiểm tra các mock function đã được gọi đúng cách

      expect(sendMail).toHaveBeenCalledWith({
        email: "testShop@example.com",
        subject: "Activate your shop",
        message: expect.stringContaining(
          "please click on the link to active your account"
        ),
      });
      // Lưu activation token để sử dụng trong bài test kích hoạt

    });
  });

  // Kiểm tra chức năng kích hoạt tài khoản
  describe("POST /activation", () => {
    it("should activate the user account", async () => {
      console.log(activationToken);
      const res = await request(app)
        .post("/api/v2/shop/activation")
        .send({ activation_token: activationToken });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const shop = await Shop.findOne({ email: testShopEmail });
      expect(shop).toBeDefined();
      testUserId = shop._id;
    });

    // it("should not activate with invalid token", async () => {
    //   const res = await request(app)
    //     .post("/api/v2/shop/activation")
    //     .send({ activation_token: "invalid_token" });

    //   expect(res.statusCode).toBe(400);
    //   expect(res.body.message).toContain("jwt malformed");
    // });
  });

  // describe("POST /create-duplicate-user", () => {
  //   it("should return error if email already exists", async () => {
  //     const res = await request(app).post("/api/v2/user/create-user").send({
  //       name: "Duplicate User",
  //       email: testUserEmail,
  //       password: testPassword,
  //       avatar: "mock_avatar_data",
  //     });

  //     expect(res.statusCode).toBe(400);
  //     expect(res.body.message).toContain("User already exists");
  //   });
  // });

  // Kiểm tra chức năng đăng nhập
  describe("POST /login-user", () => {
    it("should login the user with valid credentials", async () => {
      const res = await request(app).post("/api/v2/shop/login-shop").send({
        email: testShopEmail,
        password: testPassword,
      });
      console.log(res.body);
      token = res.body.token;
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined(); // JWT token
    });

    it("should not login with incorrect credentials", async () => {
      const res = await request(app).post("/api/v2/shop/login-shop").send({
        email: testShopEmail,
        password: "wrongpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Please provide the correct information");
    });
  });

  describe("GET /getuser", () => {
    it("should return user data using cookie for authentication", async () => {
      // Đăng nhập để lấy token
      // const loginRes = await request(app).post("/api/v2/shop/login-shop").send({
      //   email: testShopEmail,
      //   password: testPassword,
      // });

      // expect(loginRes.statusCode).toBe(201);
      // const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập
      // console.log('isSeller',token);
      
      // Thêm token vào cookie
      console.log('getuser',token)
      const res = await request(app)
        .get("/api/v2/shop/getSeller")
        .set("Cookie", [`seller_token=${token}`]); // Gửi cookie trong yêu cầu

      // Kiểm tra kết quả
      expect(res.body.success).toBe(true);
      expect(res.body.seller).toBeDefined();
      expect(res.body.seller.email).toBe(testShopEmail);
    });
  });

//   // Cập nhật thông tin người dùng
});
