import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoute from "./route/auth.route.js";
import cors from "cors";
import errorHandler from "./middleware/error.middleware.js";

connectDB();
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server running successfully!",
  });
});

app.use("/api/auth/", authRoute);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PORT is listening at ${PORT}`);
});
