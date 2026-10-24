# Technical Requirements Document (TRD)
**Architecture:** Local Python Webhook + Lightweight Relational Database

## 1. Technology Stack
*   **Compute:** Local Intel Celeron N4000 Linux Machine (Ubuntu/Debian based).
*   **Language:** Python 3.10+
*   **Web Framework:** FastAPI (with Uvicorn server) for high-performance, asynchronous webhook handling.
*   **Database:** SQLite (Local file-based DB, perfect for Level 0 and highly efficient on 4GB RAM/64GB Storage).
*   **Networking:** Cloudflare Tunnel (`cloudflared`) to expose local port 8000 securely to the public internet without router port forwarding.
*   **Messaging API:** Meta WhatsApp Cloud API (Official).

## 2. System Architecture
1.  **Input:** User sends a WhatsApp message.
2.  **Routing:** Meta forwards the payload to the Cloudflare Tunnel URL.
3.  **Tunnel:** Cloudflare routes traffic to `localhost:8000` on the Linux machine.
4.  **Processing:** FastAPI receives the POST request, parses the text, and interacts with SQLite.
5.  **Output:** FastAPI triggers an HTTP POST back to Meta's API to send the reply to the user.

## 3. Performance & Security
*   **Memory Footprint:** The entire stack (FastAPI + SQLite + Cloudflared) will consume < 150MB RAM, operating well within the 4GB limit.
*   **Security:** SQLite database is stored locally; data never leaves the Linux machine. The webhook endpoint verifies Meta's verification tokens.