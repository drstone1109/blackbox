# Master Implementation Plan (Local Linux Environment)

## Day 1: Local Environment & Webhook Setup
1. **Linux Prep:** Turn on the Celeron machine. Open terminal.
2. **Install Dependencies:**
   `sudo apt update && sudo apt install python3-venv python3-pip`
3. **Create Project:**
   `mkdir general-erp && cd general-erp`
   `python3 -m venv venv && source venv/bin/activate`
   `pip install fastapi uvicorn sqlite3 requests`
4. **Cloudflare Tunnel:**
   Install `cloudflared` via `.deb` package. Run `cloudflared tunnel --url http://localhost:8000` and save the generated `trycloudflare.com` URL.

## Day 2: Database & Core Logic
1. **SQLite Initialization:** Create `database.py` to execute the schema creation (from Document 5).
2. **Command Parser:** Build `parser.py` to split incoming text (e.g., `IN 101 5`) into actionable variables (`command="IN"`, `item="101"`, `qty=5`).
3. **FastAPI Endpoints:** Build `main.py` with a simple `/webhook` POST route to receive the Meta payloads.

## Day 3: Meta API Integration & Live Testing
1. **Meta App Creation:** Go to developers.facebook.com, create a WhatsApp App, and get the temporary access token and Test Phone Number.
2. **Webhook Verification:** Configure FastAPI to respond to Meta's `hub.challenge` GET request to verify the URL.
3. **Connect Tunnel:** Paste your Cloudflare URL into the Meta Webhook settings.
4. **First Message:** Send `STOCK 101` from your personal phone to the test number. Check your Linux terminal logs to see the request arrive, hit SQLite, and fire the HTTP response back.