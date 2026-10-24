import logging
from typing import Optional, Dict, Any
import requests
from config.settings import settings

logger = logging.getLogger("whatsapp_service")


def extract_message_info(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse Meta WhatsApp Cloud API incoming webhook payload.
    Returns a dict with sender_phone, message_text, message_id, timestamp
    or None if the payload contains status updates or non-text messages.
    """
    try:
        entries = payload.get("entry", [])
        if not entries:
            return None

        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # If it's a message status update (sent/delivered/read), ignore gracefully
                if "statuses" in value:
                    logger.debug("Received delivery status update: %s", value["statuses"])
                    return None

                messages = value.get("messages", [])
                if not messages:
                    continue

                msg = messages[0]
                msg_type = msg.get("type", "")
                sender = msg.get("from", "")
                msg_id = msg.get("id", "")
                timestamp = msg.get("timestamp", "")

                # Handle text messages
                if msg_type == "text":
                    body = msg.get("text", {}).get("body", "").strip()
                    return {
                        "sender_phone": sender,
                        "message_text": body,
                        "message_id": msg_id,
                        "timestamp": timestamp,
                        "type": "text"
                    }
                else:
                    logger.info("Received non-text message type: %s from %s", msg_type, sender)
                    return {
                        "sender_phone": sender,
                        "message_text": "",
                        "message_id": msg_id,
                        "timestamp": timestamp,
                        "type": msg_type
                    }

    except Exception as e:
        logger.error("Error parsing webhook payload: %s", e, exc_info=True)
        return None

    return None


def send_whatsapp_message(to_phone: str, text: str) -> Dict[str, Any]:
    """
    Send an outgoing WhatsApp text message via Meta Cloud API.
    If real Meta credentials are not configured, runs in simulated mode (logs to console).
    """
    if not settings.is_live_meta_configured:
        logger.info(
            "\n[SIMULATED WHATSAPP OUTBOUND]\nTo: %s\nMessage:\n%s\n---------------------------------",
            to_phone, text
        )
        return {
            "status": "simulated",
            "to": to_phone,
            "message": text
        }

    url = f"https://graph.facebook.com/{settings.META_API_VERSION}/{settings.PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text
        }
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10.0)
        response.raise_for_status()
        res_json = response.json()
        logger.info("Message sent successfully to %s: %s", to_phone, res_json)
        return res_json
    except requests.exceptions.RequestException as e:
        logger.error("Failed to send WhatsApp message to %s: %s", to_phone, e)
        if hasattr(e, "response") and e.response is not None:
            logger.error("Meta response details: %s", e.response.text)
        return {
            "status": "error",
            "error": str(e),
            "details": getattr(e.response, "text", "") if hasattr(e, "response") and e.response else ""
        }
