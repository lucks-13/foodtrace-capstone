from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from web3 import Web3
import uvicorn
import pandas as pd
import os

# --------------------------------------------------
# APP SETUP
# --------------------------------------------------
app = FastAPI(title="FoodTrace Safety API", version="1.0.0")

# 🔥 CORS - ALLOW FRONTEND ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite + React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# BLOCKCHAIN SETUP
# --------------------------------------------------
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:7545"))

CONTRACT_ADDRESS = "0xebc162045f0a15db16669dd9c0ebc0bf4f80f48d"
ACCOUNT = "0x4462974d0439FfE559DEf749b3e4d6726E916B8d"
PRIVATE_KEY = "0x818071e324cfb0b9b1f00e5eb302930d978348890df2fc3756a7fb658fcb8717"

ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "id", "type": "string"},
            {"internalType": "string", "name": "data", "type": "string"},
        ],
        "name": "addBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "id", "type": "string"}],
        "name": "getBatch",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
]

contract = w3.eth.contract(
    address=w3.to_checksum_address(CONTRACT_ADDRESS),
    abi=ABI,
)

# --------------------------------------------------
# DATASET
# --------------------------------------------------
DATA_FILE = "data/tamilnaducropprod.csv"
df = None

def load_dataset():
    global df
    if os.path.exists(DATA_FILE):
        df = pd.read_csv(DATA_FILE)
        df["District"] = df["District"].astype(str).str.strip().str.upper()
        print(f"✅ Dataset loaded: {len(df)} records")
    else:
        print("❌ Dataset not found")

load_dataset()

# --------------------------------------------------
# MODELS
# --------------------------------------------------
class BatchData(BaseModel):
    batch_id: str
    data: str

# --------------------------------------------------
# ROOT
# --------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "FoodTrace API LIVE",
        "contract": CONTRACT_ADDRESS,
        "account": ACCOUNT,
        "dataset_loaded": df is not None,
        "records": int(len(df)) if df is not None else 0,
    }

# --------------------------------------------------
# DISTRICTS
# --------------------------------------------------
@app.get("/districts")
def get_districts():
    if df is None:
        return {"districts": []}
    return {"districts": sorted(df["District"].unique().tolist())}

# --------------------------------------------------
# SAFETY
# --------------------------------------------------
@app.get("/safety/{district}")
def get_safety(district: str):
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded")

    d = district.strip().upper()
    ddf = df[df["District"] == d]

    if ddf.empty:
        raise HTTPException(status_code=404, detail="District not found")

    total_area = int(ddf["Area"].sum())
    records = int(ddf.shape[0])
    priority = bool(total_area > 30000)

    risk = (
        "HIGH" if total_area > 50000
        else "MEDIUM" if total_area > 20000
        else "LOW"
    )

    return {
        "district": d,
        "total_area_ha": total_area,
        "risk_level": risk,
        "priority_monitoring": priority,
        "records_count": records,
    }

# --------------------------------------------------
# STATS - TOP RISKY DISTRICTS
# --------------------------------------------------
@app.get("/stats")
def get_risky_districts():
    if df is None:
        return {"districts": []}

    district_totals = df.groupby("District")["Area"].sum()
    stats = []

    for district, total in district_totals.nlargest(5).items():
        total = int(total)
        stats.append({
            "district": str(district).strip().upper(),
            "total_area": total,
            "risk": (
                "HIGH" if total > 50000
                else "MEDIUM" if total > 20000
                else "LOW"
            ),
            "priority": bool(total > 30000),
            "records": 100  # frontend-safe placeholder
        })

    return {"districts": stats}

# --------------------------------------------------
# ADD BATCH
# --------------------------------------------------
@app.post("/add-batch")
async def add_batch(batch: BatchData):
    try:
        nonce = w3.eth.get_transaction_count(ACCOUNT)

        tx = contract.functions.addBatch(
            batch.batch_id,
            batch.data
        ).build_transaction({
            "from": ACCOUNT,
            "nonce": nonce,
            "gas": 200000,
            "maxFeePerGas": w3.to_wei("2", "gwei"),
            "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
            "type": 2,
        })

        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        return {
            "tx_hash": tx_hash.hex(),
            "batch_id": batch.batch_id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------
# TRACE
# --------------------------------------------------
@app.get("/trace/{batch_id}")
async def trace_batch(batch_id: str):
    try:
        data = contract.functions.getBatch(batch_id).call()
        return {"batch_id": batch_id, "data": data}
    except Exception:
        raise HTTPException(status_code=404, detail="Batch not found")

# --------------------------------------------------
# RUN
# --------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
