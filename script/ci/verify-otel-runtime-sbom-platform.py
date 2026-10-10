#!/usr/bin/env python3

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Verify managed runtime platform, Go build metadata, and SBOM qualifiers."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs


PLATFORMS = {
    "macos-arm64": ("darwin", "arm64", "hertzbeat-otel-runtime"),
    "macos-amd64": ("darwin", "amd64", "hertzbeat-otel-runtime"),
    "linux-arm64": ("linux", "arm64", "hertzbeat-otel-runtime"),
    "linux-amd64": ("linux", "amd64", "hertzbeat-otel-runtime"),
    "windows-amd64": ("windows", "amd64", "hertzbeat-otel-runtime.exe"),
}


class RuntimeSbomPlatformError(RuntimeError):
    """Runtime binary and SBOM target metadata do not agree."""


def parse_go_build_metadata(output: str) -> dict[str, str]:
    metadata = {}
    for line in output.splitlines():
        fields = line.strip().split("\t")
        if len(fields) != 2 or fields[0] != "build" or "=" not in fields[1]:
            continue
        key, value = fields[1].split("=", 1)
        metadata[key] = value
    return metadata


def read_go_version_metadata(binary: Path) -> str:
    try:
        result = subprocess.run(
            ["go", "version", "-m", str(binary)],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise RuntimeSbomPlatformError(
            f"cannot read Go build metadata from {binary}") from exc
    return result.stdout


def read_sbom_qualifiers(sbom: Path) -> dict[str, list[str]]:
    try:
        document = json.loads(sbom.read_text(encoding="utf-8"))
        purl = document["metadata"]["component"]["purl"]
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeSbomPlatformError(
            f"runtime SBOM root component purl is missing or invalid: {sbom}") from exc
    if not isinstance(purl, str) or "?" not in purl:
        raise RuntimeSbomPlatformError(
            f"runtime SBOM root component purl has no target qualifiers: {sbom}")
    return parse_qs(purl.partition("?")[2], keep_blank_values=True)


def verify_platform_directory(
        platform_dir: Path,
        go_version_output: str | None = None) -> None:
    platform = platform_dir.name
    if platform not in PLATFORMS:
        raise RuntimeSbomPlatformError(f"unsupported runtime platform directory: {platform}")
    expected_goos, expected_goarch, binary_name = PLATFORMS[platform]
    binary = platform_dir / binary_name
    sbom = platform_dir / "hertzbeat-otel-runtime.cdx.json"
    if not binary.is_file():
        raise RuntimeSbomPlatformError(f"runtime binary is missing: {binary}")
    if not sbom.is_file():
        raise RuntimeSbomPlatformError(f"runtime SBOM is missing: {sbom}")

    build_metadata = parse_go_build_metadata(
        go_version_output if go_version_output is not None else read_go_version_metadata(binary)
    )
    actual_goos = build_metadata.get("GOOS")
    actual_goarch = build_metadata.get("GOARCH")
    if (actual_goos, actual_goarch) != (expected_goos, expected_goarch):
        raise RuntimeSbomPlatformError(
            f"{platform} binary target is {actual_goos}/{actual_goarch}, "
            f"expected {expected_goos}/{expected_goarch}")

    qualifiers = read_sbom_qualifiers(sbom)
    sbom_goos = qualifiers.get("goos")
    sbom_goarch = qualifiers.get("goarch")
    if sbom_goos != [expected_goos] or sbom_goarch != [expected_goarch]:
        raise RuntimeSbomPlatformError(
            f"{platform} SBOM target is goos={sbom_goos}, goarch={sbom_goarch}; "
            f"expected goos={expected_goos}, goarch={expected_goarch}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("platform_dir", nargs="+", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        for platform_dir in args.platform_dir:
            verify_platform_directory(platform_dir)
    except RuntimeSbomPlatformError as exc:
        print(f"OpenTelemetry runtime SBOM platform check failed: {exc}", file=sys.stderr)
        return 1
    print("OpenTelemetry runtime SBOM platform contract passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
