const app = require("./app");
const connectDatabase = require("./db/Database");
const cloudinary = require("cloudinary");

// handling uncaught exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server for handling uncaught exception`);
});

// if (process.env.NODE_ENV === "PRODUCTION") {
//   require("dotenv").config({ path: ".env" });
// }

// const dotenv = require("dotenv");

// //config

// dotenv.config({path:"backend/config/config.env"});

// app.listen(process.env.PORT,()=>{
//     console.log("Server is running on port "+process.env.PORT);
// })

// Connection Database
app.use("/",(req,res)=>{
  res.send("Hello world");
})
connectDatabase();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});
process.on("unhabledRejection", (err) => {
  {
    console.log(`Shutting down the server for ${err.message}`);
    console.log(`Shutting down the server for unhandle Promise rejection`);

    server.close(() => {
      process.exit(1);
    });
  }
});
