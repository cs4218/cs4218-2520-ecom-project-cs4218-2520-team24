import { startMongo } from './mongodb-manager';
import mongoose from 'mongoose';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import http from 'http';
import { spawn } from 'child_process';
import userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';

async function globalSetup() {
  console.log('Starting Global MongoMemoryServer...');
  const mongoServer = await startMongo();
  const uri = mongoServer.getUri();
  console.log(`MongoMemoryServer started at: ${uri}`);

  // Seed data
  await mongoose.connect(uri);
  try {
    console.log('--- SEEDING START ---');

    // 1. Seed Category
    let category = await Category.findOne({ slug: 'electronics' });
    if (!category) {
      category = await new Category({
        name: 'Electronics',
        slug: 'electronics',
      }).save();
      console.log('Seeded Category: Electronics');
    } else {
      console.log('Category already exists: Electronics');
    }

    // 2. Seed Smartphone
    let smartphone = await Product.findOne({ slug: 'smartphone' });
    if (!smartphone) {
      await new Product({
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'A very smart phone for the test',
        price: 999,
        category: category._id,
        quantity: 10,
        shipping: true
      }).save();
      console.log('Seeded Product: Smartphone');
    } else {
      console.log('Product already exists: Smartphone');
    }

    // 3. Seed Tablet
    let tablet = await Product.findOne({ slug: 'tablet' });
    if (!tablet) {
      await new Product({
        name: 'Tablet',
        slug: 'tablet',
        description: 'A great tablet for testing similar products',
        price: 599,
        category: category._id,
        quantity: 15,
        shipping: true
      }).save();
      console.log('Seeded Product: Tablet');
    } else {
      console.log('Product already exists: Tablet');
    }

    // 4. Seed Admin User
      const adminEmail = process.env.ADMIN_EMAIL ?? "a@a.com";
      const adminPassword = process.env.ADMIN_PASSWORD ?? "password";

      let admin = await userModel.findOne({ email: adminEmail });
      if (!admin) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await new userModel({
              name: "Admin",
              email: adminEmail,
              password: hashedPassword,
              phone: "12345678",
              address: "Test Address",
              answer: "test",
              role: 1,
          }).save();
          console.log('Seeded Admin User:', adminEmail);
      } else {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await userModel.findByIdAndUpdate(admin._id, {
              role: 1,
              password: hashedPassword,
          });
          console.log('Updated existing user to admin:', adminEmail);
      }
    
    console.log('--- SEEDING END ---');
  } finally {
    await mongoose.disconnect();
  }
    if (process.env.PW_EXTERNAL_SERVER === 'true') {
      console.log('ℹ️  Using external dev server for Playwright.');
    } else {
      console.log('🚀 Launching WebServer...');
      // 1. USE SHELL INJECTION (The most robust way)
      const serverProcess = spawn(`PLAYWRIGHT=true MONGO_URL="${uri}" npm run dev`, {
        shell: true,
        stdio: 'inherit',
        detached: true
      });

      // Store the PID globally for teardown
      (global as any).__SERVER_PID = serverProcess.pid;
    }
    await Promise.all([
      waitForServer('http://localhost:3000'), // Check UI
      waitForServer('http://localhost:6060/api/v1/category/get-category') // Check API
    ]);
    console.log('✅ System Ready. Handing over to Playwright...');
}

// Simple helper to wait for the React/Node app to respond
function waitForServer(url: string) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve(true);
        }
      }).on('error', () => {});
    }, 500);
  });
}

export default globalSetup;
