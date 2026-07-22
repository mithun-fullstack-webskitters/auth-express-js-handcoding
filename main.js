import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoute from "./route/auth.route.js";
import cors from "cors";
import crypto from "crypto-js";
import sign from "jwt-encode";

connectDB();
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const access_key = "a7ac3cfc46eb2ba0258e047fefead62a637b8de06653acf06f671aa4eb0ef6bfdd9ffbe7d8da1ced";
const secret_key = "a8c9fb0264a07152b1f7490cad5289e2e13a697420499c45dce838eb6f82b5454cff6fbf8675bae2";

let headers = {
  access_key: access_key,
}

let payload = {
  path: '/callbacks/0af126b0-e4cc-41d8-b8b0-d0f7423ae29a',
  content: crypto.SHA256().toString(crypto.enc.Hex),
}

let token = sign(payload, secret_key, headers)

console.log(token);


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server running successfully!",
  });
});

app.use("/api/auth/", authRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PORT is listening at ${PORT}`);
});
