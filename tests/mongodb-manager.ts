import { MongoMemoryServer } from 'mongodb-memory-server';
import { DbStorage } from './helpers/db-storage';

let mongoServer: MongoMemoryServer;

export async function startMongo() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URL = uri;
    DbStorage.saveUri(uri);
  }
  return mongoServer;
}

export async function stopMongo() {
  if (mongoServer) {
    await mongoServer.stop();
    DbStorage.cleanup();
  }
}

export function getMongoUri() {
  // 1. Check if the server is running in the CURRENT process (Global Setup)
  if (mongoServer) return mongoServer.getUri();
  
  // 2. Check if Playwright passed it via ENV (Workers)
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  
  // 3. Fallback: Read from the temp file created by DbStorage (Workers)
  return DbStorage.getUri(); 
}