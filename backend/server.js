// server.js - Main Express Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/federated_learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const bankRoutes = require('./routes/bankRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const modelRoutes = require('./routes/modelRoutes');

// Use Routes
app.use('/api/banks', bankRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/models', modelRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});