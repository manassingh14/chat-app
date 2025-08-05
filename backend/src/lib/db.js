import mongoose from "mongoose";
import dotenv from "dotenv";
export const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } 
    catch (error){
        console.log("MongoDB coneection error:",error);
    }

};
