import os
import sys
import json
import numpy as np
from fraud_model import FraudModel
from utils import load_bank, save_bank_local_model, get_global_model


def prepare_xy(transactions):
    # transactions have: amount, time, location, isFraud
    if not transactions:
        return np.zeros((0, 3)), np.zeros((0,))
    X = np.array([[t.get('amount', 0.0), t.get('time', 0.0), t.get('location', 0.0)] for t in transactions], dtype=float)
    # simple normalization per feature
    X_mean = X.mean(axis=0)
    X_std = X.std(axis=0)
    X_std[X_std == 0] = 1.0
    X = (X - X_mean) / X_std
    y = np.array([t.get('isFraud', 0) for t in transactions], dtype=int)
    return X, y


def main(bank_id):
    bank = load_bank(bank_id)
    transactions = bank['transactions']
    X, y = prepare_xy(transactions)

    # Load GLOBAL model weights instead of local
    init_weights = get_global_model()
    model = FraudModel(init_weights)

    # training hyperparams can be env-controlled
    epochs = int(os.environ.get('ML_EPOCHS', '5'))
    lr = float(os.environ.get('ML_LR', '0.05'))

    updated_weights, gradients = model.train(X, y, lr=lr, epochs=epochs)
    accuracy = model.evaluate(X, y)

    # Save updated local model back to Mongo
    try:
        save_bank_local_model(bank_id, updated_weights, float(accuracy))
    except Exception:
        # non-fatal here; still return the results
        pass

    out = {
        'bankId': bank_id,
        'dataSize': int(X.shape[0]),
        'gradients': gradients,
        'updated_weights': updated_weights,
        'accuracy': float(accuracy)
    }

    sys.stdout.write(json.dumps(out))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: train_local.py <bankId>')
        sys.exit(2)
    main(sys.argv[1])
