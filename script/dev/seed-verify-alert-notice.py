#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_BASE_URL = "http://127.0.0.1:1157"
DEFAULT_IDENTIFIER = "admin"
DEFAULT_CREDENTIAL = "hertzbeat"
RECEIVER_NAME = "Codex Demo Email Receiver"
TEMPLATE_NAME = "Codex Demo Email Template"
RULE_NAME = "Codex Demo Routing Rule"
RECEIVER_EMAIL = "ops@example.com"
TEMPLATE_CONTENT = """[${title}]
${targetLabel} : ${target}
${priorityLabel} : ${priority}
${triggerTimeLabel} : ${triggerTime}
${contentLabel} : ${content}
"""


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def request_json(
    base_url: str,
    path: str,
    token: str | None = None,
    method: str = "GET",
    body: dict | list | None = None,
) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(f"{base_url}{path}", data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return {} if raw == "" else json.loads(raw)
    except urllib.error.HTTPError as error:
        fail(f"{method} {path} failed: HTTP {error.code} {error.reason}")
    except urllib.error.URLError as error:
        fail(f"{method} {path} failed: {error.reason}")


def require_success(message: dict, context: str) -> dict:
    if message.get("code") != 0:
        fail(f"{context} failed: {message.get('msg') or message.get('code')}")
    return message.get("data") or {}


def login(base_url: str, identifier: str, credential: str) -> str:
    message = request_json(
        base_url,
        "/api/account/auth/form",
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


def build_list_path(path: str, name: str | None, page_size: int = 1000, extra: dict[str, str] | None = None) -> str:
    params = {
        "pageIndex": "0",
        "pageSize": str(page_size),
    }
    if name:
        params["name"] = name
    if extra:
        params.update(extra)
    return f"{path}?{urllib.parse.urlencode(params)}"


def extract_exact_matches(message: dict, name: str) -> list[dict]:
    content = (message.get("data") or {}).get("content") or []
    return [item for item in content if str(item.get("name") or "") == name]


def list_exact(base_url: str, token: str, path: str, name: str, extra: dict[str, str] | None = None) -> list[dict]:
    message = request_json(base_url, build_list_path(path, name, extra=extra), token=token)
    require_success(message, f"List {path}")
    return extract_exact_matches(message, name)


def delete_record(base_url: str, token: str, path: str, record_id: int) -> None:
    message = request_json(base_url, f"{path}/{record_id}", token=token, method="DELETE")
    require_success(message, f"Delete {path}/{record_id}")


def delete_extra_matches(base_url: str, token: str, path: str, matches: list[dict]) -> None:
    if len(matches) <= 1:
        return
    keep = max(matches, key=lambda item: int(item.get("id") or 0))
    for item in matches:
        if item.get("id") != keep.get("id"):
            delete_record(base_url, token, path, int(item["id"]))


def upsert_exact(
    base_url: str,
    token: str,
    path: str,
    name: str,
    payload: dict,
    extra_list_params: dict[str, str] | None = None,
) -> dict:
    matches = list_exact(base_url, token, path, name, extra=extra_list_params)
    delete_extra_matches(base_url, token, path, matches)
    refreshed = list_exact(base_url, token, path, name, extra=extra_list_params)
    existing = max(refreshed, key=lambda item: int(item.get("id") or 0)) if refreshed else None
    body = dict(payload)
    if existing and existing.get("id") is not None:
        body["id"] = existing["id"]
    method = "PUT" if existing else "POST"
    message = request_json(base_url, path, token=token, method=method, body=body)
    require_success(message, f"{method} {path}")
    final_matches = list_exact(base_url, token, path, name, extra=extra_list_params)
    if not final_matches:
        fail(f"{path} did not persist {name}.")
    return max(final_matches, key=lambda item: int(item.get("id") or 0))


def ensure_single_match(base_url: str, token: str, path: str, name: str, extra: dict[str, str] | None = None) -> dict:
    matches = list_exact(base_url, token, path, name, extra=extra)
    if not matches:
        fail(f"Missing required {path} record named {name}. Run seed mode first.")
    if len(matches) > 1:
        fail(f"Found {len(matches)} {path} records named {name}. Run seed mode to deduplicate.")
    return matches[0]


def build_receiver_payload(existing: dict | None = None) -> dict:
    receiver = {
        "name": RECEIVER_NAME,
        "type": 1,
        "phone": "",
        "email": RECEIVER_EMAIL,
        "hookUrl": "",
        "hookAuthType": "None",
        "hookAuthToken": "",
        "wechatId": "",
        "appId": "",
        "accessToken": "",
        "tgBotToken": "",
        "tgUserId": "",
        "tgMessageThreadId": "",
        "larkReceiveType": 0,
        "userId": "",
        "chatId": "",
        "slackWebHookUrl": "",
        "corpId": "",
        "agentId": None,
        "appSecret": "",
        "partyId": "",
        "tagId": "",
        "discordChannelId": "",
        "discordBotToken": "",
        "smnAk": "",
        "smnSk": "",
        "smnProjectId": "",
        "smnRegion": "",
        "smnTopicUrn": "",
        "serverChanToken": "",
        "gotifyToken": "",
    }
    if existing and existing.get("id") is not None:
        receiver["id"] = existing["id"]
    return receiver


def build_template_payload(existing: dict | None = None) -> dict:
    template = {
        "name": TEMPLATE_NAME,
        "type": 1,
        "preset": False,
        "content": TEMPLATE_CONTENT,
    }
    if existing and existing.get("id") is not None:
        template["id"] = existing["id"]
    return template


def build_rule_payload(receiver: dict, template: dict, existing: dict | None = None) -> dict:
    rule = {
        "name": RULE_NAME,
        "receiverId": [int(receiver["id"])],
        "receiverName": [receiver["name"]],
        "templateId": int(template["id"]),
        "templateName": template["name"],
        "enable": True,
        "filterAll": True,
        "labels": {},
        "days": [1, 2, 3, 4, 5, 6, 7],
        "periodStart": None,
        "periodEnd": None,
    }
    if existing and existing.get("id") is not None:
        rule["id"] = existing["id"]
    return rule


def seed_receiver(base_url: str, token: str) -> dict:
    matches = list_exact(base_url, token, "/api/notice/receivers", RECEIVER_NAME)
    delete_extra_matches(base_url, token, "/api/notice/receiver", matches)
    refreshed = list_exact(base_url, token, "/api/notice/receivers", RECEIVER_NAME)
    existing = max(refreshed, key=lambda item: int(item.get("id") or 0)) if refreshed else None
    payload = build_receiver_payload(existing)
    method = "PUT" if existing else "POST"
    message = request_json(base_url, "/api/notice/receiver", token=token, method=method, body=payload)
    require_success(message, f"{method} /api/notice/receiver")
    return ensure_single_match(base_url, token, "/api/notice/receivers", RECEIVER_NAME)


def seed_template(base_url: str, token: str) -> dict:
    matches = list_exact(base_url, token, "/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"})
    delete_extra_matches(base_url, token, "/api/notice/template", matches)
    refreshed = list_exact(base_url, token, "/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"})
    existing = max(refreshed, key=lambda item: int(item.get("id") or 0)) if refreshed else None
    payload = build_template_payload(existing)
    method = "PUT" if existing else "POST"
    message = request_json(base_url, "/api/notice/template", token=token, method=method, body=payload)
    require_success(message, f"{method} /api/notice/template")
    return ensure_single_match(base_url, token, "/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"})


def seed_rule(base_url: str, token: str, receiver: dict, template: dict) -> dict:
    matches = list_exact(base_url, token, "/api/notice/rules", RULE_NAME)
    delete_extra_matches(base_url, token, "/api/notice/rule", matches)
    refreshed = list_exact(base_url, token, "/api/notice/rules", RULE_NAME)
    existing = max(refreshed, key=lambda item: int(item.get("id") or 0)) if refreshed else None
    payload = build_rule_payload(receiver, template, existing)
    method = "PUT" if existing else "POST"
    message = request_json(base_url, "/api/notice/rule", token=token, method=method, body=payload)
    require_success(message, f"{method} /api/notice/rule")
    return ensure_single_match(base_url, token, "/api/notice/rules", RULE_NAME)


def verify_receiver(base_url: str, token: str, receiver_id: int) -> dict:
    detail = request_json(base_url, f"/api/notice/receiver/{receiver_id}", token=token)
    data = require_success(detail, "Load receiver detail")
    if data.get("name") != RECEIVER_NAME or str(data.get("email") or "") != RECEIVER_EMAIL:
        fail("Receiver detail does not match the seeded notice receiver.")
    matches = ensure_single_match(base_url, token, "/api/notice/receivers", RECEIVER_NAME)
    if int(matches["id"]) != receiver_id:
        fail("Receiver list did not return the seeded receiver id.")
    return data


def verify_template(base_url: str, token: str, template_id: int) -> dict:
    detail = request_json(base_url, f"/api/notice/template/{template_id}", token=token)
    data = require_success(detail, "Load template detail")
    if data.get("name") != TEMPLATE_NAME or data.get("preset") is not False:
        fail("Template detail does not match the seeded custom template.")
    matches = ensure_single_match(base_url, token, "/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"})
    if int(matches["id"]) != template_id:
        fail("Template list did not return the seeded template id.")
    return data


def verify_rule(base_url: str, token: str, rule_id: int, receiver_id: int, template_id: int) -> dict:
    detail = request_json(base_url, f"/api/notice/rule/{rule_id}", token=token)
    data = require_success(detail, "Load rule detail")
    if data.get("name") != RULE_NAME:
        fail("Rule detail does not match the seeded notice rule.")
    if [int(item) for item in (data.get("receiverId") or [])] != [receiver_id]:
        fail("Rule receiver ids do not point at the seeded receiver.")
    if [str(item) for item in (data.get("receiverName") or [])] != [RECEIVER_NAME]:
        fail("Rule receiver names are not populated for page rendering.")
    if int(data.get("templateId") or -1) != template_id:
        fail("Rule template id does not point at the seeded template.")
    if data.get("templateName") != TEMPLATE_NAME:
        fail("Rule template name is missing for page rendering.")
    matches = ensure_single_match(base_url, token, "/api/notice/rules", RULE_NAME)
    if int(matches["id"]) != rule_id:
        fail("Rule list did not return the seeded rule id.")
    return data


def verify_surface_lists(base_url: str, token: str) -> dict:
    receivers = require_success(request_json(base_url, build_list_path("/api/notice/receivers", RECEIVER_NAME), token=token), "Load receivers page")
    rules = require_success(request_json(base_url, build_list_path("/api/notice/rules", RULE_NAME), token=token), "Load rules page")
    templates = require_success(
        request_json(
            base_url,
            build_list_path("/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"}),
            token=token,
        ),
        "Load templates page",
    )
    receivers_all = require_success(request_json(base_url, "/api/notice/receivers/all", token=token), "Load receivers/all")
    templates_all = require_success(request_json(base_url, "/api/notice/templates/all", token=token), "Load templates/all")
    if not any(str(item.get("name") or "") == RECEIVER_NAME for item in receivers_all if isinstance(item, dict)):
        fail("Seeded receiver is missing from /api/notice/receivers/all.")
    if not any(str(item.get("name") or "") == TEMPLATE_NAME for item in templates_all if isinstance(item, dict)):
        fail("Seeded template is missing from /api/notice/templates/all.")
    return {
        "receiversPageTotal": receivers.get("totalElements", 0),
        "rulesPageTotal": rules.get("totalElements", 0),
        "templatesPageTotal": templates.get("totalElements", 0),
        "receiversAllTotal": len(receivers_all) if isinstance(receivers_all, list) else 0,
        "templatesAllTotal": len(templates_all) if isinstance(templates_all, list) else 0,
    }


def seed_notice_data(base_url: str, token: str) -> dict:
    receiver = seed_receiver(base_url, token)
    template = seed_template(base_url, token)
    rule = seed_rule(base_url, token, receiver, template)
    return {
        "receiver": receiver,
        "template": template,
        "rule": rule,
    }


def verify_notice_data(base_url: str, token: str, seed_summary: dict | None = None) -> dict:
    receiver = ensure_single_match(base_url, token, "/api/notice/receivers", RECEIVER_NAME)
    template = ensure_single_match(base_url, token, "/api/notice/templates", TEMPLATE_NAME, extra={"preset": "false"})
    rule = ensure_single_match(base_url, token, "/api/notice/rules", RULE_NAME)
    receiver_detail = verify_receiver(base_url, token, int(receiver["id"]))
    template_detail = verify_template(base_url, token, int(template["id"]))
    rule_detail = verify_rule(base_url, token, int(rule["id"]), int(receiver["id"]), int(template["id"]))
    surface = verify_surface_lists(base_url, token)
    return {
        "receiver": receiver_detail,
        "template": template_detail,
        "rule": rule_detail,
        "surface": surface,
        "seed": seed_summary or {},
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed and verify alert notice receiver/rule/template data.")
    parser.add_argument("base_url", nargs="?", default=DEFAULT_BASE_URL)
    parser.add_argument("identifier", nargs="?", default=DEFAULT_IDENTIFIER)
    parser.add_argument("credential", nargs="?", default=DEFAULT_CREDENTIAL)
    parser.add_argument(
        "--mode",
        choices=("seed", "verify", "seed-and-verify"),
        default="seed-and-verify",
        help="Whether to only seed, only verify, or do both.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    token = login(args.base_url, args.identifier, args.credential)

    seed_summary: dict | None = None
    if args.mode in {"seed", "seed-and-verify"}:
        seed_summary = seed_notice_data(args.base_url, token)

    verify_summary: dict | None = None
    if args.mode in {"verify", "seed-and-verify"}:
        verify_summary = verify_notice_data(args.base_url, token, seed_summary)

    result = {
        "mode": args.mode,
        "baseUrl": args.base_url,
        "receiver": {
            "id": int((verify_summary or seed_summary or {}).get("receiver", {}).get("id") or 0),
            "name": RECEIVER_NAME,
            "email": RECEIVER_EMAIL,
        },
        "template": {
            "id": int((verify_summary or seed_summary or {}).get("template", {}).get("id") or 0),
            "name": TEMPLATE_NAME,
        },
        "rule": {
            "id": int((verify_summary or seed_summary or {}).get("rule", {}).get("id") or 0),
            "name": RULE_NAME,
        },
    }
    if verify_summary:
        result["surface"] = verify_summary["surface"]
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
