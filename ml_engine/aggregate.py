import sys
import json
import os
import numpy as np


def load_updates(fp):
    with open(fp, 'r', encoding='utf8') as f:
        return json.load(f)


def fedavg(updates):
    # updates is a list of objects with 'gradients' and 'dataSize'
    total = sum(u.get('dataSize', 0) for u in updates)
    if total == 0:
        # average unweighted
        keys = ['w1', 'w2', 'w3', 'bias']
        avg = {k: float(np.mean([u['gradients'].get(k, 0.0) for u in updates])) for k in keys} if updates else {k:0.0 for k in keys}
        return avg, len(updates), 0

    agg = {'w1': 0.0, 'w2': 0.0, 'w3': 0.0, 'bias': 0.0}
    for u in updates:
        ds = u.get('dataSize', 0)
        grads = u.get('gradients', {})
        for k in agg.keys():
            agg[k] += grads.get(k, 0.0) * ds

    for k in agg.keys():
        agg[k] = float(agg[k] / total)

    return agg, len(updates), int(total)


def main(updates_file):
    updates = load_updates(updates_file)
    aggregated_gradient, participating, total = fedavg(updates)
    out = {
        'aggregated_gradient': aggregated_gradient,
        'participatingBanks': participating,
        'totalDataPoints': total
    }
    sys.stdout.write(json.dumps(out))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: aggregate.py <updates_json_file>')
        sys.exit(2)
    main(sys.argv[1])
