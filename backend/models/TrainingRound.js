// models/TrainingRound.js - Training Round Schema
const mongoose = require('mongoose');

const bankUpdateSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: true
  },
  bankName: String,
  gradients: {
    w1: Number,
    w2: Number,
    w3: Number,
    bias: Number
  },
  dataSize: Number,
  accuracy: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const trainingRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'training', 'aggregating', 'completed', 'failed'],
    default: 'pending'
  },
  bankUpdates: [bankUpdateSchema],
  globalModel: {
    weights: {
      w1: Number,
      w2: Number,
      w3: Number,
      bias: Number
    },
    averageAccuracy: Number,
    updatedAt: Date
  },
  startTime: Date,
  endTime: Date,
  duration: Number // in milliseconds
}, {
  timestamps: true
});

// Calculate duration before saving
trainingRoundSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = this.endTime - this.startTime;
  }
  next();
});

module.exports = mongoose.model('TrainingRound', trainingRoundSchema);