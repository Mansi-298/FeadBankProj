# Federated Learning Banking System - Testing Guide

## Overview
This guide covers how to test all functionality of the system through both the frontend UI and API endpoints.

---

## 🚀 Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5173`
- MongoDB connected and working
- **Tool**: Use Postman, Thunder Client, or curl for API testing

---

## 1️⃣ INITIALIZE DEMO BANKS

### Via Frontend UI:
1. Open http://localhost:5173
2. Click **"Initialize Demo Banks"** button
3. You should see 3 banks created (Bank A, Bank B, Bank C)

### Via API (Postman/curl):
```bash
POST http://localhost:5000/api/banks/init-demo
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Demo banks initialized successfully",
  "data": [
    {
      "_id": "...",
      "name": "Bank A",
      "color": "#3B82F6",
      "transactions": [...],
      "statistics": { "currentAccuracy": 0 }
    },
    ...
  ]
}
```

---

## 2️⃣ VIEW ALL BANKS

### Via Frontend UI:
1. Go to **Banks** tab
2. See all banks with their statistics
3. Each card shows: transactions count, accuracy, last updated

### Via API:
```bash
GET http://localhost:5000/api/banks
```

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [...]
}
```

---

## 3️⃣ GET SINGLE BANK DETAILS

### Via Frontend UI:
Click on any bank card to see evaluation details

### Via API:
```bash
GET http://localhost:5000/api/banks/{bankId}
```

Replace `{bankId}` with actual bank ID from previous response.

**Example:**
```bash
GET http://localhost:5000/api/banks/674b1a2c3f4d5e6f7a8b9c0d
```

---

## 4️⃣ CREATE CUSTOM BANK

### Via API (Postman):
```bash
POST http://localhost:5000/api/banks
Content-Type: application/json

{
  "name": "Bank D",
  "color": "#EC4899",
  "transactionCount": 150
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Bank D",
    "color": "#EC4899",
    "transactions": [...],
    "localModel": {...}
  }
}
```

---

## 5️⃣ START TRAINING ROUND

### Via Frontend UI:
1. Click **"Start Training Round"** button
2. The system will:
   - Create a training round
   - Collect updates from all banks
   - Aggregate them into a global model
   - Display results on Dashboard

### Via API:
```bash
POST http://localhost:5000/api/training/start
```

**Step 1: Get Round ID**
```json
{
  "success": true,
  "data": {
    "_id": "674b1a2c3f4d5e6f7a8b9c0d",
    "roundNumber": 1,
    "status": "pending"
  }
}
```

**Step 2: Banks Submit Updates**
```bash
POST http://localhost:5000/api/training/submit-update
Content-Type: application/json

{
  "roundId": "674b1a2c3f4d5e6f7a8b9c0d",
  "bankId": "674b1a2c3f4d5e6f7a8b9c0e",
  "gradients": {
    "w1": 0.0015,
    "w2": 0.002,
    "w3": 0.0012,
    "bias": 0.001
  },
  "dataSize": 100
}
```

**Step 3: Aggregate Updates**
```bash
POST http://localhost:5000/api/training/aggregate/{roundId}
```

---

## 6️⃣ VIEW TRAINING STATUS

### Via Frontend UI:
1. Go to **Dashboard** tab
2. See "Training Status" card showing current round info
3. Go to **Training** tab to see full history

### Via API:
```bash
GET http://localhost:5000/api/training/status/current
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "activeRound": {
      "roundNumber": 1,
      "status": "pending",
      "bankUpdates": [...]
    },
    "latestCompletedRound": {...},
    "globalModel": {...}
  }
}
```

---

## 7️⃣ VIEW TRAINING HISTORY

### Via Frontend UI:
1. Go to **Training** tab
2. See "Recent Training Rounds" list
3. Click any round to see details

### Via API:
```bash
GET http://localhost:5000/api/training/history?limit=10
```

---

## 8️⃣ GET CURRENT GLOBAL MODEL

### Via Frontend UI:
1. Go to **Dashboard** tab
2. See "Global Model" card showing:
   - Version number
   - Average accuracy
   - Number of participating banks

### Via API:
```bash
GET http://localhost:5000/api/models/current
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "version": 1,
    "weights": {
      "w1": 0.0045,
      "w2": 0.0062,
      "w3": 0.0038,
      "bias": 0.0032
    },
    "performance": {
      "averageAccuracy": 0.87,
      "participatingBanks": 3,
      "totalDataPoints": 300
    },
    "isActive": true
  }
}
```

---

## 9️⃣ EVALUATE MODEL ON BANK DATA

### Via Frontend UI:
1. Go to **Banks** tab
2. Click **"Evaluate"** button on any bank
3. Go to **Models** tab
4. See performance metrics displayed

### Via API:
```bash
POST http://localhost:5000/api/models/evaluate
Content-Type: application/json

{
  "bankId": "674b1a2c3f4d5e6f7a8b9c0e",
  "modelVersion": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "bankName": "Bank A",
    "modelVersion": 1,
    "accuracy": "87.50",
    "metrics": {
      "truePositives": 35,
      "trueNegatives": 52,
      "falsePositives": 5,
      "falseNegatives": 8,
      "precision": "87.50",
      "recall": "81.40",
      "f1Score": "84.31"
    }
  }
}
```

---

## 🔟 PREDICT FRAUD FOR NEW TRANSACTION

### Via API:
```bash
POST http://localhost:5000/api/models/predict
Content-Type: application/json

{
  "amount": 5000,
  "time": 2,
  "location": 1,
  "modelVersion": 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "modelVersion": 1,
    "transaction": {
      "amount": 5000,
      "time": 2,
      "location": 1
    },
    "fraudProbability": "25.34",
    "prediction": "NORMAL",
    "confidence": "49.32"
  }
}
```

### Testing Different Transactions:
Try different values to see fraud predictions:
- **Normal Transaction**: `{amount: 500, time: 10, location: 1}`
- **Suspicious Transaction**: `{amount: 50000, time: 3, location: 50}`
- **Mid-range**: `{amount: 5000, time: 2, location: 1}`

---

## 1️⃣1️⃣ COMPARE MODEL VERSIONS

### Via API:
```bash
POST http://localhost:5000/api/models/compare
Content-Type: application/json

{
  "version1": 1,
  "version2": 2,
  "bankId": "674b1a2c3f4d5e6f7a8b9c0e"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "version1": {
      "version": 1,
      "averageAccuracy": 0.87,
      "bankAccuracy": 0.85
    },
    "version2": {
      "version": 2,
      "averageAccuracy": 0.92,
      "bankAccuracy": 0.90
    },
    "bankName": "Bank A"
  }
}
```

---

## 1️⃣2️⃣ VIEW MODEL VERSIONS

### Via Frontend UI:
1. Go to **Models** tab
2. See "Model Versions" list at bottom
3. Shows all versions with accuracy and active status

### Via API:
```bash
GET http://localhost:5000/api/models/versions?limit=10
```

---

## 🧪 COMPLETE TESTING WORKFLOW

Follow this sequence to test the entire system:

### Step 1: Initialize
```bash
POST http://localhost:5000/api/banks/init-demo
```

### Step 2: Verify Banks Created
```bash
GET http://localhost:5000/api/banks
```

### Step 3: Start Training
```bash
POST http://localhost:5000/api/training/start
```

### Step 4: Get Training Status
```bash
GET http://localhost:5000/api/training/status/current
```

### Step 5: Check Current Model
```bash
GET http://localhost:5000/api/models/current
```

### Step 6: Evaluate on Bank
```bash
POST http://localhost:5000/api/models/evaluate
{
  "bankId": "<bankId from step 2>",
  "modelVersion": 1
}
```

### Step 7: Make Predictions
```bash
POST http://localhost:5000/api/models/predict
{
  "amount": 5000,
  "time": 2,
  "location": 1
}
```

### Step 8: View Training History
```bash
GET http://localhost:5000/api/training/history
```

---

## 📊 FRONTEND TESTING CHECKLIST

- [ ] **Dashboard Tab**
  - [ ] Initialize demo banks button works
  - [ ] Start training round button works
  - [ ] Training status card displays correctly
  - [ ] Global model card shows version and accuracy
  - [ ] Bank accuracy chart displays all banks

- [ ] **Banks Tab**
  - [ ] All banks are displayed
  - [ ] Bank cards show correct information
  - [ ] Evaluate button works for each bank
  - [ ] Color indicators match bank colors

- [ ] **Training Tab**
  - [ ] Training progress chart shows rounds
  - [ ] Recent training rounds list displays
  - [ ] Round details show correct status
  - [ ] Accuracy values are increasing over time

- [ ] **Models Tab**
  - [ ] Performance metrics display for evaluated bank
  - [ ] Confusion matrix shows correct values
  - [ ] Model versions list displays all versions
  - [ ] Active model is marked correctly

---

## 🐛 DEBUGGING TIPS

### If backend doesn't connect:
1. Check MongoDB connection in terminal
2. Verify `.env` has correct `MONGODB_URI`
3. Check if port 5000 is available

### If frontend doesn't load:
1. Verify backend is running
2. Check browser console for errors (F12)
3. Check if `.env` has correct `VITE_API_URL`

### If API calls fail:
1. Use browser DevTools > Network tab
2. Check response status codes
3. Look for validation error messages
4. Verify all required fields are sent

---

## 📝 SAMPLE CURL COMMANDS

```bash
# Initialize demo banks
curl -X POST http://localhost:5000/api/banks/init-demo

# Get all banks
curl http://localhost:5000/api/banks

# Start training
curl -X POST http://localhost:5000/api/training/start

# Get current global model
curl http://localhost:5000/api/models/current

# Make fraud prediction
curl -X POST http://localhost:5000/api/models/predict \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "time": 2, "location": 1}'

# Health check
curl http://localhost:5000/health
```

---

Good luck testing! 🎉
