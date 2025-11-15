// models/Bank.js - Bank Schema
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  time: {
    type: Number,
    required: true
  },
  location: {
    type: Number,
    required: true
  },
  isFraud: {
    type: Number,
    required: true,
    enum: [0, 1]
  }
});

const bankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  transactions: [transactionSchema],
  localModel: {
    weights: {
      w1: { type: Number, default: 0 },
      w2: { type: Number, default: 0 },
      w3: { type: Number, default: 0 },
      bias: { type: Number, default: 0 }
    },
    lastUpdated: Date
  },
  statistics: {
    totalTransactions: { type: Number, default: 0 },
    fraudCount: { type: Number, default: 0 },
    normalCount: { type: Number, default: 0 },
    currentAccuracy: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Calculate statistics before saving
bankSchema.pre('save', function(next) {
  if (this.transactions && this.transactions.length > 0) {
    this.statistics.totalTransactions = this.transactions.length;
    this.statistics.fraudCount = this.transactions.filter(t => t.isFraud === 1).length;
    this.statistics.normalCount = this.transactions.length - this.statistics.fraudCount;
  }
  next();
});

module.exports = mongoose.model('Bank', bankSchema);