# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

"""Verify the authentication contract of the default HertzBeat image."""

import base64
import json
import os
import sys
import urllib.error
import urllib.request


SERVER = os.getenv("SERVER", "http://localhost:1157").rstrip("/")
USERNAME = os.getenv("AUTH_USERNAME", "admin")
PASSWORD = os.getenv("AUTH_PASSWORD", "hertzbeat")
TIMEOUT = float(os.getenv("AUTH_TEST_TIMEOUT", "10"))
PROTECTED_RESOURCE = "/api/monitors?pageIndex=0&pageSize=1"


def request(path, method="GET", payload=None, authorization=None):
    headers = {"Accept": "application/json"}
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    if authorization is not None:
        headers["Authorization"] = authorization

    req = urllib.request.Request(
        f"{SERVER}{path}", data=body, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def decode_json(body, context):
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AssertionError(f"{context} did not return valid JSON") from error


def assert_success_response(status, body, context):
    if status != 200:
        raise AssertionError(f"{context} returned HTTP {status}; expected 200")
    data = decode_json(body, context)
    if data.get("code") != 0:
        raise AssertionError(
            f"{context} returned business code {data.get('code')}; expected 0"
        )
    return data.get("data")


def assert_no_authentication_challenge(headers, context):
    challenges = headers.get_all("WWW-Authenticate", [])
    if challenges:
        schemes = [challenge.split(maxsplit=1)[0] for challenge in challenges]
        raise AssertionError(
            f"{context} returned unexpected WWW-Authenticate schemes: {schemes}"
        )


def run_case(name, case):
    try:
        result = case()
        print(f"PASS: {name}")
        return result
    except Exception as error:
        print(f"FAIL: {name}: {error}", file=sys.stderr)
        raise


def anonymous_access_is_rejected_without_challenge():
    status, headers, _ = request(PROTECTED_RESOURCE)
    if status != 401:
        raise AssertionError(f"Anonymous access returned HTTP {status}; expected 401")
    assert_no_authentication_challenge(headers, "Anonymous access")


def invalid_bearer_is_rejected_without_challenge(token):
    parts = token.split(".")
    if len(parts) != 3 or not parts[2]:
        raise AssertionError("The login token is not a JWT")
    replacement = "A" if parts[2][0] != "A" else "B"
    parts[2] = replacement + parts[2][1:]
    invalid_token = ".".join(parts)
    status, headers, _ = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {invalid_token}"
    )
    if status != 401:
        raise AssertionError(f"Invalid JWT returned HTTP {status}; expected 401")
    assert_no_authentication_challenge(headers, "Invalid JWT")


def login():
    status, _, body = request(
        "/api/account/auth/form",
        method="POST",
        payload={"type": 0, "identifier": USERNAME, "credential": PASSWORD},
    )
    data = assert_success_response(status, body, "Form login")
    if not isinstance(data, dict):
        raise AssertionError("Form login response is missing the data object")
    token = data.get("token")
    refresh_token = data.get("refreshToken")
    if not isinstance(token, str) or not token:
        raise AssertionError("Form login response is missing token")
    if not isinstance(refresh_token, str) or not refresh_token:
        raise AssertionError("Form login response is missing refreshToken")
    return token, refresh_token


def bearer_access_succeeds(token):
    status, _, body = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {token}"
    )
    assert_success_response(status, body, "JWT access")


def basic_access_succeeds():
    credentials = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode("utf-8"))
    status, _, body = request(
        PROTECTED_RESOURCE,
        authorization=f"Basic {credentials.decode('ascii')}",
    )
    assert_success_response(status, body, "Basic access")


def refresh_token_succeeds(refresh_token):
    status, _, body = request(
        "/api/account/auth/refresh",
        method="POST",
        payload={"token": refresh_token},
    )
    data = assert_success_response(status, body, "Token refresh")
    if (
        not isinstance(data, dict)
        or not data.get("token")
        or not data.get("refreshToken")
    ):
        raise AssertionError("Token refresh response is missing token or refreshToken")

    status, _, body = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {data['token']}"
    )
    assert_success_response(status, body, "Refreshed JWT access")


def main():
    print(f"HertzBeat authentication contract tests: {SERVER}")
    run_case(
        "anonymous access returns 401 without a browser authentication challenge",
        anonymous_access_is_rejected_without_challenge,
    )
    token, refresh_token = run_case(
        "form login returns access and refresh tokens", login
    )
    run_case(
        "invalid JWT returns 401 without a browser authentication challenge",
        lambda: invalid_bearer_is_rejected_without_challenge(token),
    )
    run_case(
        "valid JWT can access a protected API", lambda: bearer_access_succeeds(token)
    )
    run_case(
        "default Basic authentication can access a protected API",
        basic_access_succeeds,
    )
    run_case(
        "refresh token issues a usable JWT",
        lambda: refresh_token_succeeds(refresh_token),
    )
    print("All authentication contract tests passed.")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError, urllib.error.URLError):
        sys.exit(1)
