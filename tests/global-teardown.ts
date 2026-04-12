import { stopMongo } from './mongodb-manager';

async function globalTeardown() {
  const pid = (global as any).__SERVER_PID;
  if (pid) {
    // The minus sign kills the entire process group (npm + node + client)
    try { process.kill(-pid); } catch (e) {} 
  }
  await stopMongo();
}

export default globalTeardown;
