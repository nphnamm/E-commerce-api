const request = require("supertest");
const app = require("../../app"); // Import app từ file chính của bạn
const mongoose = require("mongoose");
const User = require("../../model/user");
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
let testUserEmail = "testuser@example.com";
let testPassword = "test1234";

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
  describe("POST /create-user", () => {
    it("should register a new user and send an activation email", async () => {
      const res = await request(app).post("/api/v2/user/create-user").send({
        name: "Test User",
        email: testUserEmail,
        password: testPassword,
        avatar: "mock_avatar_data",
      });

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
        email: "testuser@example.com",
        subject: "Activate your account",
        message: expect.stringContaining(
          "please click on the link to active your account"
        ),
      });
      // Lưu activation token để sử dụng trong bài test kích hoạt
      activationToken = jwt.sign(
        { email: testUserEmail, password: testPassword, name: "Test User" },
        process.env.ACTIVATION_SECRET,
        { expiresIn: "5m" }
      );
    });
  });

  // Kiểm tra chức năng kích hoạt tài khoản
  describe("POST /activation", () => {
    it("should activate the user account", async () => {
      console.log(activationToken);
      const res = await request(app)
        .post("/api/v2/user/activation")
        .send({ activation_token: activationToken });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const user = await User.findOne({ email: testUserEmail });
      expect(user).toBeDefined();
      testUserId = user._id;
    });

    it("should not activate with invalid token", async () => {
      const res = await request(app)
        .post("/api/v2/user/activation")
        .send({ activation_token: "invalid_token" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("jwt malformed");
    });
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
      const res = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined(); // JWT token
    });

    it("should not login with correct password", async () => {
      const res = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: "wrongpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Please Provide Correct Informations");
    });
    it("should not login with correct email", async () => {
      const res = await request(app).post("/api/v2/user/login-user").send({
        email: "wrongEmailPassword",
        password: testPassword,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("User Doesn't Exist");
    });

    it("should not login with incorrect ", async () => {
      const res = await request(app).post("/api/v2/user/login-user").send({
        email: "wrongEmailPassword",
        password: "wrongpassword",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("User Doesn't Exist");
    });
  });

  describe("GET /getuser", () => {
    it("should return user data using cookie for authentication", async () => {
      // Đăng nhập để lấy token
      const loginRes = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(loginRes.statusCode).toBe(201);
      const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập

      // Thêm token vào cookie
      const res = await request(app)
        .get("/api/v2/user/getuser")
        .set("Cookie", [`token=${token}`]); // Gửi cookie trong yêu cầu

      // Kiểm tra kết quả
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUserEmail);
    });
  });

  // Cập nhật thông tin người dùng
  describe("PUT /update-user-info", () => {
    it("should update user information", async () => {
      const loginRes = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(loginRes.statusCode).toBe(201);
      const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập
      const res = await request(app)
        .put("/api/v2/user/update-user-info")
        .send({
          email: testUserEmail,
          password: testPassword,
          phoneNumber: "0977187016",
          name: "Updated User",
        })
        .set("Cookie", [`token=${token}`]);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe("Updated User");
    });
  });

  // Cập nhật avatar người dùng
  describe("PUT /update-avatar", () => {
    it("should update user avatar", async () => {
      const loginRes = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(loginRes.statusCode).toBe(201);
      const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập

      const res = await request(app)
        .put("/api/v2/user/update-avatar")
        .send({ avatar: "new_mock_avatar_data" })
        .set("Cookie", [`token=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(require("cloudinary").v2.uploader.upload).toHaveBeenCalledWith(
        "mock_avatar_data",
        { folder: "avatars" }
      );
    });
  });

  // Cập nhật địa chỉ người dùng
  describe("PUT /update-user-addresses", () => {
    it("should add a new address", async () => {
      const loginRes = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(loginRes.statusCode).toBe(201);
      const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập

      const res = await request(app)
        .put("/api/v2/user/update-user-addresses")
        .send({
          addressType: "Home",
          country: "USA",
          city: "NY",
          address1: "123 Street",
          zipCode: "10001",
        })
        .set("Cookie", [`token=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.addresses.length).toBeGreaterThan(0);
    });
  });

  // // Xóa địa chỉ người dùng
  // describe("DELETE /delete-user-address/:id", () => {
  //   it("should delete the user address", async () => {
  //     const loginRes = await request(app).post("/api/v2/user/login-user").send({
  //       email: testUserEmail,
  //       password: testPassword,
  //     });

  //     expect(loginRes.statusCode).toBe(201);
  //     const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập

  //     const addressId = user.addresses[0]._id;

  //     const res = await request(app)
  //       .delete(`/api/v2/user/delete-user-address/${addressId}`)
  //       .set("Cookie", [`token=${token}`])

  //     expect(res.statusCode).toBe(200);
  //     expect(res.body.success).toBe(true);
  //   });
  // });

  // Cập nhật mật khẩu người dùng
  describe("PUT /update-user-password", () => {
    it("should update the user password", async () => {
      const loginRes = await request(app).post("/api/v2/user/login-user").send({
        email: testUserEmail,
        password: testPassword,
      });

      expect(loginRes.statusCode).toBe(201);
      const token = loginRes.body.token; // JWT token nhận được sau khi đăng nhập

      const res = await request(app)
        .put("/api/v2/user/update-user-password")
        .send({
          oldPassword: testPassword,
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        })
        .set("Cookie", [`token=${token}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
