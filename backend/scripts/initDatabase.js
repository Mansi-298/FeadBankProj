// scripts/initDatabase.js - Initialize Database with Demo Data
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bank = require('../models/Bank');
const { generateTransactionData } = require('../utils/mlUtils');

dotenv.config();

const initDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/federated_learning', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await Bank.deleteMany({});
    console.log('🗑️  Cleared existing banks');
    
    // Create demo banks
    const demoBanks = [
      { name: 'Bank A', color: '#3B82F6', transactionCount: 100 },
      { name: 'Bank B', color: '#10B981', transactionCount: 120 },
      { name: 'Bank C', color: '#F59E0B', transactionCount: 80 }
    ];
    
    console.log('\n📊 Creating demo banks...\n');
    
    for (const bankData of demoBanks) {
      const transactions = generateTransactionData(bankData.name, bankData.transactionCount);
      
      const bank = await Bank.create({
        name: bankData.name,
        color: bankData.color,
        transactions,
        localModel: {
          weights: {
            w1: Math.random() * 0.1,
            w2: Math.random() * 0.1,
            w3: Math.random() * 0.1,
            bias: Math.random() * 0.1
          },
          lastUpdated: new Date()
        }
      });
      
      console.log(`✅ Created ${bank.name}:`);
      console.log(`   - Transactions: ${bank.statistics.totalTransactions}`);
      console.log(`   - Fraud Cases: ${bank.statistics.fraudCount}`);
      console.log(`   - Normal: ${bank.statistics.normalCount}\n`);
    }
    
    console.log('🎉 Database initialized successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();