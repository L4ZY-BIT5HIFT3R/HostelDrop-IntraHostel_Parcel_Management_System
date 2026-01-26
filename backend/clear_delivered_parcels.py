import os
from dotenv import load_dotenv
from pymongo import MongoClient

def main():
    # Load environment variables from backend/.env
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'hostel_parcel_db')

    client = MongoClient(mongo_url)
    db = client[db_name]

    result = db.parcels.delete_many({"status": "DELIVERED"})
    print(f"Deleted {result.deleted_count} delivered parcel(s) from '{db_name}.parcels'.")

if __name__ == '__main__':
    main()
