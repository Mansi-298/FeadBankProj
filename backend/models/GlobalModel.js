// models/GlobalModel.js - Global Model Schema
const mongoose = require('mongoose');

const globalModelSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true,
    unique: true
  },
  weights: {
    w1: {
      type: Number,
      required: true,
      default: 0.05
    },
    w2: {
      type: Number,
      required: true,
      default: 0.05
    },
    w3: {
      type: Number,
      required: true,
      default: 0.05
    },
    bias: {
      type: Number,
      required: true,
      default: 0.05
    }
  },
  performance: {
    averageAccuracy: Number,
    participatingBanks: Number,
    totalDataPoints: Number
  },
  trainingRoundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingRound'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Only one active model at a time
globalModelSchema.pre('save', async function(next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

module.exports = mongoose.model('GlobalModel', globalModelSchema);