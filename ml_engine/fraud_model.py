import numpy as np


class FraudModel:
    """Simple logistic regression model with manual gradient computation."""
    def __init__(self, weights=None):
        if weights is None:
            weights = {'w1': 0.0, 'w2': 0.0, 'w3': 0.0, 'bias': 0.0}
        self.w = np.array([weights.get('w1', 0.0), weights.get('w2', 0.0), weights.get('w3', 0.0)])
        self.b = float(weights.get('bias', 0.0))

    def sigmoid(self, z):
        return 1.0 / (1.0 + np.exp(-z))

    def predict_proba(self, X):
        z = X.dot(self.w) + self.b
        return self.sigmoid(z)

    def predict(self, X, threshold=0.5):
        return (self.predict_proba(X) >= threshold).astype(int)

    def compute_gradients(self, X, y):
        """Compute gradients of log-loss wrt weights and bias for full batch X,y"""
        m = X.shape[0]
        probs = self.predict_proba(X)
        error = probs - y
        dw = (1.0 / m) * (X.T.dot(error))
        db = (1.0 / m) * np.sum(error)
        return {'w1': float(dw[0]), 'w2': float(dw[1]), 'w3': float(dw[2]), 'bias': float(db)}

    def train(self, X, y, lr=0.01, epochs=5):
        """Perform simple gradient descent; returns updated weights and gradients (delta from initial)."""
        init_w = self.w.copy()
        init_b = self.b

        for _ in range(epochs):
            grads = self.compute_gradients(X, y)
            self.w -= lr * np.array([grads['w1'], grads['w2'], grads['w3']])
            self.b -= lr * grads['bias']

        updated_weights = {'w1': float(self.w[0]), 'w2': float(self.w[1]), 'w3': float(self.w[2]), 'bias': float(self.b)}
        delta = {
            'w1': updated_weights['w1'] - float(init_w[0]),
            'w2': updated_weights['w2'] - float(init_w[1]),
            'w3': updated_weights['w3'] - float(init_w[2]),
            'bias': updated_weights['bias'] - float(init_b)
        }
        return updated_weights, delta

    def evaluate(self, X, y):
        """Return accuracy (0..1)"""
        if X.shape[0] == 0:
            return 0.0
        preds = self.predict(X)
        return float((preds == y).mean())

    def get_weights(self):
        return {'w1': float(self.w[0]), 'w2': float(self.w[1]), 'w3': float(self.w[2]), 'bias': float(self.b)}
