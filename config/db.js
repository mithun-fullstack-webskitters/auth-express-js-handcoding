import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  //   console.log(process.env.MONGODB_URI, "@@");
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Mongodb connected ${connection.connection.host}`);
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

export default connectDB;
