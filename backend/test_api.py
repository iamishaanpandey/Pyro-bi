import requests
import time
import os

BASE = "http://localhost:8000"
FILE_PATH = os.path.join(os.path.dirname(__file__), "data", "sample_data.csv")

def run_test():
    print("--- 1. Clear Data ---")
    requests.post(f"{BASE}/clear-data")

    print("--- 2. Upload CSV ---")
    with open(FILE_PATH, "rb") as f:
        res = requests.post(f"{BASE}/upload-csv", files={"file": f})
    print("Upload Response:", res.status_code, res.json().get("table_name", "ERROR"))

    print("--- 3. Run Query ---")
    q_res = requests.post(f"{BASE}/query", json={"query": "Show me total sales by region", "session_id": "test_1"})
    data = q_res.json()
    print("Chart Type:", data.get("chart_type"))
    echarts = data.get("echarts_config", {})
    title = echarts.get("title", {})
    print("ECharts Title:", title)
    print("ECharts Series present:", "series" in echarts)
    
    print("--- 4. Save Session ---")
    s_res = requests.post(f"{BASE}/sessions", json={
        "title": "API Test Session",
        "query": "Show me total sales by region",
        "state": data
    })
    print("Save Session:", s_res.status_code, s_res.json().get("id", "ERROR"))
    
    print("--- 5. List Sessions ---")
    sessions = requests.get(f"{BASE}/sessions").json()
    print("Total Sessions:", len(sessions.get("sessions", [])))
    
    print("--- 6. Clear Data Again ---")
    requests.post(f"{BASE}/clear-data")
    print("DONE.")

if __name__ == "__main__":
    run_test()
