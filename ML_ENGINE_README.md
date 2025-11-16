**Python ML Engine**

Location: `ml_engine/`

Environment variables:
- `MONGODB_URI` : MongoDB connection string (used by Python scripts). If not set, defaults to `mongodb://localhost:27017/fedbank`.
- `PYTHON_PATH` : Optional path to Python executable. Backend will use this when launching Python processes. Defaults to `python`.
- `ML_EPOCHS` : Number of local training epochs (default: 5).
- `ML_LR` : Learning rate for local SGD (default: 0.05).

Install dependencies:

```powershell
cd ml_engine
python -m pip install -r requirements.txt
```

Files:
- `fraud_model.py` - simple logistic regression implementation (train, gradients, evaluate)
- `utils.py` - MongoDB helpers for loading/saving bank data
- `train_local.py` - CLI script: `python train_local.py <bankId>` prints JSON with gradients and updated_weights
- `aggregate.py` - CLI script: `python aggregate.py <updates_json_file>` prints aggregated gradient JSON

The Node backend calls `train_local.py` for each bank and then `aggregate.py` to compute federated average.
