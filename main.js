import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello bro!");
});

app.listen(PORT, () => {
  console.log(`PORT is listening at ${PORT}`);
});
