import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Play, Plus, RefreshCw, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { bankAPI, trainingAPI, modelAPI } from './api/api';
import './index.css';

export default function App() {
  const [banks, setBanks] = useState([]);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [globalModel, setGlobalModel] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBank, setSelectedBank] = useState(null);
  const [modelVersions, setModelVersions] = useState([]);

  // Fetch initial data
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [banksRes, statusRes, currentModelRes, historyRes, versionsRes] = await Promise.all([
        bankAPI.getAll(),
        trainingAPI.getStatus(),
        modelAPI.getCurrent().catch(() => ({ data: { data: null } })),
        trainingAPI.getHistory(),
        modelAPI.getVersions()
      ]);

      setBanks(banksRes.data.data);
      setTrainingStatus(statusRes.data.data);
      setGlobalModel(currentModelRes.data.data);
      setTrainingHistory(historyRes.data.data);
      setModelVersions(versionsRes.data.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    }
  };

  const initializeDemo = async () => {
    try {
      setLoading(true);
      await bankAPI.initDemo();
      await fetchAllData();
      setError('');
    } catch (err) {
      setError('Failed to initialize demo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startTrainingRound = async () => {
    try {
      setLoading(true);
      const res = await trainingAPI.start();
      const roundId = res.data.data._id;
      
      // Simulate bank updates
      const updatedBanks = banks.map(bank => ({
        bankId: bank._id,
        gradients: {
          w1: Math.random() * 0.01,
          w2: Math.random() * 0.01,
          w3: Math.random() * 0.01,
          bias: Math.random() * 0.01
        },
        dataSize: Math.floor(Math.random() * 100) + 50
      }));

      for (const update of updatedBanks) {
        await trainingAPI.submitUpdate({
          roundId,
          ...update
        });
      }

      // Aggregate updates
      const aggregateRes = await trainingAPI.aggregate(roundId);
      setTrainingStatus(aggregateRes.data.data.trainingRound);
      setGlobalModel(aggregateRes.data.data.globalModel);
      
      await fetchAllData();
      setError('');
    } catch (err) {
      setError('Failed to start training: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const evaluateModel = async (bankId) => {
    try {
      setLoading(true);
      const res = await modelAPI.evaluate({ bankId });
      setSelectedBank(res.data.data);
      setActiveTab('models');
      setError('');
    } catch (err) {
      setError('Failed to evaluate model: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const bankAccuracyData = banks.map(bank => ({
    name: bank.name,
    accuracy: ((bank.statistics?.currentAccuracy || 0) * 100)
  }));

  const trainingProgressData = trainingHistory.slice(0, 10).reverse().map((round, idx) => ({
    round: round.roundNumber,
    accuracy: ((round.globalModel?.averageAccuracy || 0) * 100)
  }));

  const modelMetricsData = selectedBank?.metrics ? [
    { name: 'Precision', value: parseFloat(selectedBank.metrics.precision) },
    { name: 'Recall', value: parseFloat(selectedBank.metrics.recall) },
    { name: 'F1-Score', value: parseFloat(selectedBank.metrics.f1Score) }
  ] : [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏦 Federated Learning Banking System</h1>
          <p className="text-slate-400">Distributed fraud detection across multiple banks</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="text-red-400" size={20} />
            <span className="text-red-100">{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={initializeDemo}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <Plus size={20} /> Initialize Demo Banks
          </button>
          <button
            onClick={startTrainingRound}
            disabled={loading || banks.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <Zap size={20} /> Start Training Round
          </button>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <RefreshCw size={20} /> Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          {['dashboard', 'banks', 'training', 'models'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Status Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={24} className="text-yellow-400" /> Training Status
              </h3>
              {trainingStatus?.activeRound ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Round Number:</span>
                    <span className="text-white font-semibold">#{trainingStatus.activeRound.roundNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="bg-yellow-900 text-yellow-100 px-3 py-1 rounded-full text-sm">{trainingStatus.activeRound.status.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Updates:</span>
                    <span className="text-white font-semibold">{trainingStatus.activeRound.bankUpdates?.length || 0} banks</span>
                  </div>
                </div>
              ) : trainingStatus?.latestCompletedRound ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latest Round:</span>
                    <span className="text-white font-semibold">#{trainingStatus.latestCompletedRound.roundNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="bg-green-900 text-green-100 px-3 py-1 rounded-full text-sm">COMPLETED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Banks Trained:</span>
                    <span className="text-white font-semibold">{trainingStatus.latestCompletedRound.bankUpdates?.length || 0}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">No training rounds yet</p>
              )}
            </div>

            {/* Global Model Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle size={24} className="text-green-400" /> Global Model
              </h3>
              {globalModel ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Version:</span>
                    <span className="text-white font-semibold">v{globalModel.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Accuracy:</span>
                    <span className="text-green-400 font-semibold">{(globalModel.performance.averageAccuracy).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Banks Participating:</span>
                    <span className="text-white font-semibold">{globalModel.performance.participatingBanks}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">No global model available</p>
              )}
            </div>

            {/* Bank Accuracy Chart */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">Bank Accuracies</h3>
              {bankAccuracyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bankAccuracyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="accuracy" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-12">No bank data available</p>
              )}
            </div>
          </div>
        )}

        {/* BANKS TAB */}
        {activeTab === 'banks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map(bank => (
              <div key={bank._id} className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bank.color }}></div>
                  <h3 className="text-lg font-bold text-white">{bank.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transactions:</span>
                    <span className="text-white">{bank.transactions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accuracy:</span>
                    <span className="text-green-400">{((bank.statistics?.currentAccuracy || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated:</span>
                    <span className="text-slate-400">{new Date(bank.localModel?.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => evaluateModel(bank._id)}
                  disabled={loading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg transition-all"
                >
                  {loading ? 'Evaluating...' : 'Evaluate'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TRAINING TAB */}
        {activeTab === 'training' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Progress Chart */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">Training Progress Over Rounds</h3>
              {trainingProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trainingProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="round" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-center py-12">No training history available</p>
              )}
            </div>

            {/* Training History */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 lg:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">Recent Training Rounds</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trainingHistory.length > 0 ? (
                  trainingHistory.map(round => (
                    <div key={round._id} className="bg-slate-700 rounded p-4 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">Round #{round.roundNumber}</p>
                        <p className="text-slate-400 text-sm">{new Date(round.startTime).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${round.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {round.status.toUpperCase()}
                        </p>
                        {round.globalModel && <p className="text-slate-400 text-sm">{(round.globalModel.averageAccuracy).toFixed(2)}%</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-6">No training history available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODELS TAB */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            {/* Model Metrics for Selected Bank */}
            {selectedBank && selectedBank.metrics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">Model Performance - {selectedBank.bankName}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Accuracy:</span>
                      <span className="text-green-400 font-semibold">{selectedBank.accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Precision:</span>
                      <span className="text-blue-400 font-semibold">{selectedBank.metrics.precision}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Recall:</span>
                      <span className="text-yellow-400 font-semibold">{selectedBank.metrics.recall}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">F1-Score:</span>
                      <span className="text-purple-400 font-semibold">{selectedBank.metrics.f1Score}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4">Confusion Matrix</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-900 rounded p-4 text-center">
                      <p className="text-green-300 text-sm">True Positives</p>
                      <p className="text-2xl font-bold text-green-100">{selectedBank.metrics.truePositives}</p>
                    </div>
                    <div className="bg-blue-900 rounded p-4 text-center">
                      <p className="text-blue-300 text-sm">True Negatives</p>
                      <p className="text-2xl font-bold text-blue-100">{selectedBank.metrics.trueNegatives}</p>
                    </div>
                    <div className="bg-red-900 rounded p-4 text-center">
                      <p className="text-red-300 text-sm">False Positives</p>
                      <p className="text-2xl font-bold text-red-100">{selectedBank.metrics.falsePositives}</p>
                    </div>
                    <div className="bg-yellow-900 rounded p-4 text-center">
                      <p className="text-yellow-300 text-sm">False Negatives</p>
                      <p className="text-2xl font-bold text-yellow-100">{selectedBank.metrics.falseNegatives}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model Versions */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Model Versions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {modelVersions.length > 0 ? (
                  modelVersions.map(model => (
                    <div key={model._id} className="bg-slate-700 rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">Version {model.version}</p>
                          <p className="text-slate-400 text-sm">Banks: {model.performance.participatingBanks} | Data Points: {model.performance.totalDataPoints}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">{(model.performance.averageAccuracy * 100).toFixed(2)}%</p>
                          {model.isActive && <p className="text-xs text-green-400 font-semibold">ACTIVE</p>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-6">No model versions available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
