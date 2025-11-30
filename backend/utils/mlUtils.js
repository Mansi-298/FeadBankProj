// utils/mlUtils.js - Machine Learning Utilities
class FraudDetectionModel {
  constructor(weights = null) {
    if (weights) {
      this.weights = weights;
    } else {
      this.weights = {
        w1: Math.random() * 0.1,
        w2: Math.random() * 0.1,
        w3: Math.random() * 0.1,
        bias: Math.random() * 0.1
      };
    }
    this.learningRate = 0.01;
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  predict(features) {
    const { amount, time, location } = features;
    const z = this.weights.w1 * amount + 
              this.weights.w2 * time + 
              this.weights.w3 * location + 
              this.weights.bias;
    return this.sigmoid(z);
  }

   
  train(data, epochs = 5) {
    const gradients = { w1: 0, w2: 0, w3: 0, bias: 0 };
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of data) {
        const { amount, time, location, isFraud } = sample;
        const prediction = this.predict({ amount, time, location });
        const error = prediction - isFraud;

        gradients.w1 += error * amount;
        gradients.w2 += error * time;
        gradients.w3 += error * location;
        gradients.bias += error;
      }
    }

    // Average gradients
    const n = data.length * epochs;
    Object.keys(gradients).forEach(key => {
      gradients[key] /= n;
    });

    return gradients;
  }

  updateWeights(gradients) {
    this.weights.w1 -= this.learningRate * gradients.w1;
    this.weights.w2 -= this.learningRate * gradients.w2;
    this.weights.w3 -= this.learningRate * gradients.w3;
    this.weights.bias -= this.learningRate * gradients.bias;
  }

  evaluate(data) {
    let correct = 0;
    for (const sample of data) {
      const { amount, time, location, isFraud } = sample;
      const prediction = this.predict({ amount, time, location });
      const predictedClass = prediction > 0.5 ? 1 : 0;
      if (predictedClass === isFraud) correct++;
    }
    return correct / data.length; // Return decimal (0-1), not percentage
  }

  getWeights() {
    return { ...this.weights };
  }

  setWeights(weights) {
    this.weights = { ...weights };
  }
}

// Federated Averaging
function federatedAveraging(updates) {
  const totalData = updates.reduce((sum, u) => sum + u.dataSize, 0);
  const avgGradients = { w1: 0, w2: 0, w3: 0, bias: 0 };
  
  updates.forEach(update => {
    const weight = update.dataSize / totalData;
    Object.keys(avgGradients).forEach(key => {
      avgGradients[key] += update.gradients[key] * weight;
    });
  });
  
  return avgGradients;
}

// Generate synthetic transaction data
function generateTransactionData(bankId, size = 100) {
  const data = [];
  const fraudRate = 0.1 + Math.random() * 0.1; // 10-20% fraud rate
  
  for (let i = 0; i < size; i++) {
    const isFraud = Math.random() < fraudRate ? 1 : 0;
    
    data.push({
      transactionId: `${bankId}-txn-${Date.now()}-${i}`,
      amount: isFraud 
        ? Math.random() * 0.9 + 0.5  // High amounts for fraud (0.5-1.4)
        : Math.random() * 0.5,        // Normal amounts (0-0.5)
      time: isFraud
        ? Math.random() * 0.3         // Unusual times (0-0.3)
        : Math.random() * 0.5 + 0.3,  // Normal times (0.3-0.8)
      location: isFraud
        ? Math.random() * 0.9 + 0.5   // Unusual locations (0.5-1.4)
        : Math.random() * 0.5,        // Normal locations (0-0.5)
      isFraud
    });
  }
  
  return data;
}

module.exports = {
  FraudDetectionModel,
  federatedAveraging,
  generateTransactionData
};