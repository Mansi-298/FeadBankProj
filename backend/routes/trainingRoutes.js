// routes/trainingRoutes.js
const express = require('express');
const router = express.Router();
const Bank = require('../models/Bank');
const TrainingRound = require('../models/TrainingRound');
const GlobalModel = require('../models/GlobalModel');
const { FraudDetectionModel, federatedAveraging } = require('../utils/mlUtils');

// Start new training round
router.post('/start', async (req, res) => {
  try {
    const banks = await Bank.find();
    
    if (banks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No banks available for training'
      });
    }
    
    // Get latest round number
    const latestRound = await TrainingRound.findOne().sort('-roundNumber');
    const roundNumber = latestRound ? latestRound.roundNumber + 1 : 1;
    
    // Create new training round
    const trainingRound = await TrainingRound.create({
      roundNumber,
      status: 'pending',
      startTime: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: trainingRound
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bank submits local training update
router.post('/submit-update', async (req, res) => {
  try {
    const { roundId, bankId, gradients, dataSize } = req.body;
    
    // Validate inputs
    if (!roundId || !bankId || !gradients || !dataSize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Find training round
    const trainingRound = await TrainingRound.findById(roundId);
    if (!trainingRound) {
      return res.status(404).json({
        success: false,
        error: 'Training round not found'
      });
    }
    
    // Find bank
    const bank = await Bank.findById(bankId);
    if (!bank) {
      return res.status(404).json({
        success: false,
        error: 'Bank not found'
      });
    }
    
    // Calculate accuracy
    const model = new FraudDetectionModel(bank.localModel.weights);
    model.updateWeights(gradients);
    const accuracy = model.evaluate(bank.transactions);
    
    // Update bank's local model
    bank.localModel.weights = model.getWeights();
    bank.localModel.lastUpdated = new Date();
    bank.statistics.currentAccuracy = accuracy;
    await bank.save();
    
    // Add update to training round
    trainingRound.bankUpdates.push({
      bankId: bank._id,
      bankName: bank.name,
      gradients,
      dataSize,
      accuracy,
      timestamp: new Date()
    });
    
    trainingRound.status = 'training';
    await trainingRound.save();
    
    res.json({
      success: true,
      data: {
        trainingRound,
        accuracy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Aggregate updates and create global model
router.post('/aggregate/:roundId', async (req, res) => {
  try {
    const trainingRound = await TrainingRound.findById(req.params.roundId);
    
    if (!trainingRound) {
      return res.status(404).json({
        success: false,
        error: 'Training round not found'
      });
    }
    
    if (trainingRound.bankUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No bank updates to aggregate'
      });
    }
    
    // Update status
    trainingRound.status = 'aggregating';
    await trainingRound.save();
    
    // Perform federated averaging
    const avgGradients = federatedAveraging(trainingRound.bankUpdates);
    
    // Get current global model or create new one
    let currentGlobalModel = await GlobalModel.findOne({ isActive: true });
    
    const model = new FraudDetectionModel(
      currentGlobalModel ? currentGlobalModel.weights : undefined
    );
    model.updateWeights(avgGradients);
    const newWeights = model.getWeights();
    
    // Calculate average accuracy
    const avgAccuracy = trainingRound.bankUpdates.reduce(
      (sum, u) => sum + u.accuracy, 0
    ) / trainingRound.bankUpdates.length;
    
    const totalDataPoints = trainingRound.bankUpdates.reduce(
      (sum, u) => sum + u.dataSize, 0
    );
    
    // Create new global model version
    const newVersion = currentGlobalModel ? currentGlobalModel.version + 1 : 1;
    const globalModel = await GlobalModel.create({
      version: newVersion,
      weights: newWeights,
      performance: {
        averageAccuracy: avgAccuracy,
        participatingBanks: trainingRound.bankUpdates.length,
        totalDataPoints
      },
      trainingRoundId: trainingRound._id,
      isActive: true
    });
    
    // Update training round
    trainingRound.globalModel = {
      weights: newWeights,
      averageAccuracy: avgAccuracy,
      updatedAt: new Date()
    };
    trainingRound.status = 'completed';
    trainingRound.endTime = new Date();
    await trainingRound.save();
    
    res.json({
      success: true,
      data: {
        trainingRound,
        globalModel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get training round history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const history = await TrainingRound.find()
      .sort('-roundNumber')
      .limit(parseInt(limit))
      .select('-bankUpdates');
    
    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific training round details
router.get('/:roundId', async (req, res) => {
  try {
    const trainingRound = await TrainingRound.findById(req.params.roundId)
      .populate('bankUpdates.bankId', 'name color');
    
    if (!trainingRound) {
      return res.status(404).json({
        success: false,
        error: 'Training round not found'
      });
    }
    
    res.json({
      success: true,
      data: trainingRound
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current training status
router.get('/status/current', async (req, res) => {
  try {
    const activeRound = await TrainingRound.findOne({
      status: { $in: ['pending', 'training', 'aggregating'] }
    }).sort('-roundNumber');
    
    const latestCompletedRound = await TrainingRound.findOne({
      status: 'completed'
    }).sort('-roundNumber');
    
    const globalModel = await GlobalModel.findOne({ isActive: true });
    
    res.json({
      success: true,
      data: {
        activeRound,
        latestCompletedRound,
        globalModel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;