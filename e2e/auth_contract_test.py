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

"""验证默认 HertzBeat 镜像的认证契约。"""

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
        raise AssertionError(f"{context} 未返回有效 JSON") from error


def assert_success_response(status, body, context):
    if status != 200:
        raise AssertionError(f"{context} HTTP 状态码应为 200，实际为 {status}")
    data = decode_json(body, context)
    if data.get("code") != 0:
        raise AssertionError(f"{context} 业务状态码应为 0，实际为 {data.get('code')}")
    return data.get("data")


def assert_no_authentication_challenge(headers, context):
    challenges = headers.get_all("WWW-Authenticate", [])
    if challenges:
        schemes = [challenge.split(maxsplit=1)[0] for challenge in challenges]
        raise AssertionError(f"{context} 不应返回 WWW-Authenticate，实际协议为 {schemes}")


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
        raise AssertionError(f"匿名访问应返回 401，实际为 {status}")
    assert_no_authentication_challenge(headers, "匿名访问")


def invalid_bearer_is_rejected_without_challenge(token):
    parts = token.split(".")
    if len(parts) != 3 or not parts[2]:
        raise AssertionError("登录接口返回的 token 不是 JWT")
    replacement = "A" if parts[2][0] != "A" else "B"
    parts[2] = replacement + parts[2][1:]
    invalid_token = ".".join(parts)
    status, headers, _ = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {invalid_token}"
    )
    if status != 401:
        raise AssertionError(f"无效 JWT 应返回 401，实际为 {status}")
    assert_no_authentication_challenge(headers, "无效 JWT")


def login():
    status, _, body = request(
        "/api/account/auth/form",
        method="POST",
        payload={"type": 0, "identifier": USERNAME, "credential": PASSWORD},
    )
    data = assert_success_response(status, body, "表单登录")
    if not isinstance(data, dict):
        raise AssertionError("表单登录响应缺少 data 对象")
    token = data.get("token")
    refresh_token = data.get("refreshToken")
    if not isinstance(token, str) or not token:
        raise AssertionError("表单登录响应缺少 token")
    if not isinstance(refresh_token, str) or not refresh_token:
        raise AssertionError("表单登录响应缺少 refreshToken")
    return token, refresh_token


def bearer_access_succeeds(token):
    status, _, body = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {token}"
    )
    assert_success_response(status, body, "JWT 访问")


def basic_access_succeeds():
    credentials = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode("utf-8"))
    status, _, body = request(
        PROTECTED_RESOURCE,
        authorization=f"Basic {credentials.decode('ascii')}",
    )
    assert_success_response(status, body, "Basic 访问")


def refresh_token_succeeds(refresh_token):
    status, _, body = request(
        "/api/account/auth/refresh",
        method="POST",
        payload={"token": refresh_token},
    )
    data = assert_success_response(status, body, "刷新令牌")
    if not isinstance(data, dict) or not data.get("token") or not data.get("refreshToken"):
        raise AssertionError("刷新令牌响应缺少 token 或 refreshToken")

    status, _, body = request(
        PROTECTED_RESOURCE, authorization=f"Bearer {data['token']}"
    )
    assert_success_response(status, body, "刷新后的 JWT 访问")


def main():
    print(f"HertzBeat 认证契约测试: {SERVER}")
    run_case("匿名访问返回 401 且不触发浏览器认证", anonymous_access_is_rejected_without_challenge)
    token, refresh_token = run_case("表单登录返回访问令牌和刷新令牌", login)
    run_case(
        "无效 JWT 返回 401 且不触发浏览器认证",
        lambda: invalid_bearer_is_rejected_without_challenge(token),
    )
    run_case("有效 JWT 可访问受保护接口", lambda: bearer_access_succeeds(token))
    run_case("默认 Basic 认证可访问受保护接口", basic_access_succeeds)
    run_case("刷新令牌可签发并使用新 JWT", lambda: refresh_token_succeeds(refresh_token))
    print("认证契约测试全部通过。")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, OSError, urllib.error.URLError):
        sys.exit(1)
