#!/usr/bin/env python3

import json
import sys
import urllib.error
import urllib.request


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
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        fail(f"{method} {url} failed: HTTP {error.code} {error.reason}")
    except urllib.error.URLError as error:
        fail(f"{method} {url} failed: {error.reason}")


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:1157"
    identifier = sys.argv[2] if len(sys.argv) > 2 else "admin"
    credential = sys.argv[3] if len(sys.argv) > 3 else "hertzbeat"
    entity_id = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None

    login_message = request_json(
        f"{base_url}/api/account/auth/form",
        method="POST",
        body={
            "type": 1,
            "identifier": identifier,
            "credential": credential,
        },
    )
    if login_message.get("code") != 0 or not login_message.get("data", {}).get("token"):
        fail("Login failed for default chain smoke.")
    token = login_message["data"]["token"]

    if entity_id is None:
        list_message = request_json(f"{base_url}/api/entities?pageIndex=0&pageSize=1", token=token)
        if list_message.get("code") != 0:
            fail("Entity list request failed.")
        content = (list_message.get("data") or {}).get("content") or []
        if not content:
            fail("No entities found on the default chain. Create or import one entity, then rerun the smoke.", 2)
        entity_id = str(content[0]["entity"]["id"])

    detail_message = request_json(f"{base_url}/api/entities/{entity_id}/detail", token=token)
    if detail_message.get("code") != 0:
        fail("Entity detail request failed.")
    detail = detail_message.get("data") or {}
    required_detail_fields = [
        "evidenceSummary",
        "alertSummary",
        "monitorSummary",
        "logSummary",
        "opsSummary",
        "nextActions",
        "statusPageSummary",
        "responseHandoffs",
    ]
    missing_fields = [field for field in required_detail_fields if field not in detail]
    if missing_fields:
        fail(f"Entity detail is missing ops workspace fields: {', '.join(missing_fields)}")

    alerts_message = request_json(f"{base_url}/api/entities/{entity_id}/alerts?pageIndex=0&pageSize=5", token=token)
    if alerts_message.get("code") != 0:
        fail("Entity alerts request failed.")

    monitors_message = request_json(
        f"{base_url}/api/entities/{entity_id}/monitors?pageIndex=0&pageSize=5",
        token=token,
    )
    if monitors_message.get("code") != 0:
        fail("Entity monitors request failed.")

    print(
        json.dumps(
            {
                "entityId": entity_id,
                "detailFields": required_detail_fields,
                "alertsTotal": (alerts_message.get("data") or {}).get("totalElements", 0),
                "monitorsTotal": (monitors_message.get("data") or {}).get("totalElements", 0),
                "nextActionCount": len(detail.get("nextActions") or []),
                "handoffKinds": sorted((detail.get("responseHandoffs") or {}).keys()),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
