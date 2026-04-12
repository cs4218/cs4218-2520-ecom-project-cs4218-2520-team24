// Nam Dohyun
import { test } from '@playwright/test';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import slugify from 'slugify';

test.describe('Test group', () => {
  test('seed', async () => {
    dotenv.config();
    
    // Connect to the actual database
    const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/cs4218';
    await mongoose.connect(mongoUrl);
    
    try {
      // Create Electronics category if it doesn't exist to keep DB intact
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

      // Create Smartphone product if it doesn't exist
      let product = await Product.findOne({ slug: 'smartphone' });
      if (!product) {
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

      // Create Tablet product if it doesn't exist (for similar products testing)
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
    } finally {
      // Always disconnect after seeding
      await mongoose.disconnect();
    }
  });
});
