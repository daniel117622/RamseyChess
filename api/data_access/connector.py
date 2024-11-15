from pymongo import MongoClient
import time
from data_access.elo_service import EloService

mongo_url = "mongodb://root:root@34.172.128.64:27018/"
max_retries = 5
retry_interval = 10  # seconds

for attempt in range(max_retries):
    try:
        client : MongoClient = MongoClient(mongo_url)
        client.admin.command('ping')  # Simple ping to test the connection
        print("Successfully connected to MongoDB")
        db = client["chess"]
        elo_service = EloService()
        break
    except Exception as e:
        print(f"Attempt {attempt + 1} to connect to MongoDB failed: {e}")
        time.sleep(retry_interval)

if not client:
    raise Exception("Could not connect to MongoDB after multiple retries")