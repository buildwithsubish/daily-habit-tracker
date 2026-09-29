"""
WhatsApp Automation Server using Playwright
Production-ready, optimized, with anti-bot measures
"""

import asyncio
import json
import os
import random
import re
import signal
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Load environment variables from .env.local
load_dotenv(dotenv_path=".env.local")

# Configuration
USER_DATA_DIR = os.path.abspath(os.getenv("WHATSAPP_SESSION_DIR", "./whatsapp_sessions"))
# Default to True (headless browser), set WHATSAPP_HEADLESS=false for visible browser
HEADLESS = os.getenv("WHATSAPP_HEADLESS", "true").strip().lower() != "false"
CHANNEL = os.getenv("WHATSAPP_BROWSER", "chrome").strip()
SERVER_PORT = int(os.getenv("WHATSAPP_SERVER_PORT", "8765"))
SERVER_HOST = os.getenv("WHATSAPP_SERVER_HOST", "127.0.0.1").strip()
# Node.js API endpoint for session persistence
NODEJS_API_URL = os.getenv("NODEJS_API_URL", "http://127.0.0.1:3000/api/admin/whatsapp/session")
ADMIN_ID = os.getenv("ADMIN_ID", "694f9b2feb3b0136ebada5cb")

# MongoDB configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/daily-habit-tracker")
DB_NAME = os.getenv("DB_NAME", "daily-habit-tracker")

# Global MongoDB client
mongo_client = None
db = None

# Create session directory
Path(USER_DATA_DIR).mkdir(parents=True, exist_ok=True)

COUNTRY_DIAL_CODES: Dict[str, str] = {
    "India": "+91",
    "United States": "+1",
    "United Kingdom": "+44",
    "United Arab Emirates": "+971",
    "Canada": "+1",
    "Australia": "+61",
}


def resolve_dial_code(country: str, country_code: Optional[str] = None) -> str:
    if country_code:
        digits = "".join(c for c in country_code if c.isdigit())
        if digits:
            return f"+{digits}"
    return COUNTRY_DIAL_CODES.get(country, "")


def sanitize_local_phone_number(phone_number: str, country_code: Optional[str] = None) -> str:
    raw = phone_number.strip()
    if raw.startswith("+"):
        raw = raw[1:]
    digits = "".join(c for c in raw if c.isdigit())
    if not digits:
        return ""
    dial_digits = ""
    if country_code:
        dial_digits = "".join(c for c in country_code if c.isdigit())
    if not dial_digits:
        for _country, dial in COUNTRY_DIAL_CODES.items():
            code = dial.lstrip("+")
            if digits.startswith(code) and len(digits) > len(code):
                dial_digits = code
                break
    if dial_digits and digits.startswith(dial_digits) and len(digits) > len(dial_digits):
        digits = digits[len(dial_digits):]
    return digits.lstrip("0") or digits


def format_phone_input_number(phone_number: str, country_code: Optional[str] = None) -> str:
    """Format for WhatsApp phone input: country code + local digits (e.g. 919876543210)."""
    local = sanitize_local_phone_number(phone_number, country_code)
    if not local:
        return ""
    dial_digits = "".join(c for c in (country_code or "91") if c.isdigit()) or "91"
    if local.startswith(dial_digits) and len(local) > len(dial_digits):
        return local
    return f"{dial_digits}{local}"


def connect_to_mongodb():
    """Establish connection to MongoDB"""
    global mongo_client, db
    try:
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Test the connection
        mongo_client.admin.command('ping')
        db = mongo_client[DB_NAME]
        print(f"[MongoDB] Connected successfully to {DB_NAME}")
        return True
    except ConnectionFailure as e:
        print(f"[MongoDB] Connection failed: {e}")
        return False
    except Exception as e:
        print(f"[MongoDB] Unexpected error: {e}")
        return False


def set_in_use(session_id: str, in_use: bool) -> bool:
    """Set the in_use flag for a session"""
    global db
    if db is None:
        if not connect_to_mongodb():
            print("[MongoDB] Cannot set in_use - not connected")
            return False
    
    try:
        collection = db["whatsappsessions"]
        # Try to find by ADMIN_SESSION_ID first, then by adminIdString
        query = {"ADMIN_SESSION_ID": session_id}
        session = collection.find_one(query)
        
        if not session:
            query = {"adminIdString": session_id}
        
        result = collection.update_one(
            query,
            {
                "$set": {
                    "in_use": in_use,
                    "in_use_since": datetime.now() if in_use else None,
                    "updatedAt": datetime.now()
                }
            },
            upsert=True
        )
        
        if result.modified_count > 0 or result.upserted_id:
            print(f"[MongoDB] in_use set to {in_use} for session {session_id}")
            return True
        else:
            # Try to at least insert if update didn't work
            collection.update_one(
                query,
                {
                    "$set": {
                        "in_use": in_use,
                        "in_use_since": datetime.now() if in_use else None,
                        "updatedAt": datetime.now()
                    }
                },
                upsert=True
            )
            return True
    except Exception as e:
        print(f"[MongoDB] Error setting in_use: {e}")
        return False


def get_in_use(session_id: str) -> bool:
    """Check if a session is currently in use"""
    global db
    if db is None:
        if not connect_to_mongodb():
            return False
    
    try:
        collection = db["whatsappsessions"]
        # Try to find by ADMIN_SESSION_ID first, then by adminIdString
        session = collection.find_one({"ADMIN_SESSION_ID": session_id})
        
        if not session:
            session = collection.find_one({"adminIdString": session_id})
        
        if session:
            return session.get("in_use", False)
        return False
    except Exception as e:
        print(f"[MongoDB] Error getting in_use: {e}")
        return False


async def get_admin_id_from_db():
    """Fetch the most recent active adminId from MongoDB"""
    global db
    
    if db is None:
        if not connect_to_mongodb():
            print("[MongoDB] Using fallback adminId from environment")
            return os.getenv("ADMIN_ID", "694f9b2feb3b0136ebada5cb")
    
    try:
        # Query for the most recent session with session data or connected status
        collection = db["whatsappsessions"]
        session = collection.find_one({
            "$or": [
                {"sessionData": {"$exists": True, "$ne": None, "$ne": ""}},
                {"status": "connected"}
            ]
        }, sort=[("updatedAt", -1), ("createdAt", -1)])
        
        if session:
            # Extract adminId from session in priority order
            admin_id = (
                session.get("ADMIN_SESSION_ID") or 
                session.get("adminIdString") or 
                str(session.get("adminId", "")) or
                None
            )
            
            if admin_id:
                print(f"[MongoDB] Found active session with adminId: {admin_id}")
                return admin_id
            else:
                print("[MongoDB] Session found but no valid adminId")
        
        print("[MongoDB] No active session found, using fallback")
        return os.getenv("ADMIN_ID", "694f9b2feb3b0136ebada5cb")
        
    except Exception as e:
        print(f"[MongoDB] Error fetching adminId: {e}")
        return os.getenv("ADMIN_ID", "694f9b2feb3b0136ebada5cb")


async def get_current_admin_id():
    """Get current adminId, with database fallback"""
    # Always try database first for the most recent session
    try:
        admin_id = await get_admin_id_from_db()
        if admin_id is not None and admin_id != os.getenv("ADMIN_ID", "694f9b2feb3b0136ebada5cb"):
            print(f"[Dynamic] Using adminId from database: {admin_id}")
            return admin_id
    except Exception as e:
        print(f"[Dynamic] Database query failed: {e}")
    
    # Fallback to environment variable
    env_admin_id = os.getenv("ADMIN_ID")
    print(f"[Dynamic] Using fallback adminId from environment: {env_admin_id}")
    return env_admin_id or "694f9b2feb3b0136ebada5cb"


class WhatsAppClient:
    """WhatsApp Web client using Playwright"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.session_path = os.path.join(USER_DATA_DIR, session_id)
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.status = "disconnected"
        self.phone_number = None
        self.qr_code = None
        self._initialization_lock = asyncio.Lock()  # Prevent concurrent initialization attempts
        self._is_initializing = False  # Flag to track if initialization is in progress
        self._event_queue: asyncio.Queue = asyncio.Queue()
        self._db_session_data: Optional[str] = None  # Store DB session data
        
    def set_db_session(self, session_data: str):
        """Set session data from database"""
        self._db_session_data = session_data
    
    async def _send_session_to_nodejs_api(self, session_data: str) -> Dict[str, Any]:
        """Send session data to Node.js API for persistence"""
        try:
            # Get current adminId dynamically
            admin_id = await get_current_admin_id()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    NODEJS_API_URL,
                    json={
                        "action": "save_session",
                        "sessionData": session_data,
                        "adminId": admin_id
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Session saved to Node.js API: {result.get('cookieCount', '?')} cookies")
                    return {"success": True, "result": result}
                else:
                    print(f"⚠️ Failed to save session to Node.js API: {response.status_code}")
                    return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            print(f"⚠️ Error sending session to Node.js API: {e}")
            return {"success": False, "error": str(e)}
    
    async def _load_session_from_nodejs_api(self) -> Optional[str]:
        """Load session data from Node.js API"""
        try:
            # Get current adminId dynamically
            admin_id = await get_current_admin_id()
            
            async with httpx.AsyncClient() as client:
                # Query the GET endpoint to check for saved session
                response = await client.get(
                    NODEJS_API_URL,
                    params={"adminId": admin_id},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("hasSavedSession"):
                        print("✅ Found saved session in Node.js API")
                        return data  # Return the response data
                    else:
                        print("ℹ️ No saved session found in Node.js API")
                        return None
        except Exception as e:
            print(f"⚠️ Error loading session from Node.js API: {e}")
            return None
        
    async def initialize(self, load_from_db: bool = False) -> Dict[str, Any]:
        """Initialize Playwright and browser with stealth mode"""
        # CRITICAL FIX: Check if browser is already in use before attempting to open
        # This prevents multiple browser instances from opening
        if get_in_use(self.session_id):
            print(f"[WhatsApp] Browser already in use for {self.session_id}, checking existing session...")
            # Even if in_use is true, check if we have an existing browser connection
            if self.page and self.context and self.status == "connected":
                try:
                    await self.page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=15000)
                    await self._random_delay(2, 3)
                    chat_list_selector = "div[aria-label='Chat list']"
                    if await self._is_element_visible(chat_list_selector, timeout=5000):
                        self.status = "connected"
                        print("[WhatsApp] Reusing existing browser session (in_use flag was set)")
                        return {"status": "connected", "message": "Reusing existing browser session", "already_init": True}
                except Exception as e:
                    print(f"⚠️ Error checking existing session: {e}")
            
            # If we get here, the browser might have crashed but in_use flag wasn't cleared
            # Clear the flag and proceed with initialization
            print(f"[WhatsApp] Browser marked as in_use but not accessible, clearing flag and proceeding...")
            set_in_use(self.session_id, False)
        
        # Set in_use to true before starting initialization
        set_in_use(self.session_id, True)
        
        # Acquire lock to prevent concurrent initialization attempts
        async with self._initialization_lock:
            # Double-check: if already initializing or initialized, skip
            if self._is_initializing:
                print(f"[WhatsApp] Initialization already in progress for {self.session_id}, skipping")
                return {"status": self.status, "message": "Initialization already in progress", "already_init": True}
            
            try:
                Path(self.session_path).mkdir(parents=True, exist_ok=True)
                
                # If already initialized, check connection status by navigating to WhatsApp Web
                if self.page and self.context and self.status == "connected":
                    print("[WhatsApp] Browser already initialized and connected, checking connection status...")
                    try:
                        # Navigate to WhatsApp Web to check if still logged in
                        await self.page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=15000)
                        await self._random_delay(2, 3)
                        
                        # Check if already logged in (chat list visible)
                        chat_list_selector = "div[aria-label='Chat list']"
                        if await self._is_element_visible(chat_list_selector, timeout=5000):
                            self.status = "connected"
                            print("[WhatsApp] Already logged in (session reused)")
                            return {"status": "connected", "message": "Already logged in", "already_init": True}
                    except Exception as e:
                        print(f"⚠️ Error checking existing session: {e}")
                    
                    return {"status": self.status, "message": "Browser already initialized", "already_init": True}
                
                # Mark that we're starting initialization
                self._is_initializing = True
                print(f"[WhatsApp] Starting browser initialization for {self.session_id}...")
                
                self.playwright = await async_playwright().start()
            
                # Stealth browser arguments
                stealth_args = [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-web-security",
                    "--start-maximized",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-extensions",
                    "--disable-sync",
                    "--disable-background-networking",
                    "--disable-default-apps",
                    "--disable-translate",
                    "--no-first-run",
                    "--ignore-certificate-errors",
                    "--ignore-ssl-errors",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",
                    "--enable-features=NetworkService,NetworkServiceInProcess",
                    "--force-color-profile=srgb",
                    "--metrics-recording-only",
                    "--mute-audio",
                ]
                
                # Launch browser - use launch_persistent_context for session persistence
                # Note: launch_persistent_context returns a BrowserContext, not a Browser!
                try:
                    self.context = await self.playwright.chromium.launch_persistent_context(
                        user_data_dir=self.session_path,
                        headless=HEADLESS,
                        channel=CHANNEL,
                        args=stealth_args,
                        viewport={"width": 1280, "height": 720},
                        locale="en-US",
                        timezone_id="Asia/Kolkata",
                        permissions=["notifications"],
                    )
                except Exception as e:
                    # Fallback: try regular launch if persistent context fails
                    print(f"Persistent context failed, trying regular launch: {e}")
                    self.browser = await self.playwright.chromium.launch(
                        headless=HEADLESS,
                        channel=CHANNEL,
                        args=stealth_args,
                    )
                    self.context = await self.browser.new_context(
                        viewport={"width": 1280, "height": 720},
                        locale="en-US",
                        timezone_id="Asia/Kolkata",
                    )
                
                # Get or create page from context
                if self.context.pages:
                    self.page = self.context.pages[0]
                else:
                    self.page = await self.context.new_page()
                
                if not self.page:
                    raise Exception("Failed to create page")
                
                # Load session from DB if provided
                if self._db_session_data:
                    try:
                        session_data = json.loads(self._db_session_data)
                        cookies = session_data.get("cookies", [])
                        if cookies:
                            await self.context.add_cookies(cookies)
                            print(f"✅ Loaded {len(cookies)} cookies from DB session")
                    except Exception as e:
                        print(f"⚠️ Failed to load DB session: {e}")
                else:
                    # Try to load saved session from Node.js API
                    try:
                        api_session_data = await self._load_session_from_nodejs_api()
                        if api_session_data and api_session_data.get("hasSavedSession"):
                            print("📡 Saved session found in Node.js API, attempting auto-connect...")
                            # Extract session data and load it
                            session_data = api_session_data.get("sessionData")
                            if session_data:
                                try:
                                    session_json = json.loads(session_data)
                                    cookies = session_json.get("cookies", [])
                                    if cookies:
                                        await self.context.add_cookies(cookies)
                                        print(f"✅ Loaded {len(cookies)} cookies from saved session")
                                except Exception as e:
                                    print(f"⚠️ Failed to parse saved session: {e}")
                    except Exception as e:
                        print(f"ℹ️ No saved session in API: {e}")
                
                # Inject anti-detection scripts - enhanced
                await self.page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    window.chrome = { runtime: {} };
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                    Object.defineProperty(navigator, 'hardwareConcurrency', {
                        get: () => 8
                    });
                    Object.defineProperty(navigator, 'deviceMemory', {
                        get: () => 8
                    });
                    Object.defineProperty(navigator, 'maxTouchPoints', {
                        get: () => 0
                    });
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                    });
                    Object.defineProperty(navigator, 'vendor', {
                        get: () => 'Google Inc.'
                    });
                    window.navigator.chrome = {
                        runtime: {}
                    };
                    window.callPhantom = undefined;
                    window._phantom = undefined;
                    window.phantom = undefined;
                    delete window.cdc_adoQpoasnkfrR;
                    delete window.$cdc_asdjflasutopfhvcZLmcfl_;
                """)
                
                self.status = "connecting"
                return {"status": self.status, "message": "Browser initialized"}
                
            except Exception as e:
                self.status = "failed"
                import traceback
                return {"status": self.status, "error": str(e), "traceback": traceback.format_exc()}
            
            finally:
                # Always mark initialization as complete, whether successful or not
                self._is_initializing = False
                print(f"[WhatsApp] Browser initialization completed for {self.session_id} (status: {self.status})")
    
    async def login(self, timeout: int = 30) -> Dict[str, Any]:
        """Login to WhatsApp Web with session reuse or QR"""
        try:
            # If already connected, just return success
            if self.status == "connected" and self.page:
                try:
                    chat_list_selector = "div[aria-label='Chat list']"
                    if await self._is_element_visible(chat_list_selector, timeout=2000):
                        return {
                            "status": "connected",
                            "message": "Already logged in (reusing session)"
                        }
                except:
                    pass
            
            # Initialize if not already done
            if not self.browser and not self.context:
                init_result = await self.initialize()
                if init_result.get("status") == "failed":
                    return init_result
            
            if not self.page:
                return {"status": "failed", "error": "Page not initialized"}
            
            # Check if already on WhatsApp and logged in
            current_url = self.page.url if self.page else ""
            
            # Navigate to WhatsApp Web only if not already there
            if "web.whatsapp.com" not in current_url:
                await self.page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=30000)
                await self._random_delay(2, 3)
            
            # Check if already logged in (check chat list)
            chat_list_selector = "div[aria-label='Chat list']"
            qr_selector = "canvas[aria-label*='Scan this QR code']"
            
            # First check if chat list is visible (logged in)
            if await self._is_element_visible(chat_list_selector, timeout=5000):
                self.status = "connected"
                # Try to get phone number from profile
                try:
                    profile_button = await self.page.query_selector("div[role='button'][aria-label*='Profile']")
                    if profile_button:
                        self.phone_number = "authenticated"
                except:
                    pass
                
                # Auto-save session after successful connection
                try:
                    await self.save_session_to_db()
                    print("✅ Session auto-saved after connection")
                except Exception as e:
                    print(f"⚠️ Auto-save session failed: {e}")
                
                return {
                    "status": "connected",
                    "message": "Successfully logged in (session reused)"
                }
            
            # If not logged in, check for QR code
            qr_visible = await self._is_element_visible(qr_selector, timeout=3000)
            
            if qr_visible:
                self.status = "connecting"
                qr_code_base64 = await self.get_qr_code()
                return {
                    "status": "connecting",
                    "qr_required": True,
                    "qr_code": qr_code_base64,
                    "message": "QR code required. Scan with WhatsApp app."
                }
            
            return {
                "status": self.status,
                "message": "Checking login status..."
            }
            
        except Exception as e:
            self.status = "failed"
            return {"status": self.status, "error": str(e)}
    
    async def get_qr_code(self) -> Optional[str]:
        """Capture QR code as base64 image"""
        try:
            qr_selector = "canvas[aria-label*='Scan this QR code']"
            qr_element = await self.page.query_selector(qr_selector)
            if qr_element:
                qr_screenshot = await qr_element.screenshot()
                import base64
                return base64.b64encode(qr_screenshot).decode('utf-8')
        except Exception as e:
            print(f"Failed to capture QR code: {e}")
        return None

    def _normalize_dial_code(self, value: str) -> str:
        digits = "".join(c for c in (value or "") if c.isdigit())
        return f"+{digits}" if digits else ""

    async def _get_country_picker_button(self):
        phone_input_xpath = "//input[@aria-label='Type your phone number to log in to WhatsApp']"
        picker_xpaths = [
            f"{phone_input_xpath}/preceding-sibling::*[self::button or @role='button'][1]",
            f"{phone_input_xpath}/parent::*/preceding-sibling::*[self::button or @role='button'][1]",
            f"{phone_input_xpath}/parent::*/child::*[self::button or @role='button'][1]",
            f"{phone_input_xpath}/preceding::button[.//span[contains(normalize-space(),'+')]][1]",
            f"{phone_input_xpath}/preceding::div[@role='button'][.//span[contains(normalize-space(),'+')]][1]",
        ]
        for xpath in picker_xpaths:
            try:
                btn = await self.page.query_selector(f"xpath={xpath}")
                if btn and await btn.is_visible():
                    return btn
            except Exception:
                continue
        try:
            locator = self.page.locator(
                "input[aria-label='Type your phone number to log in to WhatsApp']"
            ).locator("xpath=preceding-sibling::*[1]")
            if await locator.count() > 0 and await locator.first.is_visible():
                return await locator.first.element_handle()
        except Exception:
            pass
        return None

    async def _read_country_dial_code(self) -> str:
        btn = await self._get_country_picker_button()
        if not btn:
            return ""
        try:
            label = await btn.inner_text()
            match = re.search(r"\+\d{1,4}", label.replace("\u00a0", " "))
            if match:
                return self._normalize_dial_code(match.group(0))
        except Exception:
            pass
        return ""

    async def _search_country_in_picker(self, country: str) -> None:
        search_xpaths = [
            "//div[@role='dialog']//input[@type='text']",
            "//div[@role='dialog']//input",
            "//input[contains(translate(@aria-label,'SEARCH','search'),'search')]",
            "//input[contains(translate(@placeholder,'SEARCH','search'),'search')]",
        ]
        for xpath in search_xpaths:
            try:
                search_input = await self.page.query_selector(f"xpath={xpath}")
                if search_input and await search_input.is_visible():
                    await search_input.click()
                    await self._random_delay(0.2, 0.3)
                    await search_input.fill("")
                    await search_input.fill(country)
                    print(f"🔍 Searched country list for: {country}")
                    await self._random_delay(0.8, 1.2)
                    return
            except Exception:
                continue

    async def _click_country_option(self, country: str, dial_code: str = "") -> bool:
        dial_digits = "".join(c for c in dial_code if c.isdigit())
        clicked = await self.page.evaluate(
            """({ country, dialDigits }) => {
                const isVisible = (el) => {
                    if (!el) return false;
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    return style.visibility !== 'hidden' && style.display !== 'none'
                        && rect.width > 0 && rect.height > 0;
                };
                const normalize = (s) => (s || '').replace(/\\s+/g, ' ').trim();
                const matches = [];
                for (const node of document.querySelectorAll('span')) {
                    if (normalize(node.textContent) !== country) continue;
                    const row = node.closest(
                        '[role="button"], [role="listitem"], [role="option"], li, button'
                    ) || node.parentElement;
                    if (!row || !isVisible(row)) continue;
                    matches.push(row);
                }
                for (const row of matches) {
                    const rowText = normalize(row.textContent);
                    if (!dialDigits || rowText.includes(dialDigits)) {
                        row.click();
                        return true;
                    }
                }
                if (matches.length === 1) {
                    matches[0].click();
                    return true;
                }
                return false;
            }""",
            {"country": country, "dialDigits": dial_digits},
        )
        if clicked:
            return True
        xpaths = [
            f"//*[@role='dialog']//div[@role='button'][.//span[normalize-space()='{country}']]",
            f"//span[normalize-space()='{country}']/ancestor::*[@role='button' or @role='listitem'][1]",
            f"//button[.//span[normalize-space()='{country}']]",
        ]
        for xpath in xpaths:
            try:
                elements = await self.page.query_selector_all(f"xpath={xpath}")
                for element in elements:
                    if await element.is_visible():
                        await element.click()
                        return True
            except Exception:
                continue
        return False

    async def _select_phone_login_country(self, country: str, dial_code: str = "") -> bool:
        expected_dial = self._normalize_dial_code(dial_code)
        current_dial = await self._read_country_dial_code()
        if expected_dial and current_dial == expected_dial:
            print(f"✅ Country picker already shows {expected_dial} ({country})")
            return True
        picker_btn = await self._get_country_picker_button()
        if not picker_btn:
            return False
        try:
            await picker_btn.click()
            await self._random_delay(0.6, 1)
        except Exception:
            return False
        await self._search_country_in_picker(country)
        if not await self._click_country_option(country, expected_dial):
            try:
                await self.page.keyboard.press("Escape")
            except Exception:
                pass
            return False
        await self._random_delay(0.6, 1)
        selected_dial = await self._read_country_dial_code()
        return not expected_dial or selected_dial == expected_dial

    async def _hold_phone_login_session(self, session_timeout: int) -> None:
        """Keep browser open in background while user enters linking code on phone."""
        try:
            print(f"⏱️  Keeping browser open for {session_timeout} seconds (background)...")
            await asyncio.sleep(session_timeout)
            self.status = "connected"
            try:
                await self.save_session_to_db()
                print("✅ Session saved automatically after phone login hold")
            except Exception as e:
                print(f"⚠️ Auto-save session failed: {e}")
            print("✅ Phone login background hold completed")
        except Exception as e:
            print(f"⚠️ Phone login background hold error: {e}")

    async def _clear_and_fill_phone_input(self, phone_input, phone_number: str) -> None:
        input_digits = "".join(c for c in phone_number if c.isdigit())
        if not input_digits:
            raise ValueError("Phone number must contain digits")
        await phone_input.click()
        await self._random_delay(0.3, 0.5)
        for _ in range(4):
            await phone_input.fill("")
            await phone_input.press("Control+a")
            await phone_input.press("Backspace")
            await phone_input.press("Meta+a")
            await phone_input.press("Backspace")
            await self._random_delay(0.15, 0.25)
            current = await phone_input.input_value()
            if not "".join(c for c in (current or "") if c.isdigit()):
                break
        await phone_input.fill(input_digits)
        await self._random_delay(0.2, 0.4)
        entered_digits = "".join(c for c in (await phone_input.input_value() or "") if c.isdigit())
        if entered_digits != input_digits:
            await phone_input.fill("")
            for char in input_digits:
                await phone_input.type(char, delay=random.randint(40, 100))

    async def phone_login(
        self,
        phone_number: str,
        country: str = "India",
        session_timeout: int = 120,
        country_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Streamlined phone number-based login for WhatsApp Web.
        Clears the input and enters number starting with country code (e.g. 919876543210).
        """
        try:
            print("\n" + "="*60)
            print("🚀 Starting Streamlined WhatsApp Web Phone Login")
            print("="*60)

            if not self.page:
                return {"status": "failed", "error": "Browser not initialized. Call initialize() first."}

            input_phone_number = format_phone_input_number(phone_number, country_code)
            if not input_phone_number:
                return {
                    "status": "failed",
                    "error": "Invalid phone number. Provide local digits (e.g. 9876543210) or full number with 91.",
                }
            print(f"📞 Phone input value (starts with country code): {input_phone_number}")

            current_url = self.page.url if self.page else ""

            if "web.whatsapp.com" not in current_url:
                print("🌐 Navigating to WhatsApp Web...")
                await self.page.goto("https://web.whatsapp.com/", wait_until="domcontentloaded", timeout=30000)
                await self._random_delay(2, 3)

            phone_input_xpath = "//input[@aria-label='Type your phone number to log in to WhatsApp']"
            phone_login_button_xpath = (
                "//div[@role='button'][.//*[normalize-space()='Log in with phone number']]"
            )

            print("📲 Opening phone login screen...")
            on_phone_form = await self._is_element_visible_xpath(phone_input_xpath, timeout=3000)
            if not on_phone_form:
                try:
                    if await self._is_element_visible_xpath(phone_login_button_xpath, timeout=10000):
                        phone_login_btn = await self.page.query_selector(
                            f'xpath={phone_login_button_xpath}'
                        )
                        if phone_login_btn:
                            await phone_login_btn.click()
                            print("✅ Clicked 'Log in with phone number'")
                            await self._random_delay(1, 2)
                    else:
                        print("⚠️ 'Log in with phone number' button not found — continuing")
                except Exception as e:
                    print(f"⚠️ Could not click phone login button: {e}")

                on_phone_form = await self._is_element_visible_xpath(phone_input_xpath, timeout=15000)
                if not on_phone_form:
                    return {
                        "status": "failed",
                        "error": "Phone login form not found. Could not open 'Log in with phone number' screen.",
                    }

            dial_code = resolve_dial_code(country, country_code)
            print(f"📍 Selecting country: {country} ({dial_code or 'no dial code'})...")

            country_selected = await self._select_phone_login_country(country, dial_code)
            if not country_selected:
                print(
                    f"⚠️ Country picker could not set {country} ({dial_code}) — "
                    f"will enter {input_phone_number} directly in the input box"
                )

            await self._random_delay(0.5, 1)

            print(f"📱 Clearing input and entering from 91: {input_phone_number}...")

            try:
                phone_input = await self.page.query_selector(f"xpath={phone_input_xpath}")
                if phone_input:
                    await self._clear_and_fill_phone_input(phone_input, input_phone_number)
                    print(f"✅ Phone number entered in input box: {input_phone_number}")
                else:
                    return {"status": "failed", "error": "Phone input field not found"}
            except Exception as e:
                return {"status": "failed", "error": f"Failed to enter phone number: {str(e)}"}
            
            await self._random_delay(1, 2)
            
            print("⏩ Clicking Next button...")
            next_xpaths = [
                "//button[@type='button' and .//span[normalize-space()='Next']]",
                "//button[.//div[text()='Next']]",
            ]

            try:
                next_button = None
                for next_xpath in next_xpaths:
                    next_button = await self.page.query_selector(f"xpath={next_xpath}")
                    if next_button and await next_button.is_visible():
                        break
                    next_button = None

                if next_button:
                    await next_button.click()
                    print("✅ Next button clicked")
                else:
                    return {"status": "failed", "error": "Next button not found"}
            except Exception as e:
                return {"status": "failed", "error": f"Failed to click Next: {str(e)}"}
            
            await self._random_delay(2, 3)
            
            print("🔑 Waiting for login code screen...")
            code_container_xpath = "//div[@data-link-code]"
            
            max_retries = 30
            retry_count = 0
            login_code = None
            
            while retry_count < max_retries:
                try:
                    code_element = await self.page.query_selector(f'xpath={code_container_xpath}')
                    if code_element:
                        raw_code = await code_element.get_attribute("data-link-code")
                        if raw_code:
                            login_code = raw_code.replace(",", "")
                            print("✅ Login code screen found and loaded")
                            break
                except:
                    pass
                
                await self._random_delay(0.5, 1)
                retry_count += 1
            
            if not login_code:
                return {
                    "status": "timeout",
                    "error": "Login code screen did not appear within expected time",
                    "retry_instructions": "Please try again or check your internet connection"
                }
            
            print("\n" + "="*60)
            print("🔐 YOUR WHATSAPP WEB LOGIN CODE")
            print("="*60)
            print(f"\n📊 CODE: {login_code}")
            print("\n📱 INSTRUCTIONS FOR YOUR MOBILE DEVICE:")
            print("   1. Open WhatsApp on your phone")
            print("   2. Look for the 'Link a Device' or 'WhatsApp Web' option")
            print("   3. When prompted, enter the 8-character code shown above")
            print("   4. You have approximately 2 minutes to enter this code")
            print("\n" + "="*60)

            code_chars = list(raw_code.split(",") if "," in raw_code else login_code)
            if len(code_chars) == 8:
                print("\n📊 Code Breakdown:")
                for i, char in enumerate(code_chars, 1):
                    print(f"   Digit {i}: {char}")

            # Return code to API immediately — do not block HTTP response for session_timeout
            asyncio.create_task(self._hold_phone_login_session(session_timeout))

            return {
                "status": "code_ready",
                "login_code": login_code,
                "phone_number": input_phone_number,
                "country": country,
                "message": "Login code generated. Enter it on your phone within 2 minutes.",
                "code_breakdown": list(raw_code.split(",") if "," in raw_code else login_code),
                "session_timeout": session_timeout,
            }

        except Exception as e:
            return {
                "status": "failed",
                "error": f"Unexpected error during phone login: {str(e)}",
                "traceback": str(e)
            }

    async def get_status(self) -> Dict[str, Any]:
        """Get current connection status"""
        if not self.page or not self.context:
            return {"status": "disconnected", "session_exists": os.path.exists(self.session_path) if hasattr(self, 'session_path') else False}
        
        try:
            chat_list_selector = "div[aria-label='Chat list']"
            qr_selector = "canvas[aria-label*='Scan this QR code']"
            
            if await self._is_element_visible(chat_list_selector, timeout=2000):
                self.status = "connected"
                return {
                    "status": "connected",
                    "phone_number": self.phone_number,
                    "session_exists": True
                }
            # Additional DOM checks: sometimes chat list isn't present but UI shows connected indicators
            # Check for refreshed default contact icon or Chats navbar/button as a fallback
            try:
                default_contact_xpath = "//span[@data-icon='default-contact-refreshed']"
                chats_button_xpath = "//button[@aria-label='Chats']"
                chats_selected_xpath = "//button[@aria-label='Chats' and @data-navbar-item-selected='true']"

                if await self._is_element_visible_xpath(default_contact_xpath, timeout=1500):
                    self.status = "connected"
                    return {"status": "connected", "phone_number": self.phone_number, "session_exists": True, "detected_by": "default_contact_icon"}

                if await self._is_element_visible_xpath(chats_selected_xpath, timeout=1500) or await self._is_element_visible_xpath(chats_button_xpath, timeout=1500):
                    self.status = "connected"
                    return {"status": "connected", "phone_number": self.phone_number, "session_exists": True, "detected_by": "chats_button"}
            except Exception:
                # Ignore DOM detection errors and continue with existing logic
                pass
            
            if await self._is_element_visible(qr_selector, timeout=2000):
                self.status = "connecting"
                qr_code_base64 = await self.get_qr_code()
                return {
                    "status": "connecting",
                    "qr_required": True,
                    "qr_code": qr_code_base64,
                    "session_exists": os.path.exists(self.session_path) if hasattr(self, 'session_path') else False
                }
            
            # Session exists but not connected - try to reconnect automatically
            session_exists = os.path.exists(self.session_path) if hasattr(self, 'session_path') else False
            if session_exists and self.status != "connecting":
                # Try to reconnect by calling login
                self.status = "connecting"
                return {
                    "status": "connecting",
                    "auto_reconnecting": True,
                    "session_exists": True
                }
            
            return {
                "status": self.status,
                "session_exists": session_exists
            }
            
        except Exception as e:
            return {"status": "disconnected", "error": str(e)}
    
    def _escape_xpath_string(self, s: str) -> str:
        """Escape special characters for XPath string"""
        return s.replace("'", "\\'").replace('"', '\\"')
    
    async def send_message(self, message: str, phone: str = None, contact: str = None) -> Dict[str, Any]:
        """Send WhatsApp message to a phone number or contact using XPath navigation"""
        try:
            # Ensure browser is alive
            if not await self._ensure_browser_alive():
                return {"success": False, "error": "Browser not available. Please reconnect WhatsApp."}
            
            if self.status != "connected":
                login_result = await self.login()
                if login_result.get("status") != "connected":
                    return {"success": False, "error": login_result.get("error", "Not connected to WhatsApp")}
            
            # Use contact name if provided, otherwise use phone
            search_value = contact if contact else phone
            if not search_value:
                return {"success": False, "error": "Either phone or contact must be provided"}
            
            # Format phone number - clean it properly for WhatsApp search
            phone_clean = None
            if phone and not contact:
                phone_clean = phone.replace("+", "").replace(" ", "").replace("-", "")
                search_value = phone_clean
            
            # First check if a chat is already open (message input is visible)
            message_box_xpath = '//div[@contenteditable="true"][@data-tab="1"]'
            chat_already_open = await self._is_element_visible_xpath(message_box_xpath, timeout=3000)
            
            if chat_already_open:
                print(f"📱 Chat already open, sending message directly...")
                message_box = await self.page.query_selector(f'xpath={message_box_xpath}')
                if message_box:
                    await message_box.fill(message)
                    await self._random_delay(0.5, 1)
                
                send_button_xpath = '//button[@aria-label="Send"]'
                if await self._is_element_visible_xpath(send_button_xpath, timeout=5000):
                    await self.page.click(f'xpath={send_button_xpath}')
                    await self._random_delay(1, 2)
                    return {
                        "success": True,
                        "message": "Message sent successfully",
                        "recipient": search_value
                    }
                
                # Fallback: Try pressing Enter
                await self.page.press(f'xpath={message_box_xpath}', "Enter")
                await self._random_delay(1, 2)
                
                return {
                    "success": True,
                    "message": "Message sent",
                    "recipient": search_value
                }
            
            # No chat open - need to search for contact first
            print(f"🔍 Searching for contact: {search_value}")
            
            # Use safe wait for search bar
            search_xpath = '//div[@contenteditable="true"][@data-tab="3"]'
            if not await self._safe_wait_for_xpath(search_xpath, timeout=30000):
                return {"success": False, "error": "Could not find search bar"}
            
            await self._random_delay(0.5, 1)
            
            search_box = await self.page.query_selector(f'xpath={search_xpath}')
            if not search_box:
                return {"success": False, "error": "Search box not found"}
            
            await search_box.click()
            await self._random_delay(0.3, 0.5)
            
            # Clear search
            await search_box.fill("")
            await self._random_delay(0.2, 0.3)
            
            # Type search value character by character
            for char in search_value:
                await search_box.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.05, 0.15)
            
            await self._random_delay(1.5, 2)
            
            # Click on contact
            escaped_search = self._escape_xpath_string(search_value)
            contact_clicked = False
            
            contact_xpath = f"//span[@title='{escaped_search}']"
            try:
                contact_elem = await self.page.query_selector(f'xpath={contact_xpath}')
                if contact_elem:
                    await contact_elem.click()
                    contact_clicked = True
                    print(f"✅ Clicked contact: {search_value}")
            except Exception as e:
                print(f"⚠️ Primary contact click failed: {e}")
            
            if not contact_clicked:
                try:
                    first_chat_xpath = '//div[@role="row"][1]//span[@class="x1lliihq"]'
                    await self.page.click(f'xpath={first_chat_xpath}')
                    contact_clicked = True
                    print(f"✅ Clicked first chat item")
                except Exception as e:
                    print(f"⚠️ First chat click failed: {e}")
            
            if not contact_clicked:
                try:
                    search_clean = phone_clean if phone_clean else search_value
                    contact_xpath_contains = f"//span[contains(@title, '{search_clean}')]"
                    await self.page.click(f'xpath={contact_xpath_contains}')
                    contact_clicked = True
                    print(f"✅ Clicked contact using contains: {search_clean}")
                except Exception as e:
                    print(f"⚠️ Contains click failed: {e}")
            
            if not contact_clicked:
                return {
                    "success": False,
                    "error": f"Could not find or click contact: {search_value}"
                }
            
            # Wait for chat to open
            print(f"⏳ Waiting for chat to open...")
            chat_opened = False
            max_wait_retries = 5
            
            for wait_attempt in range(max_wait_retries):
                await self._random_delay(0.8, 1.2)
                
                if await self._is_element_visible_xpath(message_box_xpath, timeout=2000):
                    chat_opened = True
                    print(f"✅ Chat opened successfully (attempt {wait_attempt + 1})")
                    break
                
                alt_message_box_xpaths = [
                    '//div[@contenteditable="true"][@data-tab="10"]',
                    '//div[@contenteditable="true"][contains(@class, "selectable-text")]',
                ]
                
                for alt_xpath in alt_message_box_xpaths:
                    if await self._is_element_visible_xpath(alt_xpath, timeout=1000):
                        message_box_xpath = alt_xpath
                        chat_opened = True
                        print(f"✅ Chat opened (found alt message box, attempt {wait_attempt + 1})")
                        break
                
                if chat_opened:
                    break
            
            if not chat_opened:
                print(f"⚠️ Chat did not open after {max_wait_retries} attempts, trying anyway...")
                try:
                    await self.take_screenshot(f"chat_open_failed_{int(time.time())}.png")
                except:
                    pass
            
            # Type message in message box
            message_box = await self.page.query_selector(f'xpath={message_box_xpath}')
            if message_box:
                await message_box.fill(message)
                await self._random_delay(0.5, 1)
            else:
                return {
                    "success": False,
                    "error": "Could not find message input box"
                }
            
            # Click send button
            send_button_xpath = '//button[@aria-label="Send"]'
            send_button_visible = await self._is_element_visible_xpath(send_button_xpath, timeout=5000)
            
            if send_button_visible:
                await self.page.click(f'xpath={send_button_xpath}')
                await self._random_delay(1, 2)
                print(f"✅ Message sent to {search_value}")
                return {
                    "success": True,
                    "message": "Message sent successfully",
                    "recipient": search_value
                }
            
            # Fallback: Try pressing Enter
            await self.page.press(f'xpath={message_box_xpath}', "Enter")
            await self._random_delay(1, 2)
            
            print(f"✅ Message sent (via Enter)")
            return {
                "success": True,
                "message": "Message sent",
                "recipient": search_value
            }
            
        except Exception as e:
            print(f"❌ Send message error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_message_to_contact(self, contact_name: str, message: str) -> Dict[str, Any]:
        """Send message to a contact by name (username or phone)"""
        try:
            # Ensure browser is alive
            if not await self._ensure_browser_alive():
                return {"success": False, "error": "Browser not available. Please reconnect WhatsApp."}
            
            # Search for contact - use safe wait
            search_xpath = '//div[@contenteditable="true"][@data-tab="3"]'
            if not await self._safe_wait_for_xpath(search_xpath, timeout=30000):
                return {"success": False, "error": "Could not find search bar"}
            
            await self._random_delay(0.5, 1)
            
            search_box = await self.page.query_selector(f'xpath={search_xpath}')
            if not search_box:
                return {"success": False, "error": "Could not find search box"}
            
            await search_box.click()
            await self._random_delay(0.3, 0.5)
            
            await search_box.fill("")
            await self._random_delay(0.2, 0.3)
            
            # Type contact name character by character
            for char in contact_name:
                await search_box.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.05, 0.15)
            
            await self._random_delay(1.5, 2)
            
            # Click on contact - escape special chars in contact name
            escaped_name = self._escape_xpath_string(contact_name)
            contact_xpath = f"//span[@title='{escaped_name}']"
            try:
                await self.page.click(f'xpath={contact_xpath}')
            except:
                # Try contains as fallback
                try:
                    contact_xpath_contains = f"//span[contains(@title, '{escaped_name}')]"
                    await self.page.click(f'xpath={contact_xpath_contains}')
                except Exception as e:
                    print(f"⚠️ Could not find contact: {e}")
                    return {"success": False, "error": f"Contact '{contact_name}' not found"}
            
            await self._random_delay(1.5, 2)
            
            # Type and send message - use safe wait
            message_box_xpath = '//div[@contenteditable="true"][@data-tab="1"]'
            if not await self._safe_wait_for_xpath(message_box_xpath, timeout=15000):
                return {"success": False, "error": "Could not find message input box after opening chat"}
            
            message_box = await self.page.query_selector(f'xpath={message_box_xpath}')
            if message_box:
                await message_box.fill(message)
                await self._random_delay(0.5, 1)
                
                # Click send button using XPath
                send_button_xpath = '//button[@aria-label="Send"]'
                if await self._is_element_visible_xpath(send_button_xpath, timeout=5000):
                    await self.page.click(f'xpath={send_button_xpath}')
                    await self._random_delay(1, 2)
                    return {
                        "success": True,
                        "message": f"Message sent to {contact_name}"
                    }
                
                # Try Enter as fallback
                await self.page.press(f'xpath={message_box_xpath}', "Enter")
                await self._random_delay(1, 2)
                return {
                    "success": True,
                    "message": f"Message sent to {contact_name}"
                }
            
            return {
                "success": False,
                "error": "Could not find message input"
            }
            
        except Exception as e:
            print(f"❌ send_message_to_contact error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_poll(self, contact_name: str, question: str, options: list, allow_multiple: bool = False) -> Dict[str, Any]:
        """Create a poll in a chat"""
        try:
            # Ensure browser is alive before operations
            if not await self._ensure_browser_alive():
                return {"success": False, "error": "Browser not available. Please reconnect WhatsApp."}
            
            # Open contact first
            send_result = await self.send_message_to_contact(contact_name, "Creating poll...")
            if not send_result.get("success"):
                # Try to reinitialize and retry
                if not await self._ensure_browser_alive():
                    return {"success": False, "error": "Browser not available. Please reconnect WhatsApp."}
                send_result = await self.send_message_to_contact(contact_name, "Creating poll...")
            
            # Click plus button - use safe wait with increased timeout
            plus_selector = "span[data-icon='plus-rounded']"
            if not await self._safe_wait_for_selector(plus_selector, timeout=30000):
                # Try one more time with reinitialization
                if await self._ensure_browser_alive():
                    if not await self._safe_wait_for_selector(plus_selector, timeout=30000):
                        return {"success": False, "error": "Could not find plus button. WhatsApp UI may have changed."}
                else:
                    return {"success": False, "error": "Browser not available"}
            
            await self._random_delay(0.3, 0.7)
            try:
                await self.page.click(plus_selector)
            except Exception as e:
                print(f"⚠️ Error clicking plus button: {e}")
                # Try alternative selector
                try:
                    await self.page.click('xpath=//span[@data-icon="plus-rounded"]')
                except:
                    pass
            await self._random_delay(1.2, 1.8)
            
            # Click poll option - use safe wait
            poll_selector = "div[role='menuitem'][aria-label='Poll']"
            if not await self._safe_wait_for_selector(poll_selector, timeout=30000):
                return {"success": False, "error": "Could not find Poll option in menu"}
            
            await self._random_delay(0.3, 0.7)
            try:
                await self.page.click(poll_selector)
            except Exception as e:
                print(f"⚠️ Error clicking poll option: {e}")
                # Try alternative
                try:
                    await self.page.click('xpath=//div[@role="menuitem"]//span[text()="Poll"]')
                except:
                    pass
            await self._random_delay(1.5, 2)
            
            # Enter question - use safe wait
            question_selector = "(//div[@contenteditable='true' and @role='textbox'])[1]"
            if not await self._safe_wait_for_xpath(question_selector, timeout=30000):
                return {"success": False, "error": "Could not find question input field"}
            
            await self._random_delay(0.3, 0.7)
            
            question_box = await self.page.query_selector(f'xpath={question_selector}')
            if not question_box:
                return {"success": False, "error": "Could not find question input box"}
            
            await question_box.fill("")
            await self._random_delay(0.3, 0.5)
            
            for char in question:
                await question_box.type(char, delay=random.randint(30, 100))
                await self._random_delay(0.02, 0.08)
            
            await self._random_delay(1, 1.5)
            
            # Enter options
            for i, option in enumerate(options):
                option_selector = f"(//div[@data-lexical-editor='true' and @contenteditable='true'])[{i+2}]"
                try:
                    option_box = await self.page.query_selector(f'xpath={option_selector}')
                    if option_box:
                        await option_box.fill("")
                        await self._random_delay(0.2, 0.4)
                        
                        for char in option:
                            await option_box.type(char, delay=random.randint(30, 100))
                            await self._random_delay(0.02, 0.08)
                        
                        await self._random_delay(0.5, 1)
                except Exception as e:
                    print(f"⚠️ Error entering option {i}: {e}")
                    pass
            await self._random_delay(1, 1.5)
            
            # Toggle multiple votes if needed
            if allow_multiple:
                toggle_selector = "input#polls-single-option-switch"
                if await self._is_element_visible(toggle_selector, timeout=3000):
                    await self.page.click(toggle_selector)
                    await self._random_delay(0.5, 1)
            
            await self._random_delay(1, 1.5)
            
            # Send poll - use safe wait
            send_selector = "div[role='button'][aria-label='Send']"
            if not await self._safe_wait_for_selector(send_selector, timeout=30000):
                return {"success": False, "error": "Could not find Send button for poll"}
            
            await self._random_delay(0.3, 0.7)
            try:
                await self.page.click(send_selector)
            except Exception as e:
                print(f"⚠️ Error clicking send: {e}")
                # Try Enter key as fallback
                await self.page.keyboard.press("Enter")
            
            await self._random_delay(1, 2)
            
            return {
                "success": True,
                "message": "Poll created successfully"
            }
            
        except Exception as e:
            print(f"❌ Create poll error: {e}")
            # Try to take screenshot for debugging
            try:
                await self.take_screenshot(f"poll_creation_error_{int(time.time())}.png")
            except:
                pass
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_poll_results(self, contact_name: str, poll_question: str = None) -> Dict[str, Any]:
        """
        Get poll results from a chat using XPath-based parsing.
        
        XPath for poll: //div[contains(@aria-label, "Poll")]
        XPath for poll options: //div[@data-testid='poll-options']//span[@data-testid='selectable-text']
        
        Status: 1 = voted/completed, 0 = not voted/not completed
        """
        try:
            if self.status != "connected":
                await self.login()
            
            # Navigate to contact
            search_xpath = '//div[@contenteditable="true"][@data-tab="3"]'
            await self.page.wait_for_selector(f'xpath={search_xpath}', timeout=10000)
            await self._random_delay(0.5, 1)
            
            search_box = await self.page.query_selector(f'xpath={search_xpath}')
            await search_box.click()
            await self._random_delay(0.3, 0.5)
            
            # Clear search box before typing
            await search_box.fill("")
            await self._random_delay(0.1, 0.2)
            # Select all and delete to ensure clean state
            await search_box.press("Control+a")
            await search_box.press("Backspace")
            await self._random_delay(0.2, 0.3)
            
            # Type contact name character by character
            for char in contact_name:
                await search_box.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.05, 0.15)
            
            await self._random_delay(1.5, 2)
            
            # Click on contact
            escaped_name = self._escape_xpath_string(contact_name)
            contact_xpath = f"//span[@title='{escaped_name}']"
            await self.page.click(f'xpath={contact_xpath}')
            await self._random_delay(2, 3)
            
            response_time = None
            
            # If poll_question provided, find and click on the poll to expand it
            if poll_question:
                try:
                    # More specific: find poll by looking for poll message in chat
                    poll_message_xpath = f'//div[contains(@aria-label, "{poll_question}")]'
                    await self.page.wait_for_selector(f'xpath={poll_message_xpath}', timeout=10000)
                    
                    # Click directly on the poll message
                    await self.page.click(f'xpath={poll_message_xpath}')
                    await self._random_delay(1, 2)
                    
                    # Try to extract response time from the message
                    # Look for the double check mark (msg-dblcheck) which indicates delivered/read
                    # and get the timestamp next to it
                    try:
                        # XPath to find the timestamp near the message checkmarks
                        time_xpath = "//span[@data-icon='msg-dblcheck']/ancestor::div[@role='button']//span[contains(text(),':')]"
                        time_elements = await self.page.query_selector_all(f'xpath={time_xpath}')
                        
                        import re
                        time_pattern = re.compile(r'^[0-9]{1,2}:[0-9]{2} ?(AM|PM)$', re.IGNORECASE)
                        
                        for time_elem in time_elements:
                            time_text = await time_elem.text_content()
                            if time_text and time_pattern.match(time_text.strip()):
                                response_time = time_text.strip()
                                print(f"Found response time: {response_time}")
                                break
                    except Exception as e:
                        print(f"Could not extract response time: {e}")
                        
                except Exception as e:
                    print(f"⚠️ Could not find specific poll message: {e}")
            
            # Parse poll results using the exact XPath provided by user
            results = []
            total_votes = 0
            
            # XPath for getting all habit/task names from poll options
            habit_names_xpath = "//label[.//span[@data-testid='selectable-text']]//span[@data-testid='selectable-text']"
            
            # XPath for getting vote count (the button following each label)
            vote_count_xpath = "//label[.//span[@data-testid='selectable-text']]/following::button[1]//span[text()][1]"
            
            try:
                # Get all habit name elements
                habit_elements = await self.page.query_selector_all(f'xpath={habit_names_xpath}')
                
                # Get all vote count elements
                vote_elements = await self.page.query_selector_all(f'xpath={vote_count_xpath}')
                
                print(f"Found {len(habit_elements)} habit elements and {len(vote_elements)} vote elements")
                
                # Print vote elements for debugging
                for idx, vote_elem in enumerate(vote_elements):
                    vote_text = await vote_elem.text_content()
                    print(f"Vote element {idx}: '{vote_text}'")
                
                # Track seen texts to avoid duplicates
                seen_texts = []
                
                # Pair each habit with its vote count
                for i, habit_elem in enumerate(habit_elements):
                    habit_text = await habit_elem.text_content()
                    if habit_text:
                        habit_text = habit_text.strip()
                    
                    # Skip if we've already seen this exact text
                    if habit_text in seen_texts:
                        continue
                    
                    # Skip empty or very long texts
                    if not habit_text or len(habit_text) > 50:
                        continue
                    
                    seen_texts.append(habit_text)
                    
                    # Get corresponding vote count
                    vote_count = 0
                    if i < len(vote_elements):
                        vote_elem = vote_elements[i]
                        vote_text = await vote_elem.text_content()
                        print(f"Processing vote for '{habit_text}': raw='{vote_text}'")
                        
                        if vote_text:
                            vote_text = vote_text.strip()
                            # Check if the text is exactly "1" (voted) or "0" (not voted)
                            # The span contains the vote count
                            if vote_text == "1":
                                vote_count = 1
                            elif vote_text == "0":
                                vote_count = 0
                            else:
                                # Try to parse as number
                                try:
                                    vote_count = int(vote_text)
                                except:
                                    # If can't parse, check if it has content
                                    vote_count = 1 if len(vote_text) > 0 else 0
                    
                    print(f"Final vote count for '{habit_text}': {vote_count}")
                    
                    if habit_text and len(habit_text) > 0:
                        results.append({
                            "text": habit_text,
                            "votes": vote_count,
                        })
                        total_votes += vote_count
                
            except Exception as e:
                print(f"⚠️ Error parsing poll results: {e}")
            
            # Fallback: if no results, try alternative approach
            if len(results) == 0:
                try:
                    # Find all poll-related elements
                    all_poll_elements = await self.page.query_selector_all("[data-testid='poll-option']")
                    
                    seen_texts = []
                    for elem in all_poll_elements:
                        text = await elem.text_content()
                        if text and text.strip() and text.strip() not in seen_texts:
                            text = text.strip()
                            if len(text) < 50:
                                seen_texts.append(text)
                                results.append({
                                    "text": text,
                                    "votes": 0,
                                })
                    
                    print(f"Fallback found {len(results)} potential options")
                except:
                    pass
            
            return {
                "success": True,
                "question": poll_question or "Daily Habits Poll",
                "options": results,
                "total_votes": total_votes,
                "response_time": response_time,
                "contact": contact_name
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def vote_poll(self, contact_name: str, poll_question: str, option_index: int = 0) -> Dict[str, Any]:
        """Vote on a poll option"""
        try:
            if self.status != "connected":
                await self.login()
            
            # Navigate to contact
            search_xpath = '//div[@contenteditable="true"][@data-tab="3"]'
            await self.page.wait_for_xpath(search_xpath, timeout=10000)
            await self._random_delay(0.5, 1)
            
            search_box = await self.page.query_selector(f'xpath={search_xpath}')
            await search_box.click()
            await self._random_delay(0.3, 0.5)
            
            await search_box.fill("")
            await self._random_delay(0.2, 0.3)
            
            for char in contact_name:
                await search_box.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.05, 0.15)
            
            await self._random_delay(1.5, 2)
            
            # Click on contact
            contact_xpath = f'//span[@title="{contact_name}"]'
            await self.page.click(f'xpath={contact_xpath}')
            await self._random_delay(2, 3)
            
            # Find and click the poll
            poll_xpath = f'//div[contains(@aria-label, "{poll_question}")]//div[@role="button"]'
            await self.page.click(f'xpath={poll_xpath}')
            await self._random_delay(1, 2)
            
            # Click on the option
            option_xpath = f"(//div[@data-testid='poll-option'])[{option_index + 1}]"
            await self.page.click(f'xpath={option_xpath}')
            await self._random_delay(1, 2)
            
            return {
                "success": True,
                "message": f"Voted on option {option_index + 1}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def disconnect(self) -> Dict[str, Any]:
        """Close browser and cleanup"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            
            self.status = "disconnected"
            
            # Clear the in_use flag in database
            set_in_use(self.session_id, False)
            
            return {"status": "disconnected", "message": "Disconnected successfully"}
            
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def check_contact_exists(self, contact_name: str) -> bool:
        """Check if a contact exists in WhatsApp"""
        try:
            search_xpath = '//div[@contenteditable="true"][@data-tab="3"]'
            await self.page.wait_for_selector(f'xpath={search_xpath}', timeout=10000)
            await self._random_delay(0.5, 1)
            
            search_box = await self.page.query_selector(f'xpath={search_xpath}')
            await search_box.click()
            await self._random_delay(0.3, 0.5)
            
            await search_box.fill("")
            await self._random_delay(0.2, 0.3)
            
            escaped_name = self._escape_xpath_string(contact_name)
            for char in contact_name:
                await search_box.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.05, 0.15)
            
            await self._random_delay(1.5, 2)
            
            contact_xpath = f"//span[@title='{escaped_name}']"
            exists = await self._is_element_visible_xpath(contact_xpath, timeout=3000)
            
            await search_box.fill("")
            await self._random_delay(0.2, 0.3)
            
            return exists
            
        except Exception as e:
            return False
    
    async def create_contact(self, first_name: str, last_name: str, phone_number: str) -> Dict[str, Any]:
        """Create a new contact in WhatsApp - handles case where contact already exists"""
        try:
            if self.status != "connected":
                await self.login()
            
            if self.status != "connected":
                raise HTTPException(status_code=400, detail="Not connected to WhatsApp")
            
            print(f"👤 Creating contact: {first_name} {last_name} - {phone_number}")
            
            new_chat_xpath = "//button[@aria-label='New chat' and @type='button']"
            await self.page.wait_for_selector(f'xpath={new_chat_xpath}', timeout=10000)
            await self._random_delay(0.3, 0.7)
            await self.page.click(f'xpath={new_chat_xpath}')
            await self._random_delay(1.0, 1.5)
            
            new_contact_xpath = "//div[@role='button' and @aria-label='New contact']"
            await self.page.wait_for_selector(f'xpath={new_contact_xpath}', timeout=10000)
            await self._random_delay(0.3, 0.7)
            await self.page.click(f'xpath={new_contact_xpath}')
            await self._random_delay(1.5, 2.0)
            
            # Enter phone number first (this is where the error appears if contact exists)
            phone_xpath = "//input[@type='text' and @aria-label='Phone number']"
            await self.page.wait_for_selector(f'xpath={phone_xpath}', timeout=10000)
            await self._random_delay(0.3, 0.7)
            await self.page.click(f'xpath={phone_xpath}')
            await self._random_delay(0.3, 0.5)
            
            phone_input = await self.page.query_selector(f'xpath={phone_xpath}')
            await phone_input.fill("")
            await self._random_delay(0.2, 0.4)
            
            for char in phone_number:
                await phone_input.type(char, delay=random.randint(50, 150))
                await self._random_delay(0.02, 0.1)
            
            await self._random_delay(1.0, 1.5)
            
            # Check if there's an error message saying contact already exists
            already_exists_error_xpath = "//div[@id='contact-phone-number-fields-error']//span[contains(text(),'already in your contacts')]"
            error_visible = await self._is_element_visible_xpath(already_exists_error_xpath, timeout=3000)
            
            if error_visible:
                # Contact already exists - get the existing contact info
                print("⚠️ Contact already exists in WhatsApp, retrieving existing contact info...")
                
                # Click "View contact" button
                view_contact_xpath = "//div[@id='contact-phone-number-fields-error']//button[.//span[normalize-space()='View contact']]"
                try:
                    await self.page.click(f'xpath={view_contact_xpath}')
                    await self._random_delay(1.5, 2.0)
                except Exception as e:
                    print(f"⚠️ Could not click View contact button: {e}")
                
                # Get contact name from the contact details header
                # The contact name is in the header section - use multiple strategies
                contact_name = None
                actual_phone = None
                
                try:
                    # Strategy 1: Look for the contact name in the header using h2 or header elements
                    # WhatsApp Web typically shows contact name in a header area
                    header_name_xpaths = ["(//span[@data-testid='selectable-text'])[2]", "(//span[@data-testid='selectable-text'])[1]", "(//span[@data-testid='selectable-text'])[3]"]
                    
                    for xpath in header_name_xpaths:
                        try:
                            name_element = await self.page.query_selector(f'xpath={xpath}')
                            if name_element:
                                contact_name = await name_element.text_content()
                                if contact_name:
                                    contact_name = contact_name.strip()
                                    digit_count = sum(1 for c in contact_name if c.isdigit())
                                    is_phone_like = digit_count >= 5 or '+' in contact_name
                                    has_click_here = "click here" in contact_name.lower()
                                    
                                    if contact_name and len(contact_name) > 0 and not is_phone_like and not has_click_here:
                                        print(f"✅ Found existing contact name (header strategy): {contact_name}")
                                        break
                        except:
                            continue
                    
                    # Strategy 2: If still no contact name, look for any prominent text in the dialog
                    if not contact_name or len(contact_name) == 0:
                        # Get all text elements in the dialog and find the first non-empty one that's likely a name
                        dialog_xpath = "//div[@role='dialog']"
                        dialog = await self.page.query_selector(f'xpath={dialog_xpath}')
                        if dialog:
                            # Look for spans with substantial text content
                            spans = await dialog.query_selector_all("span")
                            for span in spans:
                                try:
                                    text = await span.text_content()
                                    if text and len(text.strip()) > 2 and text.strip().isalpha():
                                        # Check if this is in a header area
                                        parent = await span.evaluate("el => el.closest('header')")
                                        if parent:
                                            contact_name = text.strip()
                                            print(f"✅ Found existing contact name (dialog span): {contact_name}")
                                            break
                                except:
                                    continue
                    
                    # Strategy 3: Use the input phone number as fallback contact name if we can't find it
                    if not contact_name or len(contact_name) == 0:
                        contact_name = phone_number
                        print(f"⚠️ Could not extract contact name, using phone number: {contact_name}")
                            
                except Exception as e:
                    print(f"⚠️ Could not get contact name: {e}")
                    # Fallback to phone number
                    contact_name = phone_number
                
                # Get phone number - WhatsApp shows phone in the contact details
                try:
                    # Try multiple xpaths for phone number
                    phone_xpaths = ["(//span[@data-testid='selectable-text'])[3]", "(//span[@data-testid='selectable-text'])[4]", "(//span[@data-testid='selectable-text'])[2]"]
                    
                    for xpath in phone_xpaths:
                        try:
                            phone_element = await self.page.query_selector(f'xpath={xpath}')
                            if phone_element:
                                phone_text = await phone_element.text_content()
                                if phone_text:
                                    # Clean up the phone number (remove spaces, dashes, etc.)
                                    cleaned_phone = ''.join(c for c in phone_text if c.isdigit() or c == '+')
                                    
                                    has_plus = '+' in phone_text
                                    digit_count = sum(1 for c in cleaned_phone if c.isdigit())
                                    is_valid_phone = (has_plus and digit_count >= 10) or (digit_count >= 10)
                                    
                                    if is_valid_phone and len(cleaned_phone) >= 10:
                                        actual_phone = cleaned_phone
                                        print(f"✅ Found existing phone number: {actual_phone}")
                                        break
                        except:
                            continue
                    
                    # If still no phone, use the input phone
                    if not actual_phone or len(actual_phone) < 10:
                        actual_phone = phone_number
                        
                except Exception as e:
                    print(f"⚠️ Could not get phone number: {e}")
                    actual_phone = phone_number
                
                # Close the contact view - click Back button or press Escape
                try:
                    # Try clicking back button first
                    back_button_xpath = "//button[@aria-label='Back']"
                    await self.page.click(f'xpath={back_button_xpath}')
                    await self._random_delay(0.5, 1.0)
                except Exception as e:
                    print(f"⚠️ Could not click Back button: {e}")
                    # Fallback to Escape
                    try:
                        await self.page.keyboard.press("Escape")
                        await self._random_delay(0.5, 1.0)
                    except:
                        pass
                
                # Press Escape again to close any modal
                try:
                    await self.page.keyboard.press("Escape")
                except:
                    pass
                
                # Click Close button if visible (new requirement)
                try:
                    close_button_xpath = "//button[@aria-label='Close']"
                    if await self._is_element_visible_xpath(close_button_xpath, timeout=2000):
                        await self.page.click(f'xpath={close_button_xpath}')
                        await self._random_delay(0.5, 1.0)
                        print("✅ Clicked Close button to dismiss dialog")
                except Exception as e:
                    print(f"⚠️ Could not click Close button: {e}")
                
                return {
                    "success": True,
                    "action": "already_exists",
                    "message": f"Contact already exists with name: {contact_name}",
                    "existing_contact_name": contact_name,
                    "existing_phone_number": actual_phone,
                    "input_phone_number": phone_number
                }
            
            # If we get here, contact doesn't exist - continue with creation
            # Use multiple XPath strategies to find the first name field
            first_name_xpaths = ["//div[@role='textbox' and @aria-label='First name']", "//input[@placeholder='First name']"]
            
            first_name_input = None
            for xpath in first_name_xpaths:
                try:
                    first_name_input = await self.page.query_selector(f'xpath={xpath}')
                    if first_name_input:
                        print(f"✅ Found first name field with xpath: {xpath}")
                        break
                except:
                    continue
            
            if not first_name_input:
                return {
                    "success": False,
                    "error": "Could not find first name input field"
                }
            
            await first_name_input.click()
            await self._random_delay(0.2, 0.4)
            await first_name_input.fill("")
            await self._random_delay(0.1, 0.2)
            
            # Use fill() for reliable input - more robust than character-by-character typing
            await first_name_input.fill(first_name)
            await self._random_delay(0.3, 0.5)
            for char in first_name:
                                await first_name_input.type(char, delay=random.randint(30, 100))
                                await self._random_delay(0.02, 0.05)
            
            # Verify the input was filled
            filled_value = await first_name_input.input_value()
            if not filled_value or filled_value != first_name:
                # If fill didn't work, try typing character by character as fallback
                print("⚠️ fill() didn't work, trying type()...")
                await first_name_input.fill("")
                for char in first_name:
                    await first_name_input.type(char, delay=random.randint(30, 100))
                    await self._random_delay(0.02, 0.05)
            
            print(f"✅ First name entered: {first_name}")
            
            await self._random_delay(0.5, 1.0)
            
            # Make last name optional: only interact if a last name is provided
            if last_name and last_name.strip():
                try:
                    # Use multiple XPath strategies to find the last name field
                    last_name_xpaths = ["//div[@role='textbox' and @aria-label='Last name']", "//input[@placeholder='Last name']"]
                    
                    last_name_input = None
                    for xpath in last_name_xpaths:
                        try:
                            last_name_input = await self.page.query_selector(f'xpath={xpath}')
                            if last_name_input:
                                print(f"✅ Found last name field with xpath: {xpath}")
                                break
                        except:
                            continue
                    
                    if last_name_input:
                        await last_name_input.click()
                        await self._random_delay(0.2, 0.4)
                        await last_name_input.fill("")
                        await self._random_delay(0.1, 0.2)
                        
                        # Use fill() for reliable input
                        await last_name_input.fill(last_name)
                        await self._random_delay(0.3, 0.5)
                        
                        # Verify the input was filled
                        filled_value = await last_name_input.input_value()
                        if not filled_value or filled_value != last_name:
                            # If fill didn't work, try typing character by character as fallback
                            print("⚠️ fill() didn't work for last name, trying type()...")
                            await last_name_input.fill("")
                            for char in last_name:
                                await last_name_input.type(char, delay=random.randint(30, 100))
                                await self._random_delay(0.02, 0.05)
                        
                        print(f"✅ Last name entered: {last_name}")
                        await self._random_delay(0.5, 1.0)
                except Exception as e:
                    print(f"⚠️ Could not fill last name: {e}")
                    # Non-fatal: if last name field isn't available, proceed without failing
            
            save_contact_xpath = "//div[@role='button' and @aria-label='Save contact']"
            await self.page.wait_for_selector(f'xpath={save_contact_xpath}', timeout=10000)
            await self._random_delay(0.3, 0.7)
            await self.page.click(f'xpath={save_contact_xpath}')
            await self._random_delay(1.5, 2.0)
            
            print(f"✅ Contact '{first_name} {last_name}' created successfully!")
            return {
                "success": True,
                "action": "created",
                "message": f"Contact '{first_name} {last_name}' created successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def open_or_create_contact(self, contact_name: str, phone_number: str = None) -> Dict[str, Any]:
        """Open a contact or create if doesn't exist"""
        try:
            if self.status != "connected":
                login_result = await self.login()
                if not login_result.get('success'):
                    return {
                        "success": False,
                        "error": f"Not connected to WhatsApp. Connection status: {self.status}. Please connect from admin dashboard first."
                    }
            
            contact_exists = await self.check_contact_exists(contact_name)
            
            if contact_exists:
                escaped_name = self._escape_xpath_string(contact_name)
                contact_xpath = f"//span[@title='{escaped_name}']"
                await self.page.click(f'xpath={contact_xpath}')
                await self._random_delay(1.5, 2)
                return {
                    "success": True,
                    "action": "opened",
                    "message": f"Contact '{contact_name}' opened"
                }
            
            if phone_number:
                name_parts = contact_name.split()
                first_name = name_parts[0] if name_parts else contact_name
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
                
                create_result = await self.create_contact(first_name, last_name, phone_number)
                return create_result
            
            return {
                "success": False,
                "error": f"Contact '{contact_name}' not found and no phone number provided"
            }
            
        except Exception as e:
            error_msg = str(e)
            if "Not connected to WhatsApp" in error_msg:
                return {
                    "success": False,
                    "error": f"Not connected to WhatsApp: {error_msg}"
                }
            return {
                "success": False,
                "error": f"Failed to open/create contact: {error_msg}"
            }
    
    async def save_session_to_db(self) -> Dict[str, Any]:
        """Save cookies and session data to database-compatible format and persist to Node.js API"""
        try:
            if not self.context:
                return {"success": False, "error": "No context available"}
            
            cookies = await self.context.cookies()
            storage_state = await self.context.storage_state()
            
            session_data = {
                "cookies": cookies,
                "local_storage": storage_state.get("origins", []),
                "session_storage": {},
                "saved_at": datetime.now().isoformat()
            }
            
            session_data_json = json.dumps(session_data)
            
            # Send to Node.js API for persistence
            api_result = await self._send_session_to_nodejs_api(session_data_json)
            
            return {
                "success": True,
                "session_data": session_data_json,
                "cookie_count": len(cookies),
                "api_saved": api_result.get("success", False)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def load_session_from_db(self, session_data_json: str) -> Dict[str, Any]:
        """Load cookies and session data from database"""
        try:
            if not self.context:
                return {"success": False, "error": "No context available"}
            
            session_data = json.loads(session_data_json)
            cookies = session_data.get("cookies", [])
            
            if cookies:
                await self.context.add_cookies(cookies)
                return {
                    "success": True,
                    "message": f"Loaded {len(cookies)} cookies"
                }
            
            return {
                "success": False,
                "error": "No cookies in session data"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_session_data(self) -> Dict[str, Any]:
        """Get current session data for storage"""
        try:
            if not self.context:
                return {"success": False, "error": "No context available"}
            
            cookies = await self.context.cookies()
            storage_state = await self.context.storage_state()
            
            return {
                "success": True,
                "cookies": cookies,
                "storage_state": storage_state,
                "session_id": self.session_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def take_screenshot(self, filename: str = None) -> Dict[str, Any]:
        """Take screenshot of current page and save to file with auto-cleanup"""
        try:
            if not self.page:
                return {"success": False, "error": "Page not initialized"}
            
            import threading
            import glob
            
            # Create screenshots directory
            screenshot_dir = os.path.join(os.getcwd(), "whatsapp_screenshots")
            Path(screenshot_dir).mkdir(parents=True, exist_ok=True)
            
            # Generate filename with timestamp
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"whatsapp_screenshot_{timestamp}.png"
            
            filepath = os.path.join(screenshot_dir, filename)
            
            # Take screenshot
            await self.page.screenshot(path=filepath, full_page=True)
            
            # Schedule auto-deletion after 10 minutes
            def delete_after_delay(filepath, delay=600):
                def delete_file():
                    time.sleep(delay)
                    try:
                        if os.path.exists(filepath):
                            os.remove(filepath)
                            print(f"🗑️ Screenshot deleted: {filepath}")
                    except Exception as e:
                        print(f"⚠️ Failed to delete screenshot: {e}")
                threading.Thread(target=delete_file, daemon=True).start()
            
            delete_after_delay(filepath)
            
            # Clean up old screenshots (older than 10 minutes) on startup
            self._cleanup_old_screenshots(screenshot_dir)
            
            return {
                "success": True,
                "filename": filename,
                "filepath": filepath,
                "message": "Screenshot taken, will auto-delete in 10 minutes"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _cleanup_old_screenshots(self, screenshot_dir: str):
        """Clean up screenshots older than 10 minutes"""
        try:
            import threading
            def cleanup():
                try:
                    now = time.time()
                    for filepath in glob.glob(os.path.join(screenshot_dir, "*.png")):
                        if os.path.exists(filepath):
                            file_age = now - os.path.getmtime(filepath)
                            if file_age > 600:  # 10 minutes
                                os.remove(filepath)
                                print(f"🗑️ Cleaned old screenshot: {filepath}")
                except Exception as e:
                    print(f"⚠️ Cleanup error: {e}")
            threading.Thread(target=cleanup, daemon=True).start()
        except:
            pass
    
    async def _is_element_visible(self, selector: str, timeout: int = 5000) -> bool:
        """Check if element is visible"""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout, state="visible")
            return True
        except:
            return False
    
    async def _is_element_visible_xpath(self, xpath: str, timeout: int = 5000) -> bool:
        """Check if element is visible using XPath"""
        try:
            await self.page.wait_for_selector(f'xpath={xpath}', timeout=timeout, state="visible")
            return True
        except:
            return False
    
    async def _random_delay(self, min_sec: float = 0.5, max_sec: float = 1.5):
        """Generate random delay"""
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)
    
    async def _ensure_browser_alive(self, max_retries: int = 2) -> bool:
        """
        Ensure browser is alive and ready. If not, attempt to reinitialize.
        Returns True if browser is ready, False otherwise.
        """
        for attempt in range(max_retries + 1):
            try:
                # Check if page exists and is accessible
                if not self.page:
                    print(f"[WhatsApp] Page not initialized, initializing...")
                    await self.initialize()
                    continue
                
                # Check if we can access the page URL (browser still responsive)
                try:
                    current_url = self.page.url if self.page else ""
                    # Try a simple operation to verify browser is alive
                    if self.page and not self.page.is_closed():
                        # Browser is alive
                        if self.status != "connected":
                            # Try to verify connection
                            await self._random_delay(0.5, 1)
                        return True
                except Exception as e:
                    print(f"[WhatsApp] Browser check failed (attempt {attempt + 1}): {e}")
                
                # If we get here, browser needs reinitialization
                if attempt < max_retries:
                    print(f"[WhatsApp] Reinitializing browser (attempt {attempt + 1}/{max_retries})...")
                    try:
                        await self.disconnect()
                    except:
                        pass
                    await self.initialize()
                    await self.login()
                else:
                    print(f"[WhatsApp] Browser reinitialization failed after {max_retries + 1} attempts")
                    return False
                    
            except Exception as e:
                print(f"[WhatsApp] _ensure_browser_alive error (attempt {attempt + 1}): {e}")
                if attempt < max_retries:
                    await self._random_delay(1, 2)
                else:
                    return False
        
        return False
    
    async def _safe_wait_for_selector(self, selector: str, timeout: int = 30000, state: str = "visible") -> bool:
        """
        Safely wait for selector with proper error handling.
        Returns True if element found, False on timeout or browser closed.
        """
        try:
            await self.page.wait_for_selector(selector, timeout=timeout, state=state)
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if "target page" in error_msg or "context" in error_msg or "browser" in error_msg:
                print(f"[WhatsApp] Browser closed during wait_for_selector: {e}")
                # Try to reinitialize
                await self._ensure_browser_alive()
            else:
                print(f"[WhatsApp] wait_for_selector failed: {e}")
            return False
    
    async def _safe_wait_for_xpath(self, xpath: str, timeout: int = 30000, state: str = "visible") -> bool:
        """
        Safely wait for XPath with proper error handling.
        Returns True if element found, False on timeout or browser closed.
        """
        try:
            await self.page.wait_for_selector(f'xpath={xpath}', timeout=timeout, state=state)
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if "target page" in error_msg or "context" in error_msg or "browser" in error_msg:
                print(f"[WhatsApp] Browser closed during wait_for_xpath: {e}")
                await self._ensure_browser_alive()
            else:
                print(f"[WhatsApp] wait_for_xpath failed: {e}")
            return False


# Global client storage
clients: Dict[str, WhatsAppClient] = {}


def get_client(session_id: str = "default") -> WhatsAppClient:
    """Get or create a WhatsApp client"""
    if session_id not in clients:
        clients[session_id] = WhatsAppClient(session_id)
    return clients[session_id]


# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    print(f"🚀 WhatsApp Automation Server starting on {SERVER_HOST}:{SERVER_PORT}")
    print(f"📁 Session directory: {USER_DATA_DIR}")
    print(f"🖥️  Headless mode: {HEADLESS}")
    
    # Setup signal handlers
    def signal_handler(sig, frame):
        print("\n🛑 Shutting down...")
        for client in clients.values():
            asyncio.create_task(client.disconnect())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    yield
    
    # Shutdown
    print("🔄 Closing all browser sessions...")
    for client in clients.values():
        await client.disconnect()


app = FastAPI(title="WhatsApp Automation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class SendMessageRequest(BaseModel):
    session_id: str = "default"
    phone: Optional[str] = None
    contact: Optional[str] = None
    message: str


class CreatePollRequest(BaseModel):
    session_id: str = "default"
    contact: str
    question: str
    options: list
    allow_multiple: bool = False


class PollResultRequest(BaseModel):
    session_id: str = "default"
    contact: str
    question: Optional[str] = None


class VotePollRequest(BaseModel):
    session_id: str = "default"
    contact: str
    question: str
    option_index: int = 0


class LoginRequest(BaseModel):
    session_id: str = "default"
    timeout: int = 30


class PhoneLoginRequest(BaseModel):
    session_id: str = "default"
    phone_number: str
    country: str = "India"
    country_code: Optional[str] = None
    session_timeout: int = 120


class CreateContactRequest(BaseModel):
    session_id: str = "default"
    first_name: str
    last_name: str
    phone_number: str


class OpenOrCreateContactRequest(BaseModel):
    session_id: str = "default"
    contact_name: str
    phone_number: Optional[str] = None


class SessionDataRequest(BaseModel):
    session_id: str = "default"
    session_data: Optional[str] = None


# API Routes
@app.get("/")
async def root():
    return {
        "service": "WhatsApp Automation API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/session/init")
async def init_session(request: LoginRequest):
    """Initialize a new browser session"""
    client = get_client(request.session_id)
    result = await client.initialize()
    return result


@app.post("/session/login")
async def login(request: LoginRequest):
    """Login to WhatsApp Web"""
    client = get_client(request.session_id)
    result = await client.login(timeout=request.timeout)
    return result


@app.post("/session/phone-login")
async def phone_login(request: PhoneLoginRequest):
    """Login to WhatsApp Web using phone number"""
    client = get_client(request.session_id)
    
    if not request.phone_number:
        raise HTTPException(status_code=400, detail="phone_number is required")
    
    init_result = await client.initialize()
    if init_result.get("status") == "failed":
        return JSONResponse(init_result, status_code=500)
    
    result = await client.phone_login(
        phone_number=request.phone_number,
        country=request.country,
        session_timeout=request.session_timeout,
        country_code=request.country_code,
    )
    
    # Return appropriate HTTP status based on result
    if result.get("login_code"):
        return JSONResponse(result, status_code=200)
    if result.get("status") == "connected":
        return JSONResponse(result, status_code=200)
    elif result.get("status") == "timeout":
        return JSONResponse(result, status_code=408)  # Request Timeout
    elif result.get("status") == "failed":
        return JSONResponse(result, status_code=400)  # Bad Request
    else:
        return JSONResponse(result, status_code=400)


@app.get("/session/status")
async def get_status(session_id: str = "default"):
    """Get connection status"""
    client = get_client(session_id)
    status = await client.get_status()
    return status


@app.post("/session/disconnect")
async def disconnect(session_id: str = "default"):
    """Disconnect from WhatsApp"""
    client = get_client(session_id)
    result = await client.disconnect()
    if session_id in clients:
        del clients[session_id]
    return result


@app.post("/message/send")
async def send_message(request: SendMessageRequest):
    """Send a message"""
    client = get_client(request.session_id)
    
    if request.phone or request.contact:
        result = await client.send_message(message=request.message, phone=request.phone, contact=request.contact)
    else:
        raise HTTPException(status_code=400, detail="Either phone or contact must be provided")
    
    return result


@app.post("/poll/create")
async def create_poll(request: CreatePollRequest):
    """Create a poll"""
    client = get_client(request.session_id)
    result = await client.create_poll(
        request.contact,
        request.question,
        request.options,
        request.allow_multiple
    )
    return result


@app.post("/poll/results")
async def get_poll_results(request: PollResultRequest):
    """
    Get poll results using XPath-based parsing.
    
    The question parameter is optional - if not provided, will attempt to find any poll in the chat.
    """
    client = get_client(request.session_id)
    result = await client.get_poll_results(
        request.contact,
        request.question if request.question else None
    )
    return result


@app.post("/poll/vote")
async def vote_poll(request: VotePollRequest):
    """Vote on a poll"""
    client = get_client(request.session_id)
    result = await client.vote_poll(
        request.contact,
        request.question,
        request.option_index
    )
    return result


@app.post("/poll/parse-results")
async def parse_poll_results(request: PollResultRequest):
    """
    DEPRECATED: Parse poll results using XPath selectors.
    
    This endpoint is now deprecated. Use /poll/results instead which uses the same XPath-based parsing.
    
    The question parameter is optional - if not provided, will attempt to find any poll in the chat.
    """
    client = get_client(request.session_id)
    result = await client.get_poll_results(
        request.contact,
        request.question if request.question else None
    )
    return result


@app.get("/sessions")
async def list_sessions():
    """List all active sessions"""
    sessions = []
    for sid, client in clients.items():
        status = await client.get_status()
        sessions.append({
            "session_id": sid,
            "status": status.get("status", "unknown")
        })
    return {"sessions": sessions}


@app.post("/contact/create")
async def create_contact(request: CreateContactRequest):
    """Create a new contact in WhatsApp"""
    client = get_client(request.session_id)
    result = await client.create_contact(
        request.first_name,
        request.last_name,
        request.phone_number
    )
    return result


@app.post("/contact/open-or-create")
async def open_or_create_contact(request: OpenOrCreateContactRequest):
    """Open existing contact or create new one"""
    client = get_client(request.session_id)
    result = await client.open_or_create_contact(
        request.contact_name,
        request.phone_number
    )
    return result


@app.post("/contact/check")
async def check_contact(session_id: str = "default", contact_name: str = ""):
    """Check if a contact exists"""
    client = get_client(session_id)
    exists = await client.check_contact_exists(contact_name)
    return {"exists": exists, "contact_name": contact_name}


@app.get("/session/data")
async def get_session_data(session_id: str = "default"):
    """Get current session data for external storage"""
    client = get_client(session_id)
    result = await client.get_session_data()
    return result


@app.post("/session/save")
async def save_session(session_id: str = "default"):
    """Save session cookies to database-compatible format"""
    client = get_client(session_id)
    result = await client.save_session_to_db()
    return result


@app.post("/session/load")
async def load_session(request: SessionDataRequest):
    """Load session cookies from database"""
    client = get_client(request.session_id)
    if not request.session_data:
        return {"success": False, "error": "No session data provided"}
    result = await client.load_session_from_db(request.session_data)
    return result


@app.post("/session/set-db")
async def set_db_session(request: SessionDataRequest):
    """Set session data from database before initializing"""
    client = get_client(request.session_id)
    if not request.session_data:
        return {"success": False, "error": "No session data provided"}
    client.set_db_session(request.session_data)
    return {"success": True, "message": "DB session data set, will be loaded on next initialize"}


@app.post("/screenshot")
async def take_screenshot(session_id: str = "default", filename: str = None):
    """Take a screenshot of current WhatsApp page"""
    client = get_client(session_id)
    result = await client.take_screenshot(filename)
    return result


@app.get("/screenshots")
async def list_screenshots():
    """List available screenshots"""
    screenshot_dir = os.path.join(os.getcwd(), "whatsapp_screenshots")
    if not os.path.exists(screenshot_dir):
        return {"screenshots": []}
    
    import glob
    screenshots = []
    for filepath in glob.glob(os.path.join(screenshot_dir, "*.png")):
        stat = os.stat(filepath)
        screenshots.append({
            "filename": os.path.basename(filepath),
            "filepath": filepath,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
        })
    return {"screenshots": screenshots}


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__}
    )


def cleanup():
    """Cleanup resources on shutdown"""
    global mongo_client
    if mongo_client:
        try:
            mongo_client.close()
            print("[MongoDB] Connection closed")
        except Exception as e:
            print(f"[MongoDB] Error closing connection: {e}")


async def initialize_mongodb():
    """Initialize MongoDB connection on startup"""
    print("[Startup] Initializing MongoDB connection...")
    success = connect_to_mongodb()
    if success:
        # Test adminId retrieval
        admin_id = await get_current_admin_id()
        print(f"[Startup] Using adminId: {admin_id}")
    else:
        print("[Startup] MongoDB connection failed, will use fallback adminId")


if __name__ == "__main__":
    import atexit
    import asyncio
    
    # Register cleanup function
    atexit.register(cleanup)
    
    # Initialize MongoDB before starting server
    print("[Startup] Starting WhatsApp server...")
    asyncio.run(initialize_mongodb())
    
    uvicorn.run(
        "whatsapp_server:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=False,
        log_level="info"
    )
