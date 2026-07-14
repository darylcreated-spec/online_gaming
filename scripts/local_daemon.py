import os
import sys
import time
import subprocess
from datetime import datetime, timedelta

# Daily trigger slots (AST local time, 3 minutes after draw times)
PLAY_WHE_TRIGGERS = ["10:33", "13:03", "16:03", "19:03"]
LOTTO_PLUS_TRIGGER = "20:33" # Wednesday and Saturday

def log_message(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)

def run_scraper(game):
    log_message(f"Triggering sync for game: {game}")
    try:
        # Run scraper.py as a subprocess
        cmd = [sys.executable, "scripts/scraper.py", "--game", game]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        log_message(f"Scraper output for {game}: {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        log_message(f"Error running scraper for {game}: {e.stderr}")

def main():
    log_message("Starting NLCB Local Sync Daemon...")
    log_message(f"Play Whe Triggers: {PLAY_WHE_TRIGGERS}")
    log_message(f"Lotto Plus Trigger: {LOTTO_PLUS_TRIGGER} (Wednesdays and Saturdays)")
    
    last_triggered_minute = ""

    while True:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date_time = now.strftime("%Y-%m-%d %H:%M")
        
        # Check if we already triggered in this minute
        if current_date_time != last_triggered_minute:
            # Check Play Whe
            if current_time in PLAY_WHE_TRIGGERS:
                last_triggered_minute = current_date_time
                run_scraper("play-whe")
                
            # Check Lotto Plus (Wednesday=2, Saturday=5 in Python weekday where Monday=0)
            elif current_time == LOTTO_PLUS_TRIGGER and now.weekday() in (2, 5):
                last_triggered_minute = current_date_time
                run_scraper("lotto-plus")
                run_scraper("play-whe") # Play Whe also has a 7:00 PM draw, but Lotto Plus is drawn 8:30 PM.
                
        # Sleep 15 seconds to prevent high CPU utilization while ensuring we don't miss the minute mark
        time.sleep(15)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log_message("Daemon stopped by user.")
        sys.exit(0)
