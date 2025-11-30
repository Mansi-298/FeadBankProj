import os
from pymongo import MongoClient
from bson.objectid import ObjectId


def get_mongo_client():
    uri = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/fedbank'
    return MongoClient(uri)


def load_bank(bank_id):
    client = get_mongo_client()
    db = client.get_default_database()
    banks = db.get_collection('banks')
    bank = banks.find_one({'_id': ObjectId(bank_id)})
    if not bank:
        raise ValueError('Bank not found: %s' % bank_id)
    # Ensure transactions and localModel exist
    transactions = bank.get('transactions', [])
    local_model = bank.get('localModel', {}).get('weights', {})
    return {
        'bankId': str(bank['_id']),
        'name': bank.get('name'),
        'transactions': transactions,
        'localModel': {
            'weights': local_model
        }
    }


def get_global_model():
    """Fetch the current active global model from database"""
    client = get_mongo_client()
    db = client.get_default_database()
    global_models = db.get_collection('globalmodels')
    
    model = global_models.find_one({'isActive': True})
    
    if model and 'weights' in model:
        return model['weights']
    else:
        # Return default weights if no global model exists
        return {'w1': 0.0, 'w2': 0.0, 'w3': 0.0, 'bias': 0.0}


def save_bank_local_model(bank_id, new_weights, accuracy):
    client = get_mongo_client()
    db = client.get_default_database()
    banks = db.get_collection('banks')
    banks.update_one({'_id': ObjectId(bank_id)}, {'$set': {
        'localModel.weights': new_weights,
        'localModel.lastUpdated': __import__('datetime').datetime.utcnow(),
        'statistics.currentAccuracy': accuracy
    }})


def dump_json(obj, fp):
    import json
    with open(fp, 'w', encoding='utf8') as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)


def load_json(fp):
    import json
    with open(fp, 'r', encoding='utf8') as f:
        return json.load(f)