#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone


DEFAULT_BASE_URL = "http://127.0.0.1:1157"
DEFAULT_IDENTIFIER = "admin"
DEFAULT_CREDENTIAL = "hertzbeat"
DEMO_ORG_NAME = "Codex Demo Status"
DEMO_ORG_DESCRIPTION = "Seeded public status data for local verification."
DEMO_ORG_HOME = "https://hertzbeat.apache.org"
DEMO_ORG_FEEDBACK = "ops@hertzbeat.apache.org"
DEMO_ORG_COLOR = "#0f172a"
DEMO_ORG_LOGO = "https://hertzbeat.apache.org/logo.svg"
DEMO_COMPONENTS = [
    {
        "name": "Codex Demo API",
        "description": "Primary public API surface.",
        "state": 0,
    },
    {
        "name": "Codex Demo Worker",
        "description": "Background worker queue.",
        "state": 1,
    },
]
DEMO_INCIDENT_PREFIX = "Codex Demo Incident"

LOCAL_TZ = datetime.now().astimezone().tzinfo or timezone.utc


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def now_local() -> datetime:
    return datetime.now(tz=LOCAL_TZ)


def to_millis(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def year_start(year: int) -> datetime:
    return datetime(year, 1, 1, tzinfo=LOCAL_TZ)


def request_json(url: str, token: str | None = None, method: str = "GET", body: dict | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = response.read().decode("utf-8")
            return {} if payload == "" else json.loads(payload)
    except urllib.error.HTTPError as error:
        fail(f"{method} {url} failed: HTTP {error.code} {error.reason}")
    except urllib.error.URLError as error:
        fail(f"{method} {url} failed: {error.reason}")


def require_success(message: dict, context: str) -> dict:
    if message.get("code") != 0:
        fail(f"{context} failed: {message.get('msg') or message.get('code')}")
    return message.get("data") or {}


def login(base_url: str, identifier: str, credential: str) -> str:
    message = request_json(
        f"{base_url}/api/account/auth/form",
        method="POST",
        body={
            "type": 1,
            "identifier": identifier,
            "credential": credential,
        },
    )
    data = require_success(message, "Login")
    token = data.get("token")
    if not token:
        fail("Login succeeded without a token.")
    return token


def get_public_org(base_url: str, token: str) -> dict | None:
    message = request_json(f"{base_url}/api/status/page/org", token=token)
    if message.get("code") != 0:
        return None
    return message.get("data") or {}


def upsert_public_org(base_url: str, token: str, existing_org: dict | None) -> dict:
    payload = {
        "name": DEMO_ORG_NAME,
        "description": DEMO_ORG_DESCRIPTION,
        "home": DEMO_ORG_HOME,
        "feedback": DEMO_ORG_FEEDBACK,
        "logo": DEMO_ORG_LOGO,
        "color": DEMO_ORG_COLOR,
        "state": 1,
    }
    if existing_org and existing_org.get("id"):
        payload["id"] = existing_org["id"]
    message = request_json(f"{base_url}/api/status/page/org", token=token, method="POST", body=payload)
    return require_success(message, "Save status page org")


def get_public_components(base_url: str, token: str) -> list[dict]:
    message = request_json(f"{base_url}/api/status/page/component", token=token)
    data = require_success(message, "Load public components")
    return data if isinstance(data, list) else []


def find_item_by_name(items: list[dict], name: str) -> dict | None:
    for item in items:
        if item.get("name") == name:
            return item
        info = item.get("info") or {}
        if info.get("name") == name:
            return item
    return None


def upsert_public_component(base_url: str, token: str, org_id: int, component_spec: dict, existing_item: dict | None) -> dict:
    payload = {
        "orgId": org_id,
        "name": component_spec["name"],
        "description": component_spec["description"],
        "method": 1,
        "configState": component_spec["state"],
        "state": component_spec["state"],
        "labels": {},
    }
    if existing_item and existing_item.get("id"):
        payload["id"] = existing_item["id"]
    message = request_json(
        f"{base_url}/api/status/page/component",
        token=token,
        method="PUT" if payload.get("id") else "POST",
        body=payload,
    )
    require_success(message, "Save status page component")
    refreshed_item = find_item_by_name(get_public_components(base_url, token), component_spec["name"])
    if not refreshed_item:
        fail(f"Component was not persisted: {component_spec['name']}")
    return refreshed_item


def build_incident_url(search: str | None = None, start_time: int | None = None, end_time: int | None = None, page_size: int = 100) -> str:
    params = {
        "pageIndex": 0,
        "pageSize": page_size,
    }
    if search:
        params["search"] = search
    if start_time is not None:
        params["startTime"] = start_time
    if end_time is not None:
        params["endTime"] = end_time
    return "/api/status/page/incident?" + urllib.parse.urlencode(params)


def get_public_incidents(base_url: str, token: str, search: str | None = None, start_time: int | None = None, end_time: int | None = None) -> list[dict]:
    message = request_json(f"{base_url}{build_incident_url(search, start_time, end_time)}", token=token)
    data = require_success(message, "Load public incidents")
    return data.get("content") or []


def delete_public_incident(base_url: str, token: str, incident_id: int) -> None:
    message = request_json(f"{base_url}/api/status/page/incident/{incident_id}", token=token, method="DELETE")
    require_success(message, f"Delete status page incident {incident_id}")


def upsert_public_incident(
    base_url: str,
    token: str,
    org_id: int,
    incident_spec: dict,
    component_ids: list[int],
    existing_item: dict | None,
) -> dict:
    payload = {
        "orgId": org_id,
        "name": incident_spec["name"],
        "state": incident_spec["state"],
        "components": [{"id": component_id} for component_id in component_ids],
        "contents": incident_spec["contents"],
    }
    if incident_spec.get("startTime") is not None:
        payload["startTime"] = incident_spec["startTime"]
    if incident_spec.get("endTime") is not None:
        payload["endTime"] = incident_spec["endTime"]
    if existing_item and existing_item.get("id"):
        payload["id"] = existing_item["id"]
    message = request_json(
        f"{base_url}/api/status/page/incident",
        token=token,
        method="PUT" if payload.get("id") else "POST",
        body=payload,
    )
    require_success(message, "Save status page incident")
    refreshed_item = find_item_by_name(get_public_incidents(base_url, token, search=DEMO_INCIDENT_PREFIX), incident_spec["name"])
    if not refreshed_item:
        fail(f"Incident was not persisted: {incident_spec['name']}")
    return refreshed_item


def seed_status_demo(base_url: str, token: str) -> dict:
    existing_org = get_public_org(base_url, token)
    org = upsert_public_org(base_url, token, existing_org)
    org_id = int(org["id"])

    existing_components = get_public_components(base_url, token)
    component_ids: list[int] = []
    component_results: list[dict] = []
    for spec in DEMO_COMPONENTS:
        existing_item = find_item_by_name(existing_components, spec["name"])
        component = upsert_public_component(base_url, token, org_id, spec, existing_item)
        component_results.append(component)
        if existing_item and existing_item.get("id"):
            component_ids.append(int(existing_item["id"]))
        else:
            refreshed_item = find_item_by_name(get_public_components(base_url, token), spec["name"])
            if not refreshed_item or not refreshed_item.get("id"):
                fail(f"Component was not persisted: {spec['name']}")
            component_ids.append(int(refreshed_item["id"]))

    current = now_local()
    archive_year = current.year - 1
    archive_start = datetime(archive_year, 2, 12, 9, 30, tzinfo=LOCAL_TZ)
    archive_end = archive_start + timedelta(hours=1, minutes=15)

    current_incident_spec = {
        "name": f"{DEMO_INCIDENT_PREFIX} Current",
        "state": 2,
        "contents": [
            {
                "message": "Investigating elevated latency on the demo API.",
                "state": 0,
                "timestamp": to_millis(current - timedelta(minutes=35)),
            },
            {
                "message": "Mitigation is in progress and the worker queue is draining.",
                "state": 2,
                "timestamp": to_millis(current - timedelta(minutes=10)),
            },
        ],
    }

    archive_incident_spec = {
        "name": f"{DEMO_INCIDENT_PREFIX} Archive",
        "state": 2,
        "startTime": to_millis(archive_start),
        "endTime": to_millis(archive_end),
        "contents": [
            {
                "message": "Historical latency spike was traced to a downstream dependency.",
                "state": 0,
                "timestamp": to_millis(archive_start + timedelta(minutes=5)),
            },
            {
                "message": "Service recovered after the retry policy was tuned.",
                "state": 3,
                "timestamp": to_millis(archive_end),
            },
        ],
    }

    incident_results: list[dict] = []
    for spec in (current_incident_spec, archive_incident_spec):
        existing_item = find_item_by_name(get_public_incidents(base_url, token, search=DEMO_INCIDENT_PREFIX), spec["name"])
        if existing_item and existing_item.get("id"):
            delete_public_incident(base_url, token, int(existing_item["id"]))
            existing_item = None
        incident_results.append(
            upsert_public_incident(base_url, token, org_id, spec, component_ids, existing_item)
        )

    return {
        "org": org,
        "components": component_results,
        "incidents": incident_results,
    }


def verify_status_demo(base_url: str, token: str) -> dict:
    org_message = request_json(f"{base_url}/api/status/page/public/org", token=token)
    org = require_success(org_message, "Load public org")
    if org.get("name") != DEMO_ORG_NAME:
        fail(f"Unexpected public org name: {org.get('name')}")

    components_message = request_json(f"{base_url}/api/status/page/public/component", token=token)
    components = require_success(components_message, "Load public components")
    component_names = {
        (item.get("info") or item).get("name")
        for item in components
    }
    required_component_names = {spec["name"] for spec in DEMO_COMPONENTS}
    if not required_component_names.issubset(component_names):
        fail(f"Missing demo components: {', '.join(sorted(required_component_names - component_names))}")

    for item in components:
        info = item.get("info") or item
        if info.get("name") in required_component_names and not (item.get("history") or []):
            fail(f"Component history is empty for {info.get('name')}")

    current_year = now_local().year
    archive_year = current_year - 1
    current_incidents = get_public_incidents(
        base_url,
        token,
        search=DEMO_INCIDENT_PREFIX,
        start_time=to_millis(year_start(current_year)),
    )
    archive_incidents = get_public_incidents(
        base_url,
        token,
        search=DEMO_INCIDENT_PREFIX,
        start_time=to_millis(year_start(archive_year)),
        end_time=to_millis(datetime(archive_year, 12, 31, 23, 59, 59, 999000, tzinfo=LOCAL_TZ)),
    )

    current_names = {item.get("name") or item.get("title") for item in current_incidents}
    archive_names = {item.get("name") or item.get("title") for item in archive_incidents}
    if f"{DEMO_INCIDENT_PREFIX} Current" not in current_names:
        fail("Current-year demo incident was not found through the public filter.")
    if f"{DEMO_INCIDENT_PREFIX} Archive" not in archive_names:
        fail("Archive-year demo incident was not found through the public filter.")

    current_incident = next(item for item in current_incidents if (item.get("name") or item.get("title")) == f"{DEMO_INCIDENT_PREFIX} Current")
    archive_incident = next(item for item in archive_incidents if (item.get("name") or item.get("title")) == f"{DEMO_INCIDENT_PREFIX} Archive")
    if not (current_incident.get("contents") or []):
        fail("Current-year incident contents are empty.")
    if not (archive_incident.get("contents") or []):
        fail("Archive-year incident contents are empty.")

    return {
        "org": org.get("name"),
        "components": [
            {
                "name": (item.get("info") or item).get("name"),
                "historyBlocks": len(item.get("history") or []),
            }
            for item in components
            if (item.get("info") or item).get("name") in required_component_names
        ],
        "currentIncident": current_incident.get("name") or current_incident.get("title"),
        "archiveIncident": archive_incident.get("name") or archive_incident.get("title"),
        "openStatusUrl": "http://127.0.0.1:4200/status",
    }


def main() -> None:
    command = "seed-and-verify"
    base_url = DEFAULT_BASE_URL
    identifier = DEFAULT_IDENTIFIER
    credential = DEFAULT_CREDENTIAL

    if len(sys.argv) > 1 and not sys.argv[1].startswith("http"):
        command = sys.argv[1]
        if len(sys.argv) > 2:
            base_url = sys.argv[2]
        if len(sys.argv) > 3:
            identifier = sys.argv[3]
        if len(sys.argv) > 4:
            credential = sys.argv[4]
    else:
        if len(sys.argv) > 1:
            base_url = sys.argv[1]
        if len(sys.argv) > 2:
            identifier = sys.argv[2]
        if len(sys.argv) > 3:
            credential = sys.argv[3]

    token = login(base_url, identifier, credential)

    if command == "seed":
        result = seed_status_demo(base_url, token)
        print(json.dumps({
            "orgId": result["org"].get("id"),
            "componentIds": [item.get("id") for item in result["components"]],
            "incidentIds": [item.get("id") for item in result["incidents"]],
            "statusUrl": "http://127.0.0.1:4200/status",
        }, ensure_ascii=False))
        return

    if command == "verify":
        print(json.dumps(verify_status_demo(base_url, token), ensure_ascii=False))
        return

    if command in {"seed-and-verify", "verify-and-seed"}:
        seed_status_demo(base_url, token)
        print(json.dumps(verify_status_demo(base_url, token), ensure_ascii=False))
        return

    fail("Usage: status-public-demo.py [seed|verify|seed-and-verify] [base_url] [identifier] [credential]", 2)


if __name__ == "__main__":
    main()
