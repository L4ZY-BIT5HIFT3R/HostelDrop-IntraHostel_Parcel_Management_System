import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import random
import string

MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "hosteldrop")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

def generate_display_id(description):
    prefix = "U"
    if description:
        desc_upper = description.upper()
        if "FLIPKART" in desc_upper: prefix = "F"
        elif "AMAZON" in desc_upper: prefix = "A"
        elif "MYNTRA" in desc_upper: prefix = "M"
        elif "BLINKIT" in desc_upper: prefix = "B"
        elif "SWIGGY" in desc_upper: prefix = "S"
        elif "ZOMATO" in desc_upper: prefix = "Z"
        else:
            alpha_chars = [c for c in desc_upper if c.isalpha()]
            if alpha_chars:
                prefix = alpha_chars[0]
            
    rand_num = "".join(random.choices(string.digits, k=4))
    return f"P{prefix}{rand_num}"

async def main():
    total_updated = 0
    while True:
        cursor = db.parcels.find({"display_id": {"$exists": False}})
        parcels = await cursor.to_list(length=1000)
        
        if not parcels:
            break
            
        count = 0
        for parcel in parcels:
            display_id = generate_display_id(parcel.get("description"))
            await db.parcels.update_one({"_id": parcel["_id"]}, {"$set": {"display_id": display_id}})
            count += 1
            
        total_updated += count
        print(f"Updated {count} parcels in this batch...")
        
    print(f"Finished! Total updated: {total_updated} parcels.")

if __name__ == "__main__":
    asyncio.run(main())
