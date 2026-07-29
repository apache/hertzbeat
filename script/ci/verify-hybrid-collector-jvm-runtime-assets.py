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

"""Verify runtime metadata embedded in platform JVM Hybrid packages."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path


PLATFORM_BINARIES = {
    "macos-arm64": "hertzbeat-otel-runtime",
    "macos-amd64": "hertzbeat-otel-runtime",
    "linux-arm64": "hertzbeat-otel-runtime",
    "linux-amd64": "hertzbeat-otel-runtime",
    "windows-amd64": "hertzbeat-otel-runtime.exe",
}
SBOM_FILES = {
    "hertzbeat-collector.cdx.json",
    "hertzbeat-otel-runtime.cdx.json",
}
FIXED_METADATA_FILES = {
    "runtime-manifest.json",
    "release-inventory.json",
}
SHA512_LINE = re.compile(r"^([0-9a-fA-F]{128})[ \t]+[*]?([^ \t].*)$")


class JvmRuntimeAssetError(RuntimeError):
    """Platform JVM package runtime assets violate the release contract."""


def sha512(path: Path) -> str:
    digest = hashlib.sha512()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_inventory(runtime_dir: Path) -> None:
    inventory_path = runtime_dir / "release-inventory.json"
    try:
        inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise JvmRuntimeAssetError(f"invalid release inventory: {inventory_path}") from exc
    if inventory.get("schemaVersion") != "1.0":
        raise JvmRuntimeAssetError("release inventory schemaVersion must be 1.0")
    artifacts = inventory.get("artifacts")
    if not isinstance(artifacts, list) or len(artifacts) != len(SBOM_FILES):
        raise JvmRuntimeAssetError("release inventory must bind exactly both SBOMs")
    artifact_by_path = {}
    for artifact in artifacts:
        if not isinstance(artifact, dict) or not isinstance(artifact.get("path"), str):
            raise JvmRuntimeAssetError("release inventory contains an invalid artifact")
        if artifact["path"] in artifact_by_path:
            raise JvmRuntimeAssetError("release inventory contains a duplicate artifact")
        artifact_by_path[artifact["path"]] = artifact
    if set(artifact_by_path) != SBOM_FILES:
        raise JvmRuntimeAssetError("release inventory must bind exactly both SBOMs")
    for name, artifact in artifact_by_path.items():
        expected = sha512(runtime_dir / name)
        if artifact.get("sha512") != expected:
            raise JvmRuntimeAssetError(f"release inventory checksum mismatch: {name}")


def verify_sha512sums(runtime_dir: Path, binary_name: str) -> None:
    expected_names = {binary_name, *SBOM_FILES, *FIXED_METADATA_FILES}
    checksum_path = runtime_dir / "SHA512SUMS"
    entries = {}
    try:
        lines = checksum_path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise JvmRuntimeAssetError(f"cannot read runtime checksums: {checksum_path}") from exc
    for line in lines:
        match = SHA512_LINE.fullmatch(line)
        if match is None:
            raise JvmRuntimeAssetError(f"invalid SHA512SUMS line: {line}")
        digest, name = match.groups()
        if name in entries:
            raise JvmRuntimeAssetError(f"duplicate SHA512SUMS entry: {name}")
        entries[name] = digest.lower()
    if set(entries) != expected_names:
        raise JvmRuntimeAssetError(
            f"SHA512SUMS must bind exactly {sorted(expected_names)}")
    for name, expected in entries.items():
        member = runtime_dir / name
        if not member.is_file():
            raise JvmRuntimeAssetError(f"SHA512SUMS member is missing: {name}")
        if sha512(member) != expected:
            raise JvmRuntimeAssetError(f"SHA512SUMS digest mismatch: {name}")


def verify_runtime_directory(root: Path, platform: str) -> None:
    runtime_root = root / "runtime"
    if platform == "generic":
        if runtime_root.exists():
            raise JvmRuntimeAssetError(
                "generic JVM package must not contain managed runtime assets")
        return
    if platform not in PLATFORM_BINARIES:
        raise JvmRuntimeAssetError(f"unsupported JVM Hybrid platform: {platform}")
    if not runtime_root.is_dir():
        raise JvmRuntimeAssetError(f"{platform} JVM Hybrid package is missing runtime assets")
    platform_entries = list(runtime_root.iterdir())
    if len(platform_entries) != 1 or platform_entries[0].name != platform:
        raise JvmRuntimeAssetError(
            f"JVM Hybrid package must contain only runtime/{platform}")

    runtime_dir = runtime_root / platform
    binary_name = PLATFORM_BINARIES[platform]
    required_names = {
        binary_name,
        "runtime-manifest.json",
        *SBOM_FILES,
        "release-inventory.json",
        "SHA512SUMS",
        "licenses",
    }
    actual_names = {entry.name for entry in runtime_dir.iterdir()}
    if actual_names != required_names:
        raise JvmRuntimeAssetError(
            f"runtime/{platform} must contain exactly {sorted(required_names)}")
    for name in required_names - {"licenses"}:
        if not (runtime_dir / name).is_file():
            raise JvmRuntimeAssetError(f"runtime asset is not a file: {name}")
    licenses = runtime_dir / "licenses"
    if not licenses.is_dir() or not any(path.is_file() for path in licenses.rglob("*")):
        raise JvmRuntimeAssetError("runtime licenses directory must contain at least one file")

    verify_inventory(runtime_dir)
    verify_sha512sums(runtime_dir, binary_name)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("platform")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        verify_runtime_directory(args.root, args.platform)
    except JvmRuntimeAssetError as exc:
        print(f"Hybrid Collector JVM runtime asset check failed: {exc}", file=sys.stderr)
        return 1
    print(f"Hybrid Collector JVM runtime asset contract passed for {args.platform}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
