// routes/modelRoutes.js
const express = require('express');
const router = express.Router();
const GlobalModel = require('../models/GlobalModel');
const Bank = require('../models/Bank');
const { FraudDetectionModel } = require('../utils/mlUtils');

// Get current active global model
router.get('/current', async (req, res) => {
  try {
    const globalModel = await GlobalModel.findOne({ isActive: true })
      .populate('trainingRoundId');
    
    if (!globalModel) {
      return res.status(404).json({
        success: false,
        error: 'No active global model found'
      });
    }
    
    res.json({
      success: true,
      data: globalModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all model versions
router.get('/versions', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const models = await GlobalModel.find()
      .sort('-version')
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: models.length,
      data: models
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific model version
router.get('/version/:version', async (req, res) => {
  try {
    const model = await GlobalModel.findOne({ 
      version: parseInt(req.params.version) 
    }).populate('trainingRoundId');
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model version not found'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Evaluate model on bank data
router.post('/evaluate', async (req, res) => {
  try {
    const { bankId, modelVersion } = req.body;
    
    // Get bank
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return res.status(404).json({
        success: false,
        error: 'Bank not found'
      });
    }
    
    // Get model
    let model;
    if (modelVersion) {
      model = await GlobalModel.findOne({ version: modelVersion });
    } else {
      model = await GlobalModel.findOne({ isActive: true });
    }
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    // Evaluate
    const fraudModel = new FraudDetectionModel(model.weights);
    const accuracy = fraudModel.evaluate(bank.transactions);
    
    // Get per-class metrics
    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    bank.transactions.forEach(txn => {
      const prediction = fraudModel.predict({
        amount: txn.amount,
        time: txn.time,
        location: txn.location
      });
      const predictedClass = prediction > 0.5 ? 1 : 0;
      
      if (predictedClass === 1 && txn.isFraud === 1) truePositives++;
      else if (predictedClass === 0 && txn.isFraud === 0) trueNegatives++;
      else if (predictedClass === 1 && txn.isFraud === 0) falsePositives++;
      else if (predictedClass === 0 && txn.isFraud === 1) falseNegatives++;
    });
    
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    res.json({
      success: true,
      data: {
        bankName: bank.name,
        modelVersion: model.version,
        accuracy: accuracy.toFixed(2),
        metrics: {
          truePositives,
          trueNegatives,
          falsePositives,
          falseNegatives,
          precision: (precision * 100).toFixed(2),
          recall: (recall * 100).toFixed(2),
          f1Score: (f1Score * 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Predict fraud for new transaction
router.post('/predict', async (req, res) => {
  try {
    const { amount, time, location, modelVersion } = req.body;
    
    if (amount === undefined || time === undefined || location === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing transaction features (amount, time, location)'
      });
    }
    
    // Get model
    let model;
    if (modelVersion) {
      model = await GlobalModel.findOne({ version: modelVersion });
    } else {
      model = await GlobalModel.findOne({ isActive: true });
    }
    
    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }
    
    // Make prediction
    const fraudModel = new FraudDetectionModel(model.weights);
    const probability = fraudModel.predict({ amount, time, location });
    const prediction = probability > 0.5 ? 'FRAUD' : 'NORMAL';
    
    res.json({
      success: true,
      data: {
        modelVersion: model.version,
        transaction: { amount, time, location },
        fraudProbability: (probability * 100).toFixed(2),
        prediction,
        confidence: (Math.abs(probability - 0.5) * 200).toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compare model versions
router.post('/compare', async (req, res) => {
  try {
    const { version1, version2, bankId } = req.body;
    
    const model1 = await GlobalModel.findOne({ version: version1 });
    const model2 = await GlobalModel.findOne({ version: version2 });
    
    if (!model1 || !model2) {
      return res.status(404).json({
        success: false,
        error: 'One or both model versions not found'
      });
    }
    
    let comparisonData = {
      version1: {
        version: model1.version,
        averageAccuracy: model1.performance.averageAccuracy
      },
      version2: {
        version: model2.version,
        averageAccuracy: model2.performance.averageAccuracy
      }
    };
    
    // If bankId provided, evaluate on specific bank
    if (bankId) {
      const bank = await Bank.findById(bankId);
      if (bank) {
        const fraudModel1 = new FraudDetectionModel(model1.weights);
        const fraudModel2 = new FraudDetectionModel(model2.weights);
        
        comparisonData.version1.bankAccuracy = fraudModel1.evaluate(bank.transactions);
        comparisonData.version2.bankAccuracy = fraudModel2.evaluate(bank.transactions);
        comparisonData.bankName = bank.name;
      }
    }
    
    res.json({
      success: true,
      data: comparisonData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;