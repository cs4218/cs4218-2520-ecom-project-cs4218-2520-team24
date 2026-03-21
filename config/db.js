import mongoose from "mongoose";
import colors from "colors";
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);
        const host = conn.connection.host;
        const port = conn.connection.port;
        console.log(`Connected To Mongodb Database ${host}${port ? `:${port}` : ""}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
    }
};

export default connectDB;