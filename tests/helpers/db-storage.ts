import fs from 'fs';
import os from 'os';
import path from 'path';

const STORAGE_PATH = path.join(os.tmpdir(), 'playwright-mongo-config.json');

export const DbStorage = {
  saveUri(uri: string) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify({ uri }), 'utf-8');
  },

  getUri(): string {
    if (!fs.existsSync(STORAGE_PATH)) return process.env.MONGO_URL || '';
    const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
    return data.uri;
  },

  cleanup() {
    if (fs.existsSync(STORAGE_PATH)) fs.unlinkSync(STORAGE_PATH);
  }
};