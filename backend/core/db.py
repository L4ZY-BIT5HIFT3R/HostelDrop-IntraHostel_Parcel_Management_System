"""MongoDB client and database handles."""
from motor.motor_asyncio import AsyncIOMotorClient

from .config import LEFT_USERS_DB_NAME, MONGO_URL, PRIMARY_DB_NAME

client = AsyncIOMotorClient(MONGO_URL)
db = client[PRIMARY_DB_NAME]
left_users_db = client[LEFT_USERS_DB_NAME]
