import mongoose from "mongoose";
import colors from "colors";
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 2000,
            socketTimeoutMS: 3000,
            maxPoolSize: 3,
            waitQueueTimeoutMS: 1000,
        });
        const host = conn.connection.host;
        const port = conn.connection.port;
        console.log(`Connected To Mongodb Database ${host}${port ? `:${port}` : ""}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

export default connectDB;