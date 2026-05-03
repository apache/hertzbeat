#!/usr/bin/env python3

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


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


def login(base_url: str, identifier: str, credential: str) -> str:
    login_message = request_json(
        f"{base_url}/api/account/auth/form",
        method="POST",
        body={
            "type": 1,
            "identifier": identifier,
            "credential": credential,
        },
    )
    token = ((login_message.get("data") or {}).get("token"))
    if login_message.get("code") != 0 or not token:
        fail("Login failed for entity alert feedback smoke.")
    return token


def find_entity_id(base_url: str, token: str) -> str:
    entity_list = request_json(f"{base_url}/api/entities?pageIndex=0&pageSize=20", token=token)
    if entity_list.get("code") != 0:
        fail("Entity list request failed.")
    content = (entity_list.get("data") or {}).get("content") or []
    if not content:
        fail("No entities found on the default chain. Create or import one entity, then rerun the smoke.", 2)
    for item in content:
        entity = item.get("entity") or {}
        detail = request_json(f"{base_url}/api/entities/{entity.get('id')}/detail", token=token)
        bound_monitors = (detail.get("data") or {}).get("boundMonitors") or []
        if bound_monitors:
            return str(entity["id"])
    return str(content[0]["entity"]["id"])


def poll(predicate, timeout_seconds: int = 20, interval_seconds: float = 1.0):
    deadline = time.time() + timeout_seconds
    last_value = None
    while time.time() < deadline:
        last_value = predicate()
        if last_value:
            return last_value
        time.sleep(interval_seconds)
    return last_value


def build_synthetic_alert_payload(smoke_key: str, detail: dict) -> list[dict]:
    entity = detail.get("entity") or {}
    bound_monitors = detail.get("boundMonitors") or []
    primary_monitor = bound_monitors[0] if bound_monitors else {}
    entity_name = entity.get("name") or entity.get("displayName") or smoke_key
    monitor_name = primary_monitor.get("name") or entity_name
    monitor_instance = primary_monitor.get("instance") or entity_name
    now = datetime.now(timezone.utc)
    starts_at = (now - timedelta(minutes=2)).isoformat().replace("+00:00", "Z")
    description = f"{smoke_key} firing on {monitor_instance}"
    labels = {
        "alertname": smoke_key,
        "severity": "critical",
        "instance": monitor_instance,
        "instancename": monitor_name,
        "service.name": entity_name,
        "__smoke__": smoke_key,
    }
    annotations = {
        "summary": f"{smoke_key} summary",
        "description": description,
    }
    return [
        {
            "labels": labels,
            "annotations": annotations,
            "status": "firing",
            "startsAt": starts_at,
            "generatorURL": "codex://entity-alert-feedback-smoke",
        }
    ]


def fetch_group_alerts(base_url: str, token: str, search: str, status: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "search": search,
            "status": status,
            "pageIndex": 0,
            "pageSize": 20,
        }
    )
    return request_json(f"{base_url}/api/alerts/group?{query}", token=token)


def fetch_entity_alerts(base_url: str, token: str, entity_id: str, status: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "status": status,
            "pageIndex": 0,
            "pageSize": 50,
        }
    )
    return request_json(f"{base_url}/api/entities/{entity_id}/alerts?{query}", token=token)


def entity_alert_total(message: dict) -> int:
    return int(((message.get("data") or {}).get("totalElements")) or 0)


def has_smoke_entity_alert(message: dict, smoke_key: str) -> bool:
    content = ((message.get("data") or {}).get("content")) or []
    for alert in content:
        labels = alert.get("labels") or {}
        annotations = alert.get("annotations") or {}
        if labels.get("__smoke__") == smoke_key or annotations.get("__smoke__") == smoke_key:
            return True
        if smoke_key in (alert.get("content") or ""):
            return True
    return False


def update_group_alert_status(base_url: str, token: str, group_id: int, status: str) -> None:
    request_json(
        f"{base_url}/api/alerts/group/status/{status}?ids={group_id}",
        token=token,
        method="PUT",
    )


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:1157"
    identifier = sys.argv[2] if len(sys.argv) > 2 else "admin"
    credential = sys.argv[3] if len(sys.argv) > 3 else "hertzbeat"
    entity_id = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None

    token = login(base_url, identifier, credential)
    if entity_id is None:
        entity_id = find_entity_id(base_url, token)

    detail_message = request_json(f"{base_url}/api/entities/{entity_id}/detail", token=token)
    if detail_message.get("code") != 0:
        fail("Entity detail request failed.")
    detail = detail_message.get("data") or {}
    smoke_key = f"entity-alert-feedback-smoke-{int(time.time())}"
    create_message = request_json(
        f"{base_url}/api/v2/alerts",
        token=token,
        method="POST",
        body=build_synthetic_alert_payload(smoke_key, detail),
    )
    if create_message.get("code") != 0:
        fail("Failed to create synthetic firing alert for alert feedback smoke.")

    firing_group = poll(
        lambda: (
            (fetch_group_alerts(base_url, token, smoke_key, "firing").get("data") or {}).get("content") or []
        ),
        timeout_seconds=30,
    )
    if not firing_group:
        fail("Synthetic firing alert group did not appear in time.")
    group_id = firing_group[0]["id"]

    firing_entity_alerts = poll(
        lambda: has_smoke_entity_alert(fetch_entity_alerts(base_url, token, entity_id, "firing"), smoke_key),
        timeout_seconds=30,
    )
    if not firing_entity_alerts:
        fail("Synthetic firing alert did not attach to the target entity in time.")

    update_group_alert_status(base_url, token, group_id, "resolved")
    resolved_group = poll(
        lambda: (
            (fetch_group_alerts(base_url, token, smoke_key, "resolved").get("data") or {}).get("content") or []
        ),
        timeout_seconds=30,
    )
    if not resolved_group:
        fail("Synthetic alert did not resolve in time.")

    no_firing_entity_alerts = poll(
        lambda: not has_smoke_entity_alert(fetch_entity_alerts(base_url, token, entity_id, "firing"), smoke_key),
        timeout_seconds=30,
    )
    if not no_firing_entity_alerts:
        fail("Entity firing alerts did not clear after resolving the synthetic alert.")

    update_group_alert_status(base_url, token, group_id, "firing")
    reopened_group = poll(
        lambda: (
            (fetch_group_alerts(base_url, token, smoke_key, "firing").get("data") or {}).get("content") or []
        ),
        timeout_seconds=30,
    )
    if not reopened_group:
        fail("Synthetic alert did not reopen in time.")

    reopened_entity_alerts = poll(
        lambda: has_smoke_entity_alert(fetch_entity_alerts(base_url, token, entity_id, "firing"), smoke_key),
        timeout_seconds=30,
    )
    if not reopened_entity_alerts:
        fail("Entity firing alerts did not reappear after reopening the synthetic alert.")

    update_group_alert_status(base_url, token, group_id, "resolved")
    final_clear = poll(
        lambda: not has_smoke_entity_alert(fetch_entity_alerts(base_url, token, entity_id, "firing"), smoke_key),
        timeout_seconds=30,
    )
    if not final_clear:
        fail("Synthetic alert cleanup failed; entity still shows firing alerts.")

    print(
        json.dumps(
            {
                "entityId": entity_id,
                "smokeKey": smoke_key,
                "groupAlertId": group_id,
                "resolvedCount": len(resolved_group),
                "reopenedCount": len(reopened_group),
                "finalFiringAlerts": entity_alert_total(fetch_entity_alerts(base_url, token, entity_id, "firing")),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
