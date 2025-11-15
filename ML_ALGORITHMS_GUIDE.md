# 🤖 Machine Learning Algorithms & Fraud Detection - Complete Guide

## 📍 Project Structure & Algorithm Locations

```
backend/
├── utils/
│   └── mlUtils.js          ⭐ MAIN ALGORITHMS HERE
├── models/
│   ├── Bank.js             - Stores transactions & local model
│   ├── GlobalModel.js      - Stores aggregated global model
│   └── TrainingRound.js    - Tracks training rounds & updates
└── routes/
    ├── bankRoutes.js       - Bank data management
    ├── trainingRoutes.js   - Training orchestration
    └── modelRoutes.js      - Fraud prediction & evaluation
```

---

## 🎯 Algorithms Implemented

### **1. LOGISTIC REGRESSION WITH SIGMOID** ✅
**Location**: `backend/utils/mlUtils.js` → `FraudDetectionModel` class

#### What It Does:
Logistic Regression is a binary classification algorithm that predicts if a transaction is fraudulent (1) or normal (0).

#### The Formula:
```
z = w1*amount + w2*time + w3*location + bias
probability = sigmoid(z) = 1 / (1 + e^-z)
prediction = probability > 0.5 ? FRAUD : NORMAL
```

#### Code Example:
```javascript
class FraudDetectionModel {
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));  // Converts any number to 0-1
  }

  predict(features) {
    const { amount, time, location } = features;
    const z = this.weights.w1 * amount + 
              this.weights.w2 * time + 
              this.weights.w3 * location + 
              this.weights.bias;
    return this.sigmoid(z);  // Returns probability 0-1
  }
}
```

#### Example:
- **Normal Transaction**: {amount: 100, time: 10, location: 1}
  - z = 0.05×100 + 0.05×10 + 0.05×1 + 0.05 = 5.55
  - probability = sigmoid(5.55) = 0.996 (99.6% likely NORMAL)
  - prediction = "NORMAL" ✅

- **Fraudulent Transaction**: {amount: 5000, time: 0.1, location: 50}
  - z = 0.05×5000 + 0.05×0.1 + 0.05×50 + 0.05 = 252.555
  - probability = sigmoid(252.555) = 1.0 (100% likely FRAUD)
  - prediction = "FRAUD" 🚨

---

### **2. GRADIENT DESCENT (BACKPROPAGATION)** ✅
**Location**: `backend/utils/mlUtils.js` → `train()` method

#### What It Does:
Finds the optimal weights by computing gradients (slopes) and updating weights in the direction that reduces error.

#### The Process:
```
1. Make prediction with current weights
2. Calculate error = prediction - actual_label
3. Compute gradient = error × feature
4. Update weight = weight - learning_rate × gradient
```

#### Code Example:
```javascript
train(data, epochs = 5) {
  const gradients = { w1: 0, w2: 0, w3: 0, bias: 0 };
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const sample of data) {
      const { amount, time, location, isFraud } = sample;
      
      // 1. Make prediction
      const prediction = this.predict({ amount, time, location });
      
      // 2. Calculate error
      const error = prediction - isFraud;  // e.g., 0.8 - 1 = -0.2

      // 3. Compute gradients
      gradients.w1 += error * amount;      // -0.2 × 100 = -20
      gradients.w2 += error * time;        // -0.2 × 10 = -2
      gradients.w3 += error * location;    // -0.2 × 1 = -0.2
      gradients.bias += error;             // -0.2
    }
  }

  // Average and return
  const n = data.length * epochs;
  Object.keys(gradients).forEach(key => {
    gradients[key] /= n;
  });
  
  return gradients;  // Negative values = move weights up (for this example)
}

updateWeights(gradients) {
  // 4. Update weights
  const learningRate = 0.01;
  this.weights.w1 -= learningRate * gradients.w1;  // Reduce w1 by small amount
  this.weights.w2 -= learningRate * gradients.w2;
  this.weights.w3 -= learningRate * gradients.w3;
  this.weights.bias -= learningRate * gradients.bias;
}
```

#### Visual Example:
```
Initial weights: w1=0.05, w2=0.05, w3=0.05, bias=0.05
After training: w1=0.048, w2=0.0498, w3=0.05, bias=0.048
(Weights adjusted based on patterns in transaction data)
```

---

### **3. FEDERATED AVERAGING** ✅
**Location**: `backend/utils/mlUtils.js` → `federatedAveraging()` function

#### What It Does:
Combines local model updates from multiple banks into ONE global model without sharing raw transaction data.

#### The Algorithm:
```
global_weights = (w_bank1 × data_size_1 + w_bank2 × data_size_2 + ...) / total_data_size
```

#### Code Example:
```javascript
function federatedAveraging(updates) {
  // updates = [ {gradients: {...}, dataSize: 100}, {gradients: {...}, dataSize: 120}, ... ]
  
  const totalData = updates.reduce((sum, u) => sum + u.dataSize, 0);
  // totalData = 100 + 120 + 80 = 300
  
  const avgGradients = { w1: 0, w2: 0, w3: 0, bias: 0 };
  
  updates.forEach(update => {
    // Weight each bank's contribution by its data size
    const weight = update.dataSize / totalData;
    // Bank A: 100/300 = 0.333
    // Bank B: 120/300 = 0.4
    // Bank C: 80/300  = 0.267
    
    Object.keys(avgGradients).forEach(key => {
      avgGradients[key] += update.gradients[key] * weight;
    });
  });
  
  return avgGradients;  // Weighted average gradients
}
```

#### Real Example:
```
Bank A updates: {w1_grad: -0.002, dataSize: 100}
Bank B updates: {w1_grad: -0.003, dataSize: 120}
Bank C updates: {w1_grad: -0.001, dataSize: 80}

Total data: 300

Federated Average w1_grad = 
  (-0.002 × 100/300) + (-0.003 × 120/300) + (-0.001 × 80/300)
  = -0.000667 - 0.0012 - 0.000267
  = -0.002134
  
This single gradient is applied to the global model!
```

---

### **4. ACCURACY CALCULATION & CONFUSION MATRIX** ✅
**Location**: `backend/utils/mlUtils.js` → `evaluate()` method

#### What It Does:
Measures how well the model performs on test data using accuracy and detailed metrics.

#### Code Example:
```javascript
evaluate(data) {
  let correct = 0;
  for (const sample of data) {
    const { amount, time, location, isFraud } = sample;
    
    // Get probability
    const prediction = this.predict({ amount, time, location });
    
    // Convert to 0 or 1 (threshold = 0.5)
    const predictedClass = prediction > 0.5 ? 1 : 0;
    
    // Check if correct
    if (predictedClass === isFraud) correct++;
  }
  
  return correct / data.length;  // Accuracy as decimal (e.g., 0.87 = 87%)
}
```

#### Confusion Matrix (in modelRoutes.js):
```javascript
router.post('/models/evaluate', async (req, res) => {
  // ... get model and bank data ...
  
  let truePositives = 0;    // Predicted fraud, actually fraud ✅
  let trueNegatives = 0;    // Predicted normal, actually normal ✅
  let falsePositives = 0;   // Predicted fraud, actually normal ❌
  let falseNegatives = 0;   // Predicted normal, actually fraud ❌
  
  bank.transactions.forEach(txn => {
    const prediction = fraudModel.predict({...});
    const predictedClass = prediction > 0.5 ? 1 : 0;
    
    if (predictedClass === 1 && txn.isFraud === 1) truePositives++;
    else if (predictedClass === 0 && txn.isFraud === 0) trueNegatives++;
    else if (predictedClass === 1 && txn.isFraud === 0) falsePositives++;
    else if (predictedClass === 0 && txn.isFraud === 1) falseNegatives++;
  });
  
  // Calculate metrics
  const precision = truePositives / (truePositives + falsePositives);
  // Out of all fraud predictions, how many were correct?
  
  const recall = truePositives / (truePositives + falseNegatives);
  // Out of all actual frauds, how many did we catch?
  
  const f1Score = 2 * (precision * recall) / (precision + recall);
  // Harmonic mean of precision and recall
});
```

#### Example Confusion Matrix:
```
                Predicted Fraud    Predicted Normal
Actual Fraud         35 ✅             8 ❌
Actual Normal        5 ❌             52 ✅

Accuracy = (35+52)/(35+8+5+52) = 87.5%
Precision = 35/(35+5) = 87.5%  (Of fraud alerts, 87.5% correct)
Recall = 35/(35+8) = 81.4%     (Of actual frauds, 81.4% caught)
F1-Score = 84.31%               (Balanced metric)
```

---

## 🔄 COMPLETE FRAUD DETECTION WORKFLOW

### Step-by-Step Process:

#### **Phase 1: Data Generation** 
```
generateTransactionData(bankId, 100)
├─ 10-20% fraudulent transactions
├─ Fraud characteristics:
│  ├─ HIGH amounts (0.5-1.4 range)
│  ├─ UNUSUAL times (0-0.3 range)
│  └─ UNUSUAL locations (0.5-1.4 range)
└─ Normal characteristics:
   ├─ LOW amounts (0-0.5 range)
   ├─ NORMAL times (0.3-0.8 range)
   └─ NORMAL locations (0-0.5 range)
```

#### **Phase 2: Local Training (Each Bank)**
```
Bank A does:
1. Load its transaction data (100 txns with isFraud labels)
2. Create local FraudDetectionModel
3. Call model.train(transactions, epochs=5)
   ├─ For each epoch:
   │  ├─ For each transaction:
   │  │  ├─ Predict: sigmoid(w1×amount + w2×time + w3×location + bias)
   │  │  ├─ Calculate error: prediction - actual
   │  │  └─ Accumulate gradients: gradient += error × feature
   │  └─ Average gradients by data size
4. Return gradients (NOT the data!)

Bank B & Bank C do the same independently
```

#### **Phase 3: Federated Aggregation**
```
Central Server receives:
- Bank A: gradients {w1: -0.002, w2: -0.003, w3: -0.001, bias: -0.0005}, dataSize: 100
- Bank B: gradients {w1: -0.0025, w2: -0.0035, w3: -0.0015, bias: -0.0006}, dataSize: 120
- Bank C: gradients {w1: -0.001, w2: -0.002, w3: -0.0008, bias: -0.0003}, dataSize: 80

Federated Averaging:
avgGradient_w1 = (-0.002×100 + -0.0025×120 + -0.001×80) / 300
               = -0.002134 (weighted average)

Apply to global model:
w1_new = w1_old - learningRate × avgGradient_w1
       = 0.05 - 0.01 × (-0.002134)
       = 0.050214 (slightly adjusted)
```

#### **Phase 4: Fraud Prediction**
```
New Transaction arrives: {amount: 2500, time: 0.2, location: 1}

Using Global Model:
z = 0.050214 × 2500 + 0.050214 × 0.2 + 0.050214 × 1 + bias
  = 125.535 + 0.010043 + 0.050214 + 0.005 = 125.6
  
probability = sigmoid(125.6) ≈ 1.0 (essentially 100%)

Output: "FRAUD DETECTED! 🚨 Probability: 99.98%"
```

#### **Phase 5: Evaluation**
```
Evaluate global model on Bank A's test data:
1. For each of 100 transactions:
   - Predict: sigmoid(w1×amount + w2×time + w3×location + bias)
   - If probability > 0.5: predict FRAUD (1)
   - If probability ≤ 0.5: predict NORMAL (0)
   - Compare with actual isFraud label

2. Count correct predictions
3. Accuracy = correct / total = 87 / 100 = 87%

4. Build confusion matrix:
   - TP: 35 (caught actual frauds)
   - FP: 5 (false alarms)
   - TN: 52 (correct normal predictions)
   - FN: 8 (missed frauds)

5. Calculate metrics:
   - Precision: 35/40 = 87.5%
   - Recall: 35/43 = 81.4%
   - F1: 84.31%
```

---

## 📊 WHERE EACH COMPONENT IS USED

| Component | Location | Purpose |
|-----------|----------|---------|
| **FraudDetectionModel** | `mlUtils.js` | Core ML model with sigmoid, predict, train |
| **Sigmoid Function** | Line 9 | Converts linear score to 0-1 probability |
| **Predict** | Line 14 | Makes fraud prediction on transaction |
| **Train** | Line 20 | Calculates gradients via backpropagation |
| **UpdateWeights** | Line 45 | Gradient descent weight update |
| **Evaluate** | Line 52 | Calculates accuracy on test data |
| **federatedAveraging** | Line 66 | Aggregates updates from all banks |
| **generateTransactionData** | Line 81 | Creates synthetic training data |
| **trainRoutes** | `/api/training/start` | Orchestrates entire training cycle |
| **modelRoutes** | `/api/models/evaluate` | Evaluates model & creates confusion matrix |
| **modelRoutes** | `/api/models/predict` | Predicts fraud on new transaction |

---

## 🎓 Learning Path in Code

1. **Start here**: `generateTransactionData()` - Understand how fraud data is created
2. **Then learn**: `sigmoid()` - How probability is calculated
3. **Next**: `predict()` - How to classify a transaction
4. **Then**: `train()` + `updateWeights()` - How model learns
5. **Then**: `evaluate()` - How to measure performance
6. **Finally**: `federatedAveraging()` - How to combine models

---

## 🚨 Quick Reference: How Fraud is Detected

```javascript
// SIMPLE EXAMPLE
const transaction = { amount: 5000, time: 0.1, location: 50 };

// Step 1: Calculate score
const z = 0.05×5000 + 0.05×0.1 + 0.05×50 + 0.05
        = 250 + 0.005 + 2.5 + 0.05
        = 252.555

// Step 2: Apply sigmoid
const probability = 1 / (1 + e^-252.555)
                  = 1 / (1 + ~0)
                  ≈ 1.0 (100%)

// Step 3: Threshold check
if (probability > 0.5) → "FRAUD" 🚨
else → "NORMAL" ✅

// For this transaction: FRAUD DETECTED (99.98% confidence)
```

---

**Key Takeaway**: 
- **Logistic Regression** = The classifier
- **Gradient Descent** = How it learns
- **Federated Averaging** = How banks collaborate without sharing data
- **Confusion Matrix** = How we measure if it works

All code is in `backend/utils/mlUtils.js` and `backend/routes/modelRoutes.js` 🎯
