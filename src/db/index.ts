import mongoose from 'mongoose';
import { env } from '../env';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
        // Exit process with failure
        process.exit(1);
    }
};
const closeDBConnection = async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    } catch (error) {
        console.error(`Error closing MongoDB connection: ${(error as Error).message}`);
    }
}

export  {connectDB, closeDBConnection};