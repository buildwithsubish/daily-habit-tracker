#!/usr/bin/env python3
"""Interactive test CLI for whatsapp_server.py using the wa_client package."""

from __future__ import annotations

import json
import sys
from typing import Callable, Dict, Tuple

from wa_client import Settings, WhatsAppServerClient, get_settings
from wa_client.exceptions import WAConnectionError
from wa_client.logging import setup_logging

MenuHandler = Callable[[WhatsAppServerClient], None]


def _print_result(resp) -> None:
    print(f"\nResponse Code: {resp.status_code}")
    print("Response Body:")
    print(json.dumps(resp.body, indent=2))
    print("=" * 60)


def test_health(client: WhatsAppServerClient) -> None:
    _print_result(client.root())
    _print_result(client.health())


def test_init_session(client: WhatsAppServerClient) -> None:
    _print_result(client.init_session())


def test_qr_login(client: WhatsAppServerClient) -> None:
    timeout = input("Enter QR Check Timeout in seconds [Default: 30]: ").strip()
    timeout_val = int(timeout) if timeout.isdigit() else 30
    resp = client.login(timeout=timeout_val)
    if resp.ok and resp.body.get("qr_required"):
        qr_code = resp.body.get("qr_code")
        print("\n📷 QR Code Required!")
        print(f"QR Code Base64 Length: {len(qr_code) if qr_code else 0}")
    _print_result(resp)


def test_phone_login(client: WhatsAppServerClient) -> None:
    phone_number = input("Enter Phone Number (with country code, e.g. +919876543210): ").strip()
    if not phone_number:
        print("❌ Phone number cannot be empty!")
        return
    country = input("Enter Country Code (e.g. IN, US) [Default: IN]: ").strip() or "IN"
    timeout = input("Enter Login Timeout in seconds [Default: 60]: ").strip()
    timeout_val = int(timeout) if timeout.isdigit() else 60
    resp = client.phone_login(phone_number, country=country, session_timeout=timeout_val)
    if resp.ok and resp.body.get("login_code"):
        print("\n🔑 LINKING CODE GENERATED SUCCESSFULLY!")
        print(f"Code: {resp.body.get('login_code')}")
    _print_result(resp)


def test_get_status(client: WhatsAppServerClient) -> None:
    _print_result(client.session_status())


def test_disconnect(client: WhatsAppServerClient) -> None:
    _print_result(client.disconnect())


def test_send_message(client: WhatsAppServerClient) -> None:
    dest_type = input("Send to (1) Contact Name or (2) Phone Number? [Default: 1]: ").strip()
    dest = input("Enter Contact Name or Phone Number (with country code): ").strip()
    message = input("Enter Message: ").strip()
    if not dest or not message:
        print("❌ Destination and Message cannot be empty!")
        return
    if dest_type == "2":
        _print_result(client.send_message(message, phone=dest))
    else:
        _print_result(client.send_message(message, contact=dest))


def test_create_poll(client: WhatsAppServerClient) -> None:
    contact = input("Enter Target Contact Name: ").strip()
    question = input("Enter Poll Question: ").strip()
    print("Enter Poll Options (one per line, press Enter twice when done):")
    options = []
    while True:
        opt = input(f"Option {len(options) + 1}: ").strip()
        if not opt:
            break
        options.append(opt)
    if len(options) < 2:
        print("❌ Must provide at least 2 options!")
        return
    allow_multiple = input("Allow multiple choices? (y/n) [Default: n]: ").strip().lower() == "y"
    _print_result(client.create_poll(contact, question, options, allow_multiple=allow_multiple))


def test_poll_results(client: WhatsAppServerClient) -> None:
    contact = input("Enter Contact Name: ").strip()
    question = input("Enter Poll Question (optional): ").strip() or None
    _print_result(client.poll_results(contact, question))


def test_poll_status(client: WhatsAppServerClient) -> None:
    contact = input("Enter Contact Name: ").strip()
    question = input("Enter Poll Question (optional): ").strip() or None
    _print_result(client.poll_status(contact, question))


def test_vote_poll(client: WhatsAppServerClient) -> None:
    contact = input("Enter Contact Name: ").strip()
    question = input("Enter Poll Question: ").strip()
    try:
        option_index = int(input("Enter Option Index to vote (0-indexed): "))
    except ValueError:
        print("❌ Option index must be an integer!")
        return
    _print_result(client.vote_poll(contact, question, option_index))


def test_screenshot(client: WhatsAppServerClient) -> None:
    _print_result(client.screenshot())


def test_validate(client: WhatsAppServerClient) -> None:
    _print_result(client.validate_session())


def test_list_screenshots(client: WhatsAppServerClient) -> None:
    _print_result(client.list_screenshots())


def test_list_sessions(client: WhatsAppServerClient) -> None:
    _print_result(client.list_sessions())


def test_create_contact(client: WhatsAppServerClient) -> None:
    first_name = input("Enter First Name: ").strip()
    last_name = input("Enter Last Name: ").strip()
    phone_number = input("Enter Phone Number (with country code): ").strip()
    _print_result(client.create_contact(first_name, last_name, phone_number))


def test_open_or_create_contact(client: WhatsAppServerClient) -> None:
    contact_name = input("Enter Contact Name: ").strip()
    phone_number = input("Enter Phone Number (optional): ").strip() or None
    _print_result(client.open_or_create_contact(contact_name, phone_number))


def test_check_contact(client: WhatsAppServerClient) -> None:
    contact_name = input("Enter Contact Name to check: ").strip()
    _print_result(client.check_contact(contact_name))


def test_save_session(client: WhatsAppServerClient) -> None:
    _print_result(client.save_session())


def test_session_data(client: WhatsAppServerClient) -> None:
    _print_result(client.get_session_data())


MENU: Dict[str, Tuple[str, MenuHandler]] = {
    "1": ("Health & root", test_health),
    "2": ("Initialize session", test_init_session),
    "3": ("Login via QR", test_qr_login),
    "4": ("Login via phone", test_phone_login),
    "5": ("Session status", test_get_status),
    "6": ("Send message", test_send_message),
    "7": ("Create poll", test_create_poll),
    "8": ("Poll results", test_poll_results),
    "9": ("Poll status (derived)", test_poll_status),
    "10": ("Vote on poll", test_vote_poll),
    "11": ("Create contact", test_create_contact),
    "12": ("Open or create contact", test_open_or_create_contact),
    "13": ("Check contact", test_check_contact),
    "14": ("Screenshot", test_screenshot),
    "15": ("Validate session", test_validate),
    "16": ("List sessions", test_list_sessions),
    "17": ("List screenshots", test_list_screenshots),
    "18": ("Disconnect", test_disconnect),
    "19": ("Save session", test_save_session),
    "20": ("Get session data", test_session_data),
}


def main() -> None:
    setup_logging()
    settings = get_settings()
    print("=" * 60)
    print("WhatsApp Server Endpoint Test Suite (wa_client)")
    print("=" * 60)

    server_url = input(f"Enter server base URL [Default: {settings.server_url}]: ").strip() or settings.server_url
    session_id = input(f"Enter Session ID [Default: {settings.session_id}]: ").strip() or settings.session_id

    client = WhatsAppServerClient(
        Settings(
            server_url=server_url,
            session_id=session_id,
            request_timeout=settings.request_timeout,
            mongodb_uri=settings.mongodb_uri,
            db_name=settings.db_name,
        )
    )

    while True:
        print("\n--- MENU ---")
        for key, (label, _) in sorted(MENU.items(), key=lambda x: int(x[0])):
            print(f"{key:>2}. {label}")
        print(" 0. Exit")

        choice = input("\nSelect an option: ").strip()
        if choice == "0":
            print("\nExiting. Goodbye!")
            sys.exit(0)
        entry = MENU.get(choice)
        if not entry:
            print("❌ Invalid option, please try again.")
            continue
        label, handler = entry
        try:
            handler(client)
        except WAConnectionError as exc:
            print(f"\n❌ {exc}")
            print("Please ensure whatsapp_server.py is running.\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting. Goodbye!")