import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello bro!");
});

app.listen("3000", () => {
  console.log("Port is listening at 3000");
});
