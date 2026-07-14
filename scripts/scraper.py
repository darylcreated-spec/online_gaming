import os
import sys
import re
import sqlite3
import argparse
import time
from datetime import datetime
import requests
from bs4 import BeautifulSoup

# Base URL for NLCB Lotto Plus Results
BASE_URL = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/"

# Database setup
DB_FILE = "data/lotto.db"
SCHEMA_FILE = "data/schema.sql"

# Turso Cloud DB Environment Variables
TURSO_DB_URL = os.environ.get("TURSO_DATABASE_URL", "")
TURSO_DB_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")

# Determine if we should use Turso HTTP client
USE_TURSO = bool(TURSO_DB_URL and TURSO_DB_TOKEN)

# Headers to mimic a real browser request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Standardize date format: "11-Jul-26" -> "2026-07-11"
def parse_date(date_str):
    date_str = date_str.replace("DATE:", "").strip()
    # Normalize spacing
    date_str = re.sub(r'\s+', ' ', date_str)
    # Parse month names
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%d-%B-%y", "%d-%B-%Y"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str

# Map Python types to libSQL typed JSON arguments for Turso HTTP API
def to_libsql_arg(val):
    if val is None:
        return {"type": "null"}
    if isinstance(val, int):
        return {"type": "integer", "value": str(val)}
    if isinstance(val, float):
        return {"type": "float", "value": val}
    return {"type": "text", "value": str(val)}

# Initialize local SQLite DB if needed
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
        # Format Turso URL from libsql:// to https://
        url = TURSO_DB_URL
        if url.startswith("libsql://"):
            url = url.replace("libsql://", "https://")
        
        endpoint = f"{url}/v2/pipeline"
        headers = {
            "Authorization": f"Bearer {TURSO_DB_TOKEN}",
            "Content-Type": "application/json",
        }
        
        # Build libSQL pipeline request
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
        res_data = response.json()
        
        # Parse result rows if returned
        try:
            exec_result = res_data["results"][0]["response"]["result"]
            rows = exec_result.get("rows", [])
            # Map columns and values back to tuple-like structure
            mapped_rows = []
            for row in rows:
                mapped_rows.append(tuple(
                    int(item["value"]) if item["type"] == "integer" else 
                    float(item["value"]) if item["type"] == "float" else 
                    None if item["type"] == "null" else item["value"]
                    for item in row
                ))
            return mapped_rows
        except (KeyError, IndexError, TypeError):
            return []

# Insert a draw record into the DB
def save_draw(conn, draw_data):
    sql = """
    INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    execute_sql(conn, sql, [
        draw_data["draw_number"],
        draw_data["draw_date"],
        draw_data["num1"],
        draw_data["num2"],
        draw_data["num3"],
        draw_data["num4"],
        draw_data["num5"],
        draw_data["powerball"],
        draw_data["multiplier"],
        draw_data["jackpot"]
    ])

# Parse latest draw from the main landing page
def scrape_homepage(session):
    print("Scraping main landing page...")
    response = session.get(BASE_URL, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    
    # 1. Extract sid token
    sid_input = soup.find("input", {"name": "sid"})
    sid = sid_input["value"] if sid_input else None
    
    # 2. Extract latest draw from #results
    results_div = soup.find("div", {"id": "results"})
    if not results_div:
        print("No results container found on homepage.")
        return None, sid
        
    date_el = results_div.find("strong")
    drawnum_el = results_div.find(class_="drawnum")
    
    if not date_el or not drawnum_el:
        print("Latest date or draw number not found.")
        return None, sid
        
    raw_date = date_el.text.strip()
    date_str = parse_date(raw_date)
    
    draw_match = re.search(r'Draw\s*#\s*(\d+)', drawnum_el.text, re.IGNORECASE)
    if not draw_match:
        print("Failed to parse draw number.")
        return None, sid
    draw_number = int(draw_match.group(1))
    
    # Extract balls
    balls = results_div.find_all(class_="ball")
    if len(balls) < 6:
        print(f"Expected at least 6 balls, found {len(balls)}")
        return None, sid
        
    numbers = []
    for ball in balls[:5]:
        numbers.append(int(ball.text.strip()))
    numbers.sort()
    
    powerball = int(balls[5].text.strip())
    
    # Extract multiplier
    multiplier_el = results_div.find(class_="multiplier")
    multiplier = "1x"
    if multiplier_el:
        mult_match = re.search(r'(\d+x)', multiplier_el.text, re.IGNORECASE)
        if mult_match:
            multiplier = mult_match.group(1).lower()
            
    # Extract jackpot
    jackpot_el = results_div.find(id="jackpot")
    jackpot = jackpot_el.text.strip() if jackpot_el else "Unknown"
    
    draw_data = {
        "draw_number": draw_number,
        "draw_date": date_str,
        "num1": numbers[0],
        "num2": numbers[1],
        "num3": numbers[2],
        "num4": numbers[3],
        "num5": numbers[4],
        "powerball": powerball,
        "multiplier": multiplier,
        "jackpot": jackpot
    }
    
    print(f"Scraped Homepage Latest: Draw #{draw_number} on {date_str} - Numbers: {numbers} PB: {powerball} Mult: {multiplier} Jackpot: {jackpot}")
    return draw_data, sid

# Scrape results for a specific month and year via POST
def scrape_month(session, month_str, year_val, sid):
    print(f"Scraping monthly draws for {month_str} {year_val}...")
    payload = {
        "lotto_month": month_str,
        "lotto_year": str(year_val),
        "month_year_btn": "SEARCH",
    }
    if sid:
        payload["sid"] = sid
        
    response = session.post(BASE_URL, data=payload, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    
    table = soup.find("table", {"id": "monthResults"})
    if not table:
        print(f"No results table found for {month_str} {year_val}.")
        return []
        
    tbody = table.find("tbody")
    if not tbody:
        tbody = table  # fallback if no tbody
        
    rows = tbody.find_all("tr")
    draws = []
    
    current_date = None
    for row in rows:
        cl = row.get("class", [])
        if "lotto-date-tr" in cl:
            date_strong = row.find("strong")
            if date_strong:
                current_date = parse_date(date_strong.text.strip())
        elif "lotto-tr" in cl:
            tds = row.find_all("td")
            if len(tds) >= 4 and current_date:
                try:
                    draw_num = int(tds[0].text.strip())
                    
                    nums_str = tds[1].text.strip()
                    nums = [int(n.strip()) for n in nums_str.split("-")]
                    nums.sort()
                    
                    pb = int(tds[2].text.strip())
                    
                    mult = tds[3].text.strip().replace("\n", "").replace("\t", "").strip().lower()
                    if not mult.endswith("x"):
                        mult = mult + "x"
                        
                    jackpot = "Unknown"
                    if len(tds) >= 5:
                        jackpot = tds[4].text.strip()
                        
                    draw_data = {
                        "draw_number": draw_num,
                        "draw_date": current_date,
                        "num1": nums[0],
                        "num2": nums[1],
                        "num3": nums[2],
                        "num4": nums[3],
                        "num5": nums[4],
                        "powerball": pb,
                        "multiplier": mult,
                        "jackpot": jackpot
                    }
                    draws.append(draw_data)
                except Exception as e:
                    print(f"Error parsing row: {e}")
                    
    print(f"Found {len(draws)} draws for {month_str} {year_val}.")
    return draws

def parse_play_whe_date(date_str):
    # Example format: "01-Jun-26" or "01-Jun-2026"
    parts = date_str.split("-")
    if len(parts) != 3:
        return date_str
    day, month_abbr, year = parts
    months_map = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
    }
    m = months_map.get(month_abbr, "01")
    if len(year) == 2:
        y = "20" + year
    else:
        y = year
    return f"{y}-{m}-{day.zfill(2)}"

def save_play_whe_draw(conn, draw_data):
    sql = """
    INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number)
    VALUES (?, ?, ?, ?)
    """
    execute_sql(conn, sql, [
        draw_data["draw_number"],
        draw_data["draw_date"],
        draw_data["draw_time_slot"],
        draw_data["winning_number"]
    ])

def scrape_play_whe_sid(session):
    url = "https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/"
    print(f"Scraping Play Whe page for sid: {url}")
    response = session.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    sid_input = soup.find("input", {"name": "sid"})
    sid = sid_input["value"] if sid_input else None
    return sid

def scrape_play_whe_month(session, month_str, year_val, sid):
    url = "https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/"
    print(f"Scraping Play Whe: {month_str} {year_val}...")
    payload = {
        "playwhe_month": month_str,
        "playwhe_year": str(year_val),
        "dateBtn": "SEARCH",
        "sid": sid
    }
    response = session.post(url, data=payload, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    
    table = soup.find("table")
    if not table:
        print(f"No table found for Play Whe: {month_str} {year_val}.")
        return []
        
    draws = []
    rows = table.find_all("tr")
    for row in rows:
        tds = row.find_all(["td", "th"])
        if len(tds) < 4:
            continue
        # Skip header
        if "Draw" in tds[0].text or "Draw#" in tds[0].text:
            continue
            
        try:
            draw_num = int(tds[0].text.strip())
            raw_date = tds[1].text.strip()
            formatted_date = parse_play_whe_date(raw_date)
            time_slot = tds[2].text.strip() # Morning, Midday, Afternoon, Evening
            
            raw_mark = tds[3].text.strip()
            mark_parts = raw_mark.split()
            if not mark_parts:
                continue
            winning_num = int(mark_parts[0])
            
            draws.append({
                "draw_number": draw_num,
                "draw_date": formatted_date,
                "draw_time_slot": time_slot,
                "winning_number": winning_num
            })
        except Exception as e:
            pass
            
    print(f"Found {len(draws)} Play Whe draws for {month_str} {year_val}.")
    return draws

def run_play_whe_scraper(args, conn):
    session = requests.Session()
    sid = scrape_play_whe_sid(session)
    
    if args.test:
        print(f"\nTEST RUN COMPLETE. Play Whe SID token found: {sid}")
        return
        
    if not sid:
        print("WARNING: Could not extract sid CSRF token. POST queries might fail.")
        
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_year = datetime.now().year
    
    if args.full:
        print("Starting FULL HISTORICAL PLAY WHE SCRAPING (2001 to present)...")
        for y in range(current_year, 2000, -1):
            for m in reversed(months):
                try:
                    month_draws = scrape_play_whe_month(session, m, y, sid)
                    for draw in month_draws:
                        save_play_whe_draw(conn, draw)
                    time.sleep(0.5)
                except Exception as e:
                    print(f"Error scraping Play Whe {m} {y}: {e}")
    else:
        print("Starting LATEST PLAY WHE MONTHS UPDATE (last 4 years)...")
        for y in [current_year, current_year - 1, current_year - 2, current_year - 3]:
            for m in reversed(months):
                try:
                    month_draws = scrape_play_whe_month(session, m, y, sid)
                    for draw in month_draws:
                        save_play_whe_draw(conn, draw)
                    time.sleep(0.3)
                except Exception as e:
                    print(f"Error scraping Play Whe {m} {y}: {e}")
                    
    print("\nPlay Whe Sync completed successfully.")

def main():
    parser = argparse.ArgumentParser(description="the Win Concept NLCB Scraper")
    parser.add_argument("--db", default=DB_FILE, help="Path to local SQLite DB file")
    parser.add_argument("--game", default="lotto-plus", choices=["lotto-plus", "play-whe"], help="Which NLCB game to scrape")
    parser.add_argument("--full", action="store_true", help="Perform full scrape from 2001 to present")
    parser.add_argument("--test", action="store_true", help="Dry run test - scrape homepage only and print")
    args = parser.parse_args()
    
    # Create DB connection
    conn = None
    if not args.test:
        if USE_TURSO:
            print(f"Connecting to Turso Cloud DB: {TURSO_DB_URL}")
        else:
            print(f"Connecting to local SQLite DB: {args.db}")
            conn = init_local_db()
            
    if args.game == "play-whe":
        run_play_whe_scraper(args, conn)
        if conn:
            conn.close()
        return

    session = requests.Session()
    
    # 1. Scrape latest draw and extract sid token
    latest_draw, sid = scrape_homepage(session)
    
    if args.test:
        print("\nTEST RUN COMPLETE. Data was not saved.")
        return
        
    if latest_draw:
        save_draw(conn, latest_draw)
        
    if not sid:
        print("WARNING: Could not extract sid CSRF token. POST queries might fail.")
        
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    current_year = datetime.now().year
    
    if args.full:
        print("Starting FULL HISTORICAL SCRAPING (2001 to present)...")
        # Loop backwards from current year down to 2001
        for y in range(current_year, 2000, -1):
            for m in reversed(months):
                try:
                    month_draws = scrape_month(session, m, y, sid)
                    for draw in month_draws:
                        save_draw(conn, draw)
                    time.sleep(0.5)  # Be polite, avoid rate limits
                except Exception as e:
                    print(f"Error scraping {m} {y}: {e}")
    else:
        print("Starting LATEST MONTHS UPDATE...")
        # Scrape current year down to 3 years ago to capture recent history (approx. 350+ draws)
        for y in [current_year, current_year - 1, current_year - 2, current_year - 3]:
            for m in reversed(months):
                try:
                    month_draws = scrape_month(session, m, y, sid)
                    for draw in month_draws:
                        save_draw(conn, draw)
                    # Check if we should stop. If we find draws that already exist, we keep going slightly 
                    # but don't need to loop years back.
                    time.sleep(0.3)
                except Exception as e:
                    print(f"Error scraping {m} {y}: {e}")

    print("\nSync completed successfully.")
    if conn:
        conn.close()

if __name__ == "__main__":
    main()
