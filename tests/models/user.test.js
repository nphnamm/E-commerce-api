const mongoose = require("mongoose");
const User = require("../../model/user");
const bcrypt = require("bcryptjs");
require('dotenv').config({ path: '.env.test' });

describe("User Model Test", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });


  it("should hash password before saving", async () => {
    const user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      avatar:{
        public_id: "test-avatar",
        url: "https://example.com/avatar.jpg"
      }
    });

    await user.save();
    const savedUser = await User.findOne({ email: "test@example.com" }).select("+password");;
    const isPasswordHashed = await bcrypt.compare("password123", savedUser.password);

    expect(isPasswordHashed).toBe(true);
  });

  it("should generate JWT token", () => {
    const user = new User({name: "Test" });
    const token = user.getJwtToken(); 

    expect(typeof token).toBe("string");
  });
});
