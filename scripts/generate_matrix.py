import os
import sys
import sqlite3
import argparse
import itertools
import requests

# Database setup
DB_FILE = "data/lotto.db"
SCHEMA_FILE = "data/schema.sql"

# Turso Cloud DB Environment Variables
TURSO_DB_URL = os.environ.get("TURSO_DATABASE_URL", "")
TURSO_DB_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")
USE_TURSO = bool(TURSO_DB_URL and TURSO_DB_TOKEN)

# Map Python types to libSQL typed JSON arguments for Turso HTTP API
def to_libsql_arg(val):
    if val is None:
        return {"type": "null"}
    if isinstance(val, int):
        return {"type": "integer", "value": str(val)}
    if isinstance(val, float):
        return {"type": "float", "value": val}
    return {"type": "text", "value": str(val)}

def init_local_db():
    if not os.path.exists("data"):
        os.makedirs("data")
    conn = sqlite3.connect(DB_FILE)
    if os.path.exists(SCHEMA_FILE):
        with open(SCHEMA_FILE, "r") as f:
            conn.executescript(f.read())
    conn.commit()
    return conn

# Execute SQL statement on SQLite locally or Turso via HTTP
def execute_sql(conn, sql, args=[]):
    if not USE_TURSO:
        cursor = conn.cursor()
        cursor.execute(sql, args)
        conn.commit()
        return cursor.fetchall()
    else:
        url = TURSO_DB_URL
        if url.startswith("libsql://"):
            url = url.replace("libsql://", "https://")
        
        endpoint = f"{url}/v2/pipeline"
        headers = {
            "Authorization": f"Bearer {TURSO_DB_TOKEN}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "requests": [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql,
                        "args": [to_libsql_arg(x) for x in args]
                    }
                },
                {"type": "close"}
            ]
        }
        
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        res_json = response.json()
        
        # Parse return rows
        try:
            results = res_json["results"][0]["response"]["result"]
            cols = results["cols"]
            rows = results["rows"]
            parsed_rows = []
            for r in rows:
                row_vals = []
                for val in r:
                    if "value" in val:
                        row_vals.append(val["value"])
                    else:
                        row_vals.append(None)
                parsed_rows.append(tuple(row_vals))
            return parsed_rows
        except KeyError:
            return []

# Batch execute insertion query for high-performance
def execute_batch_insert(conn, batch):
    if not USE_TURSO:
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO eligible_combinations (num1, num2, num3, num4, num5) VALUES (?, ?, ?, ?, ?)",
            batch
        )
        conn.commit()
    else:
        url = TURSO_DB_URL
        if url.startswith("libsql://"):
            url = url.replace("libsql://", "https://")
        
        endpoint = f"{url}/v2/pipeline"
        headers = {
            "Authorization": f"Bearer {TURSO_DB_TOKEN}",
            "Content-Type": "application/json",
        }
        
        # Build transaction with multiple statement requests
        requests_list = []
        for row in batch:
            requests_list.append({
                "type": "execute",
                "stmt": {
                    "sql": "INSERT INTO eligible_combinations (num1, num2, num3, num4, num5) VALUES (?, ?, ?, ?, ?)",
                    "args": [to_libsql_arg(x) for x in row]
                }
            })
        requests_list.append({"type": "close"})
        
        payload = {"requests": requests_list}
        response = requests.post(endpoint, json=payload, headers=headers, timeout=60)
        response.raise_for_status()

def main():
    print("Connecting to database...", flush=True)
    conn = None if USE_TURSO else init_local_db()
    
    # 1. Fetch historical combinations (Filter C)
    print("Loading historical drawings...", flush=True)
    historical_rows = execute_sql(conn, "SELECT num1, num2, num3, num4, num5 FROM draws")
    
    historical_set = set()
    for row in historical_rows:
        # Sort just in case they were saved unsorted
        sorted_draw = tuple(sorted([int(row[0]), int(row[1]), int(row[2]), int(row[3]), int(row[4])]))
        historical_set.add(sorted_draw)
        
    print(f"Loaded {len(historical_set)} unique historical combinations.", flush=True)

    # 2. Clear old eligible combinations
    print("Clearing old eligible combinations...", flush=True)
    execute_sql(conn, "DELETE FROM eligible_combinations")

    # Double numbers repeating subset (Filter E)
    R = {11, 22, 33}

    print("Generating & filtering combinations...", flush=True)
    eligible_batch = []
    total_generated = 0
    total_eligible = 0
    batch_size = 5000 if not USE_TURSO else 100 # Batch size limits for Turso REST pipeline

    # Generate combinations of 5 from 1 to 35
    for comb in itertools.combinations(range(1, 36), 5):
        total_generated += 1
        
        # Filter A: Implicitly uniqueness (sorted range)
        x1, x2, x3, x4, x5 = comb

        # Filter B: Continuous sequence (straight run check)
        if x2 - x1 == 1 and x3 - x2 == 1 and x4 - x3 == 1 and x5 - x4 == 1:
            continue

        # Filter C: Historical draws exclusion
        if comb in historical_set:
            continue

        # Filter D: Fixed Arithmetic Progressions
        d1 = x2 - x1
        d2 = x3 - x2
        d3 = x4 - x3
        d4 = x5 - x4
        if d1 == d2 == d3 == d4:
            continue

        # Filter E: Repeating-Digit Cluster Limit
        doubles_count = sum(1 for x in comb if x in R)
        if doubles_count >= 2:
            continue

        # Filter F: Odd/Even Balanced Ratio
        odds_count = sum(1 for x in comb if x % 2 != 0)
        if odds_count == 5 or odds_count == 0:
            continue

        # Filter G: High/Low Distribution Boundary (Low: 1-17, High: 18-35)
        lows_count = sum(1 for x in comb if x <= 17)
        if lows_count == 5 or lows_count == 0:
            continue

        # Filter H: Summation Variance Window (65 to 115)
        comb_sum = x1 + x2 + x3 + x4 + x5
        if comb_sum < 65 or comb_sum > 115:
            continue

        # Filter I: Last-Digit Congruence Limit (no terminal digit frequency >= 3)
        digits = [x % 10 for x in comb]
        digit_counts = {}
        for d in digits:
            digit_counts[d] = digit_counts.get(d, 0) + 1
        if any(cnt >= 3 for cnt in digit_counts.values()):
            continue

        # Add to batch if passes all filters
        eligible_batch.append(comb)
        total_eligible += 1

        if len(eligible_batch) >= batch_size:
            execute_batch_insert(conn, eligible_batch)
            eligible_batch = []
            if total_eligible % 10000 == 0 or total_eligible == batch_size:
                print(f"Processed... eligible pool count: {total_eligible}", flush=True)

    # Insert remaining rows
    if eligible_batch:
        execute_batch_insert(conn, eligible_batch)

    print(f"Generation Complete!", flush=True)
    print(f"Total Combinations evaluated: {total_generated}", flush=True)
    print(f"Total Eligible Combinations written: {total_eligible} ({((total_eligible/total_generated)*100):.2f}% of universe)", flush=True)

if __name__ == "__main__":
    main()
