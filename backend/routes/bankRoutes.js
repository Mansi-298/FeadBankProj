// routes/bankRoutes.js
const express = require('express');
const router = express.Router();
const Bank = require('../models/Bank');
const { generateTransactionData } = require('../utils/mlUtils');

// Get all banks
router.get('/', async (req, res) => {
  try {
    const banks = await Bank.find();
    res.json({
      success: true,
      count: banks.length,
      data: banks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single bank with transactions
router.get('/:id', async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id);
    
    if (!bank) {
      return res.status(404).json({
        success: false,
        error: 'Bank not found'
      });
    }
    
    res.json({
      success: true,
      data: bank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new bank
router.post('/', async (req, res) => {
  try {
    const { name, color, transactionCount } = req.body;
    
    // Check if bank already exists
    const existingBank = await Bank.findOne({ name });
    if (existingBank) {
      return res.status(400).json({
        success: false,
        error: 'Bank with this name already exists'
      });
    }
    
    // Generate synthetic transaction data
    const transactions = generateTransactionData(name, transactionCount || 100);
    
    const bank = await Bank.create({
      name,
      color: color || '#3B82F6',
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
    
    res.status(201).json({
      success: true,
      data: bank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize demo banks
router.post('/init-demo', async (req, res) => {
  try {
    // Delete existing banks
    await Bank.deleteMany({});
    
    const demoBanks = [
      { name: 'Bank A', color: '#3B82F6', transactionCount: 100 },
      { name: 'Bank B', color: '#10B981', transactionCount: 120 },
      { name: 'Bank C', color: '#F59E0B', transactionCount: 80 }
    ];
    
    const createdBanks = [];
    
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
      
      createdBanks.push(bank);
    }
    
    res.status(201).json({
      success: true,
      message: 'Demo banks initialized successfully',
      data: createdBanks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update bank statistics
router.patch('/:id/statistics', async (req, res) => {
  try {
    const { currentAccuracy } = req.body;
    
    const bank = await Bank.findByIdAndUpdate(
      req.params.id,
      { 'statistics.currentAccuracy': currentAccuracy },
      { new: true }
    );
    
    if (!bank) {
      return res.status(404).json({
        success: false,
        error: 'Bank not found'
      });
    }
    
    res.json({
      success: true,
      data: bank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete bank
router.delete('/:id', async (req, res) => {
  try {
    const bank = await Bank.findByIdAndDelete(req.params.id);
    
    if (!bank) {
      return res.status(404).json({
        success: false,
        error: 'Bank not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Bank deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;