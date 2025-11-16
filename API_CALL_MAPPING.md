# 📍 Training APIs - Where They're Called & Logic Flow

## API Endpoints (Backend)
Located in: `backend/routes/trainingRoutes.js`

```
1. POST /api/training/start               (line 9)
2. POST /api/training/submit-update       (line 45)
3. POST /api/training/aggregate/:roundId  (line 114)
4. GET  /api/training/history             (line 179)
5. GET  /api/training/:roundId            (line 199)
6. GET  /api/training/status/current      (line 221)
```

---

## 🎯 API Calls Mapping - Frontend to Backend

### 1️⃣ `trainingAPI.start()` - START NEW TRAINING ROUND

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 9
router.post('/start', async (req, res) => {
  // Creates new training round with status 'pending'
  // Returns roundId
});
```

**Frontend Call Location**:
```
File: frontend/src/App.jsx
Line: 63

const startTrainingRound = async () => {
  try {
    setLoading(true);
    const res = await trainingAPI.start();  // ← LINE 63
    const trainingRound = res.data.data;
    
    // Response contains:
    // {
    //   _id: "roundId",
    //   roundNumber: 1,
    //   status: "pending",
    //   startTime: "2025-11-15T..."
    // }
```

**When Called**:
- User clicks **"Start Training Round"** button on Dashboard
- Function: `startTrainingRound()`
- Immediately sets UI state to show pending round

**What Happens Backend**:
1. Gets all banks from MongoDB
2. Finds latest training round number
3. Creates new TrainingRound with `status: 'pending'`
4. Saves to MongoDB and returns

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "674b1a2c3f4d5e6f7a8b9c0d",
    "roundNumber": 1,
    "status": "pending",
    "startTime": "2025-11-15T12:30:00.000Z",
    "bankUpdates": [],
    "createdAt": "2025-11-15T12:30:00.000Z"
  }
}
```

---

### 2️⃣ `trainingAPI.submitUpdate()` - SUBMIT BANK UPDATE

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 45
router.post('/submit-update', async (req, res) => {
  // Banks submit their local training gradients
  // Updates bank's local model accuracy
  // Adds update to training round
  // Changes round status to 'training'
});
```

**Frontend Call Location**:
```
File: frontend/src/App.jsx
Line: 87

for (const update of updatedBanks) {
  const submitRes = await trainingAPI.submitUpdate({  // ← LINE 87
    roundId,
    bankId: update.bankId,
    gradients: {
      w1: Math.random() * 0.01,
      w2: Math.random() * 0.01,
      w3: Math.random() * 0.01,
      bias: Math.random() * 0.01
    },
    dataSize: Math.floor(Math.random() * 100) + 50
  });
  
  // Called ONCE FOR EACH BANK (3 times for 3 banks)
  // With 200ms delay between each
```

**When Called**:
- After `/training/start` completes
- For EACH bank in the system
- Loop runs 3 times (Bank A, Bank B, Bank C)
- Sends gradients (model updates) to server

**What Happens Backend**:
1. Validates roundId, bankId, gradients, dataSize
2. Finds the training round by roundId
3. Finds the bank by bankId
4. Creates new FraudDetectionModel with bank's local weights
5. Updates model weights with submitted gradients
6. Evaluates model on bank's transactions to calculate accuracy
7. Saves updated accuracy to bank document
8. Adds bankUpdate to trainingRound.bankUpdates array
9. Sets trainingRound status to 'training'
10. Saves training round to MongoDB

**Request Body**:
```json
{
  "roundId": "674b1a2c3f4d5e6f7a8b9c0d",
  "bankId": "674b1a2c3f4d5e6f7a8b9c0e",
  "gradients": {
    "w1": -0.0023,
    "w2": -0.0015,
    "w3": -0.0018,
    "bias": -0.0012
  },
  "dataSize": 100
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "trainingRound": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0d",
      "roundNumber": 1,
      "status": "training",
      "bankUpdates": [
        {
          "bankId": "674b1a2c3f4d5e6f7a8b9c0e",
          "bankName": "Bank A",
          "gradients": { "w1": -0.0023, ... },
          "dataSize": 100,
          "accuracy": 0.87,
          "timestamp": "2025-11-15T12:30:05.000Z"
        }
      ]
    },
    "accuracy": 0.87
  }
}
```

**Frontend Updates After Each Call**:
```javascript
// Line 91-105 in App.jsx
accumulatedUpdates.push({ 
  bankId: update.bankId, 
  dataSize: update.dataSize, 
  gradients: update.gradients, 
  timestamp: new Date() 
});

setTrainingStatus(prev => ({
  ...prev,
  activeRound: {
    ...(prev?.activeRound || {}),
    _id: roundId,
    roundNumber: trainingRound.roundNumber,
    status: 'training',
    bankUpdates: accumulatedUpdates  // ← Shows progress
  }
}));
```

**UI Progress on Dashboard/Training Tab**:
- Update 1 received → Shows "1 / 3 banks (33%)"
- Update 2 received → Shows "2 / 3 banks (67%)"
- Update 3 received → Shows "3 / 3 banks (100%)"

---

### 3️⃣ `trainingAPI.aggregate()` - AGGREGATE ALL UPDATES

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 114
router.post('/aggregate/:roundId', async (req, res) => {
  // Aggregates all bank updates using federated averaging
  // Creates new global model version
  // Changes round status to 'completed'
});
```

**Frontend Call Location**:
```
File: frontend/src/App.jsx
Line: 120

const aggregateRes = await trainingAPI.aggregate(roundId);  // ← LINE 120
```

**When Called**:
- After ALL banks have submitted updates (all 3 submitUpdate calls complete)
- Calls federated averaging to combine all gradients

**What Happens Backend**:
1. Sets trainingRound status to 'aggregating'
2. Calls `federatedAveraging()` with all bankUpdates
   - Calculates weighted average of gradients based on dataSize
3. Gets current active global model (if exists)
4. Creates new FraudDetectionModel with previous weights (or random)
5. Updates model with averaged gradients
6. Calculates average accuracy across all banks
7. Creates new GlobalModel version (incremented)
8. Saves new global model as isActive: true (deactivates old one)
9. Updates training round with:
   - status: 'completed'
   - globalModel: {weights, averageAccuracy}
   - endTime: current time

**Example Federated Averaging**:
```
Bank A: gradients {w1: -0.0023}, dataSize: 100
Bank B: gradients {w1: -0.0025}, dataSize: 120
Bank C: gradients {w1: -0.0021}, dataSize: 80
Total: 300

avg_w1 = (-0.0023 × 100 + -0.0025 × 120 + -0.0021 × 80) / 300
       = (-0.23 + -0.30 + -0.168) / 300
       = -0.698 / 300
       = -0.00233
```

**Response**:
```json
{
  "success": true,
  "data": {
    "trainingRound": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0d",
      "roundNumber": 1,
      "status": "completed",
      "bankUpdates": [...],
      "globalModel": {
        "weights": { "w1": 0.04767, "w2": 0.04985, ... },
        "averageAccuracy": 0.87,
        "updatedAt": "2025-11-15T12:30:15.000Z"
      },
      "endTime": "2025-11-15T12:30:15.000Z"
    },
    "globalModel": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0f",
      "version": 1,
      "weights": { "w1": 0.04767, ... },
      "performance": {
        "averageAccuracy": 0.87,
        "participatingBanks": 3,
        "totalDataPoints": 300
      },
      "isActive": true
    }
  }
}
```

**Frontend After Aggregation** (Line 122-127 in App.jsx):
```javascript
setTrainingStatus({ 
  activeRound: null,  // ← No active round anymore
  latestCompletedRound: aggregateRes.data.data.trainingRound,  // ← Show completed
  globalModel: aggregateRes.data.data.globalModel 
});
setGlobalModel(aggregateRes.data.data.globalModel);
```

---

### 4️⃣ `trainingAPI.getStatus()` - GET CURRENT STATUS

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 221
router.get('/status/current', async (req, res) => {
  // Returns active round (if training), latest completed round, and current global model
});
```

**Frontend Call Locations**:
```
File: frontend/src/App.jsx
Line: 29 (in fetchAllData function)

const fetchAllData = async () => {
  try {
    const [banksRes, statusRes, ...] = await Promise.all([
      bankAPI.getAll(),
      trainingAPI.getStatus(),  // ← LINE 29
      ...
    ]);
```

**When Called**:
- Auto-called every 5 seconds (auto-refresh interval)
- Called when user clicks **Refresh** button
- Called after Initialize Demo Banks

**What Happens Backend**:
1. Queries TrainingRound with status in ['pending', 'training', 'aggregating']
2. Queries latest completed TrainingRound
3. Queries active GlobalModel
4. Returns all three

**Response**:
```json
{
  "success": true,
  "data": {
    "activeRound": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0d",
      "roundNumber": 1,
      "status": "training",
      "bankUpdates": [...]
    },
    "latestCompletedRound": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0a",
      "roundNumber": 0,
      "status": "completed",
      ...
    },
    "globalModel": {
      "_id": "674b1a2c3f4d5e6f7a8b9c0f",
      "version": 1,
      "weights": {...},
      "isActive": true
    }
  }
}
```

---

### 5️⃣ `trainingAPI.getHistory()` - GET PAST ROUNDS

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 179
router.get('/history', async (req, res) => {
  // Returns past 10 training rounds (limit configurable)
  // Excludes bankUpdates (to keep response small)
});
```

**Frontend Call Location**:
```
File: frontend/src/App.jsx
Line: 31 (in fetchAllData function)

const fetchAllData = async () => {
  try {
    const [banksRes, statusRes, currentModelRes, historyRes, ...] = await Promise.all([
      bankAPI.getAll(),
      trainingAPI.getStatus(),
      modelAPI.getCurrent(),
      trainingAPI.getHistory(),  // ← LINE 31
      ...
    ]);
```

**When Called**:
- Auto-called every 5 seconds
- Called when user clicks **Refresh**
- Called after training completes

**What Happens Backend**:
1. Finds all TrainingRounds
2. Sorts by roundNumber descending
3. Limits to 10 (or query parameter)
4. Excludes bankUpdates field to reduce data size
5. Returns array

**Response**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "674b1a2c3f4d5e6f7a8b9c0d",
      "roundNumber": 3,
      "status": "completed",
      "globalModel": { "averageAccuracy": 0.89, ... },
      "startTime": "2025-11-15T12:30:00.000Z",
      "endTime": "2025-11-15T12:30:15.000Z"
    },
    {
      "_id": "674b1a2c3f4d5e6f7a8b9c0c",
      "roundNumber": 2,
      "status": "completed",
      ...
    },
    ...
  ]
}
```

**Frontend Usage** (Line 35 in App.jsx):
```javascript
setTrainingHistory(historyRes.data.data);  // ← Stored in state
```

**Used For**:
- Training tab: Shows list of recent rounds
- Dashboard: Shows training progress chart over rounds

---

### 6️⃣ `trainingAPI.getRound()` - NOT CALLED IN CURRENT APP

**Backend Endpoint**:
```javascript
// backend/routes/trainingRoutes.js, line 199
router.get('/:roundId', async (req, res) => {
  // Returns specific round with all bankUpdates details
});
```

**Frontend Status**: ❌ Not currently used

**Potential Use**:
- Click on a round to see detailed bank updates
- Could be used for detailed analytics

---

## 🔄 Complete Training Flow Timeline

```
1. USER CLICKS "START TRAINING ROUND"
   └─> trainingAPI.start()
       └─> Backend: POST /api/training/start
           └─> Creates new TrainingRound (status: pending)
           └─> Returns roundId
       └─> Frontend: Shows round as "pending" on Dashboard

2. FOR EACH BANK (Bank A, Bank B, Bank C):
   └─> trainingAPI.submitUpdate({roundId, bankId, gradients, dataSize})
       └─> Backend: POST /api/training/submit-update
           └─> Updates bank's local model
           └─> Adds update to training round
           └─> Sets status to "training"
       └─> Frontend: 
           └─> Accumulates updates
           └─> Updates UI to show progress (1/3, 2/3, 3/3)
           └─> 200ms pause between each

3. AFTER ALL UPDATES:
   └─> trainingAPI.aggregate(roundId)
       └─> Backend: POST /api/training/aggregate/:roundId
           └─> Performs federated averaging
           └─> Creates new global model version
           └─> Sets status to "completed"
       └─> Frontend:
           └─> Shows activeRound as null
           └─> Shows latestCompletedRound
           └─> Calls fetchAllData() to refresh everything

4. AUTO-REFRESH EVERY 5 SECONDS:
   └─> trainingAPI.getStatus()
       └─> trainingAPI.getHistory()
       └─> Shows latest data on all tabs
```

---

## 📊 State Transitions

```
START ROUND
│
├─ /start called
│  └─ status: pending
│
├─ Loop: /submit-update (3 times)
│  ├─ After 1st: status: training, updates: 1/3
│  ├─ After 2nd: status: training, updates: 2/3
│  └─ After 3rd: status: training, updates: 3/3
│
├─ /aggregate called
│  ├─ status: aggregating (brief)
│  └─ status: completed
│
└─ Round removed from activeRound
   └─ Shown in latestCompletedRound

GLOBAL MODEL
│
├─ Before training: v0 (or none)
│
├─ After first training: v1 (created by aggregate)
│  └─ isActive: true
│  └─ weights updated via federated averaging
│
└─ Before next training: v1 inactive, v2 active
```

---

## 🎯 Key Takeaways

| API | Called From | When | Purpose |
|-----|-------------|------|---------|
| `/start` | `startTrainingRound()` L63 | User clicks "Start Training" | Creates new training round |
| `/submit-update` | `startTrainingRound()` L87 | Loop: for each bank | Submits bank's gradients |
| `/aggregate` | `startTrainingRound()` L120 | After all banks submit | Combines updates, creates global model |
| `/status/current` | `fetchAllData()` L29 | Every 5s + Refresh button | Gets current training state |
| `/history` | `fetchAllData()` L31 | Every 5s + Refresh button | Gets past rounds for charts |
| `/:roundId` | Nowhere | N/A | Could be used for detailed view |

