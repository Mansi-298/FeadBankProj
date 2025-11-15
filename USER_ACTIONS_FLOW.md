# 🔄 User Actions Flow - What Happens Behind the Scenes

## 1️⃣ CLICK "REFRESH" BUTTON

### Frontend Flow:
```
User clicks "Refresh" button
    ↓
fetchAllData() function executes
    ↓
5 API calls happen in PARALLEL (Promise.all):
    ├─ bankAPI.getAll()              → GET /api/banks
    ├─ trainingAPI.getStatus()       → GET /api/training/status/current
    ├─ modelAPI.getCurrent()         → GET /api/models/current
    ├─ trainingAPI.getHistory()      → GET /api/training/history?limit=10
    └─ modelAPI.getVersions()        → GET /api/models/versions?limit=10
    ↓
All responses received
    ↓
Update React State:
    ├─ setBanks(banksRes.data.data)              ← All banks with transactions
    ├─ setTrainingStatus(statusRes.data.data)   ← Active or completed round
    ├─ setGlobalModel(currentModelRes.data.data) ← Latest global model
    ├─ setTrainingHistory(historyRes.data.data)  ← Past 10 rounds
    ├─ setModelVersions(versionsRes.data.data)   ← All model versions
    └─ setError('')                              ← Clear any errors
    ↓
React re-renders with fresh data
    ↓
UI displays updated information
```

### What You See:
- ✅ Dashboard shows latest training round
- ✅ Banks tab shows all banks with current transaction counts
- ✅ Training tab shows past rounds
- ✅ Models tab shows all model versions
- ✅ Error messages clear

### Backend Response (Example):
```json
{
  "banks": [
    {
      "_id": "1",
      "name": "Bank A",
      "color": "#3B82F6",
      "transactions": [100 transaction objects],
      "statistics": {
        "currentAccuracy": 0.87
      }
    },
    // ... more banks
  ],
  "trainingStatus": {
    "activeRound": null,
    "latestCompletedRound": {
      "roundNumber": 1,
      "status": "completed",
      "bankUpdates": [...]
    },
    "globalModel": {
      "version": 1,
      "weights": {...}
    }
  }
}
```

---

## 2️⃣ CLICK "INITIALIZE DEMO BANKS" BUTTON

### Frontend Flow:
```
User clicks "Initialize Demo Banks" button
    ↓
setLoading(true)  ← Button becomes disabled, shows spinner
    ↓
initializeDemo() function executes
    ↓
Step 1: bankAPI.initDemo()
    └─ POST /api/banks/init-demo
    ↓
Step 2: Wait for response
    └─ Backend deletes ALL existing banks
    └─ Creates 3 new demo banks:
       ├─ Bank A: 100 transactions
       ├─ Bank B: 120 transactions
       └─ Bank C: 80 transactions
    ↓
Step 3: fetchAllData()
    └─ Makes 5 API calls (same as Refresh)
    └─ Loads fresh bank data with transactions
    ↓
Update React State:
    ├─ setBanks(...)
    ├─ setTrainingStatus(...)
    ├─ setGlobalModel(...)
    ├─ setTrainingHistory(...)
    ├─ setModelVersions(...)
    └─ setError('')
    ↓
setLoading(false)  ← Button re-enables
    ↓
React re-renders
    ↓
UI displays 3 demo banks with transactions
```

### What You See After Clicking:
1. **Button becomes disabled** with loading state (may show spinner)
2. **Dashboard updates** - shows the 3 demo banks
3. **Banks tab shows**:
   - Bank A: 100 Transactions, Accuracy: 45.23%
   - Bank B: 120 Transactions, Accuracy: 52.15%
   - Bank C: 80 Transactions, Accuracy: 48.67%
4. **Chart displays** all 3 banks with their accuracies
5. **Button re-enables** when done

### Backend Actions:
```javascript
// POST /api/banks/init-demo

// 1. Delete all existing banks
await Bank.deleteMany({});  // ← RESETS EVERYTHING!

// 2. Create 3 demo banks
for each of [Bank A, Bank B, Bank C]:
  ├─ Generate 100-120 transactions with synthetic data
  ├─ Create local model with random weights
  └─ Save to MongoDB

// 3. Return response
return {
  success: true,
  message: "Demo banks initialized successfully",
  data: [bankA, bankB, bankC]
}
```

### Data Structure Created:
```
Bank A Document:
{
  _id: ObjectId,
  name: "Bank A",
  color: "#3B82F6",
  transactions: [
    {
      transactionId: "Bank A-txn-...-0",
      amount: 0.32,
      time: 0.45,
      location: 0.21,
      isFraud: 0  ← Labeled data for training
    },
    {
      transactionId: "Bank A-txn-...-1",
      amount: 0.78,  ← Higher amount
      time: 0.15,    ← Lower time (unusual)
      location: 0.92, ← Higher location (unusual)
      isFraud: 1     ← Labeled as fraud
    },
    ... 98 more transactions
  ],
  localModel: {
    weights: {
      w1: 0.0342,
      w2: 0.0521,
      w3: 0.0458,
      bias: 0.0387
    },
    lastUpdated: 2025-11-15T12:34:56.789Z
  },
  statistics: {
    totalTransactions: 100,
    fraudCount: 12,
    normalCount: 88,
    currentAccuracy: 0.0  ← Initially 0, updated after training
  }
}
```

---

## 3️⃣ IMPORTANT: WHAT HAPPENS WITH TRANSACTIONS?

### Why Transactions Show 0 Initially?
**BEFORE FIX**: The `/api/banks` endpoint had `.select('-transactions')` which EXCLUDED transactions.

**AFTER FIX**: Removed the exclude, so transactions ARE included.

### Transaction Generation:
```javascript
generateTransactionData("Bank A", 100)

// Creates 100 transactions with 10-20% fraud rate

// Fraud transaction pattern:
{
  amount: 0.85,      ← HIGH (0.5-1.4 range) = unusual
  time: 0.12,        ← LOW (0-0.3 range) = unusual time
  location: 0.92,    ← HIGH (0.5-1.4 range) = unusual location
  isFraud: 1         ← Labeled as fraud
}

// Normal transaction pattern:
{
  amount: 0.34,      ← LOW (0-0.5 range) = normal
  time: 0.52,        ← NORMAL (0.3-0.8 range) = normal time
  location: 0.21,    ← LOW (0-0.5 range) = normal location
  isFraud: 0         ← Labeled as normal
}
```

---

## 🔄 SEQUENCE DIAGRAM

```
User                Frontend              Backend              MongoDB
 |                     |                    |                    |
 |--Click Refresh----->|                    |                    |
 |                     |--GET /banks------->|                    |
 |                     |                    |--Query Banks------>|
 |                     |                    |<--Return Banks-----|
 |                     |<--Banks Data-------|                    |
 |                     |                    |                    |
 |                     |--GET /training/status/current-->|        |
 |                     |                    |--Query Training--->|
 |                     |                    |<--Return Training--|
 |                     |<--Training Status--|                    |
 |                     |                    |                    |
 |                     |--GET /models/current-->|               |
 |                     |                    |--Query Models----->|
 |                     |                    |<--Return Model-----|
 |                     |<--Model Data-------|                    |
 |                     |                    |                    |
 |<--UI Updates--------|                    |                    |
```

---

## 🎯 STATE CHANGES SUMMARY

### REFRESH Button:
| Before | After |
|--------|-------|
| Old bank data | Fresh bank data |
| Previous training status | Latest training round |
| Old model versions | Current model versions |
| Cached training history | Updated history |

### INITIALIZE DEMO BANKS Button:
| Before | After |
|--------|-------|
| 0 banks OR old banks | 3 demo banks (RESET!) |
| Any old data deleted | Fresh synthetic data |
| No transactions | 100-120 transactions per bank |
| Old accuracy metrics | Reset to 0 |
| Old training rounds | Deleted (fresh start) |

---

## ⚠️ KEY DIFFERENCES

| Action | Effect | Data Deleted? | New Data? |
|--------|--------|---------------|-----------|
| **Refresh** | Reloads current state | ❌ NO | ✅ YES (refreshed) |
| **Initialize Demo** | Resets entire system | ✅ YES! (all banks) | ✅ YES (3 demo banks) |

---

## 🚨 COMMON ISSUES & EXPLANATIONS

### Issue: "Transactions still showing 0"
**Cause**: Backend endpoint using `.select('-transactions')`
**Fix**: Removed the exclude filter
**Result**: Transactions now displayed correctly

### Issue: "Nothing happens after clicking Initialize"
**Cause**: 
- Button might be loading (disabled)
- Network error
- MongoDB not connected
**Check**:
- Look at browser console (F12)
- Check backend logs
- Verify MongoDB connection

### Issue: "Old data still showing after Initialize"
**Cause**: Data cached or not refreshing
**Fix**: Click Refresh button after Initialize
**Result**: Fresh data loads

---

## 📊 DATA FLOW EXAMPLE

### Step 1: Initialize Demo Banks
```
POST /api/banks/init-demo
→ Deletes all banks from MongoDB
→ Creates Bank A, B, C with transactions
→ Saves to MongoDB
→ Returns response
```

### Step 2: Refresh
```
GET /api/banks
→ MongoDB returns all 3 banks with 100+ transactions each
→ Frontend receives data
→ React state updates
→ UI re-renders
→ Shows all banks in Banks tab
```

### Step 3: User sees
```
Dashboard:
- Latest completed training round
- 3 banks displayed

Banks Tab:
- Bank A: 100 Transactions, Accuracy: 45.23%
- Bank B: 120 Transactions, Accuracy: 52.15%
- Bank C: 80 Transactions, Accuracy: 48.67%

Charts:
- Bar chart showing accuracies
```

---

## ✅ EXPECTED BEHAVIOR CHECKLIST

### After Clicking "Initialize Demo Banks":
- [ ] Button becomes disabled during loading
- [ ] 3 banks appear in Banks tab
- [ ] Each bank shows ~100 transactions
- [ ] Each bank shows accuracy percentage (not 1500%)
- [ ] Dashboard updates
- [ ] No error messages

### After Clicking "Refresh":
- [ ] Button briefly disables
- [ ] All data reloads fresh
- [ ] No data is deleted
- [ ] Latest values displayed
- [ ] Charts update

