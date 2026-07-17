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

"""Recursively reject application-language Agent distributions from releases."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import tarfile
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree


MAX_NESTED_DEPTH = 6
MAX_ARCHIVE_MEMBER_BYTES = 512 * 1024 * 1024
MAX_PACKAGE_METADATA_BYTES = 4 * 1024 * 1024
JAVA_AGENT_GROUP = "io.opentelemetry.javaagent"
JAVA_AGENT_ARTIFACT = "opentelemetry-javaagent"

FORBIDDEN_DISTRIBUTION_NAME = re.compile(
    r"(?:^|[/_.-])(?:"
    r"opentelemetry-javaagent|otel-javaagent|dd-java-agent|elastic-apm-agent|"
    r"skywalking-agent|pinpoint-agent|newrelic-agent|"
    r"opentelemetry-dotnet-auto|otel-dotnet-auto|opentelemetry\.autoinstrumentation|"
    r"auto-instrumentations-node|opentelemetry-distro|"
    r"opentelemetry-instrumentation-(?:python|php)|"
    r"opentelemetry-ebpf|otel-ebpf|ebpf-agent"
    r")(?:$|[/_.-])",
    re.IGNORECASE,
)
FORBIDDEN_LANGUAGE_SDK_COMPONENT = re.compile(
    r"(?:opentelemetry-sdk-(?:node|python|php|dotnet)|"
    r"openTelemetry\.extensions\.hosting|"
    r"openTelemetry\.instrumentation\.(?:aspnetcore|http))",
    re.IGNORECASE,
)
FORBIDDEN_ECOSYSTEM_PACKAGE_PATH = re.compile(
    r"(?:^|/)(?:"
    r"node_modules/@opentelemetry/(?:sdk-node|sdk-trace-node|sdk-metrics|sdk-logs)(?:/|$)|"
    r"(?:site-packages|dist-packages)/opentelemetry/sdk(?:/|$)|"
    r"opentelemetry_sdk(?:[-_.]|$)|"
    r"vendor/open-telemetry/sdk(?:/|$)|"
    r"vendor/go\.opentelemetry\.io/(?:otel/sdk|auto)(?:/|$)|"
    r"pkg/mod/go\.opentelemetry\.io/(?:otel/sdk|auto)(?:@[^/]+)?(?:/|$)|"
    r"(?:extensions?|lib)/opentelemetry\.(?:so|dll|dylib)$|"
    r"opentelemetry\.[0-9][^/]*\.nupkg$"
    r")",
    re.IGNORECASE,
)
FORBIDDEN_LANGUAGE_SDK_PURL = re.compile(
    r"pkg:(?:npm/%40opentelemetry/sdk-(?:node|trace-node|metrics|logs)|"
    r"pypi/opentelemetry-sdk|composer/open-telemetry/sdk|nuget/opentelemetry)(?:@|\?|$)",
    re.IGNORECASE,
)
KNOWN_AGENT_CLASS = "io/opentelemetry/javaagent/OpenTelemetryAgent.class"
KNOWN_AGENT_PREMAIN = re.compile(
    r"^(?:io\.opentelemetry\.javaagent|com\.datadog|co\.elastic\.apm|"
    r"org\.apache\.skywalking|com\.navercorp\.pinpoint|com\.newrelic)",
    re.IGNORECASE,
)


class ReleasePolicyError(RuntimeError):
    """Release content violates the no-application-Agent policy."""


def normalized_name(name: str) -> str:
    return str(PurePosixPath(name.replace("\\", "/"))).lower()


def looks_like_archive(name: str) -> bool:
    lowered = normalized_name(name)
    return lowered.endswith((".jar", ".zip", ".war", ".ear", ".nupkg", ".whl", ".tar", ".tar.gz", ".tgz"))


def has_archive_signature(payload: bytes) -> bool:
    """Recognize renamed nested ZIP, gzip, and uncompressed tar members."""
    return (payload.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08", b"\x1f\x8b"))
            or len(payload) >= 265 and payload[257:262] == b"ustar")


def reject_distribution_name(path: str) -> None:
    normalized = normalized_name(path)
    if (FORBIDDEN_DISTRIBUTION_NAME.search(normalized)
            or FORBIDDEN_LANGUAGE_SDK_COMPONENT.search(normalized)
            or FORBIDDEN_ECOSYSTEM_PACKAGE_PATH.search(normalized)):
        raise ReleasePolicyError(f"forbidden application instrumentation distribution: {path}")


def inspect_ecosystem_package_metadata(name: str, payload: bytes, logical_path: str) -> None:
    normalized = normalized_name(name)
    if len(payload) > MAX_PACKAGE_METADATA_BYTES:
        raise ReleasePolicyError(f"package metadata exceeds safety limit: {logical_path}")
    text = payload.decode("utf-8", errors="replace")
    if normalized.endswith(".dist-info/metadata"):
        if re.search(r"(?im)^Name:\s*opentelemetry-sdk\s*$", text):
            raise ReleasePolicyError(f"forbidden Python OpenTelemetry SDK package metadata: {logical_path}")
    if normalized.endswith(".nuspec"):
        if re.search(r"(?is)<(?:[a-z0-9_-]+:)?id>\s*OpenTelemetry\s*</(?:[a-z0-9_-]+:)?id>", text):
            raise ReleasePolicyError(f"forbidden .NET OpenTelemetry SDK package metadata: {logical_path}")
    if normalized.endswith("package.json"):
        try:
            package_name = json.loads(text).get("name")
        except (AttributeError, json.JSONDecodeError):
            return
        if package_name in {
                "@opentelemetry/sdk-node",
                "@opentelemetry/sdk-trace-node",
                "@opentelemetry/sdk-metrics",
                "@opentelemetry/sdk-logs"}:
            raise ReleasePolicyError(f"forbidden Node.js OpenTelemetry SDK package metadata: {logical_path}")


def inspect_zip(payload: bytes, logical_path: str, depth: int) -> None:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        names = archive.namelist()
        name_by_normalized = {normalized_name(name): name for name in names}
        for name in names:
            member_path = f"{logical_path}!/{name}"
            reject_distribution_name(member_path)
            normalized = normalized_name(name)
            if (normalized.endswith(".dist-info/metadata")
                    or normalized.endswith(".nuspec")
                    or normalized.endswith("package.json")):
                inspect_ecosystem_package_metadata(name, archive.read(name), member_path)
            if normalized.endswith("release-inventory.json"):
                verify_release_inventory_payload(
                    archive.read(name),
                    member_path,
                    lambda sibling: archive.read(name_by_normalized[normalized_name(sibling)]),
                )
        inspect_java_agent_signature(archive, logical_path, names)
        for info in archive.infolist():
            if info.is_dir():
                continue
            member_path = f"{logical_path}!/{info.filename}"
            with archive.open(info) as member:
                prefix = member.read(512)
            if not looks_like_archive(info.filename) and not has_archive_signature(prefix):
                if normalized_name(info.filename).endswith("hertzbeat-collector.cdx.json"):
                    verify_collector_sbom_payload(archive.read(info), member_path)
                continue
            if info.file_size > MAX_ARCHIVE_MEMBER_BYTES:
                raise ReleasePolicyError(f"nested archive member exceeds safety limit: {logical_path}!/{info.filename}")
            inspect_nested_member(archive.read(info), f"{logical_path}!/{info.filename}", depth + 1)


def inspect_java_agent_signature(archive: zipfile.ZipFile, logical_path: str, names: list[str]) -> None:
    normalized_names = {normalized_name(name) for name in names}
    if KNOWN_AGENT_CLASS.lower() in normalized_names:
        raise ReleasePolicyError(f"renamed OpenTelemetry Java Agent binary: {logical_path}")
    manifest_name = next((name for name in names if normalized_name(name) == "meta-inf/manifest.mf"), None)
    if manifest_name is None:
        return
    manifest = archive.read(manifest_name).decode("utf-8", errors="replace")
    premain_match = re.search(r"(?im)^Premain-Class:\s*([^\r\n]+)", manifest)
    if premain_match and KNOWN_AGENT_PREMAIN.search(premain_match.group(1).strip()):
        raise ReleasePolicyError(f"renamed application Java Agent manifest: {logical_path}")


def inspect_tar(payload: bytes, logical_path: str, depth: int) -> None:
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:*") as archive:
        members = archive.getmembers()
        member_by_normalized = {normalized_name(member.name): member for member in members if member.isfile()}
        for member in members:
            member_path = f"{logical_path}!/{member.name}"
            reject_distribution_name(member_path)
            if not member.isfile():
                continue
            extracted = archive.extractfile(member)
            if extracted is None:
                continue
            prefix = extracted.read(512)
            normalized = normalized_name(member.name)
            if (normalized.endswith(".dist-info/metadata")
                    or normalized.endswith(".nuspec")
                    or normalized.endswith("package.json")):
                metadata_payload = prefix + extracted.read(MAX_PACKAGE_METADATA_BYTES + 1 - len(prefix))
                inspect_ecosystem_package_metadata(member.name, metadata_payload, member_path)
                continue
            if normalized.endswith("release-inventory.json"):
                inventory_payload = prefix + extracted.read()
                verify_release_inventory_payload(
                    inventory_payload,
                    member_path,
                    lambda sibling: read_tar_member(archive, member_by_normalized[normalized_name(sibling)]),
                )
                continue
            is_collector_sbom = normalized_name(member.name).endswith("hertzbeat-collector.cdx.json")
            is_archive = looks_like_archive(member.name) or has_archive_signature(prefix)
            if not is_collector_sbom and not is_archive:
                continue
            member_payload = prefix + extracted.read(MAX_ARCHIVE_MEMBER_BYTES + 1 - len(prefix))
            if is_collector_sbom:
                verify_collector_sbom_payload(member_payload, member_path)
            if is_archive:
                inspect_nested_member(member_payload, member_path, depth + 1)


def read_tar_member(archive: tarfile.TarFile, member: tarfile.TarInfo) -> bytes:
    extracted = archive.extractfile(member)
    if extracted is None:
        raise ReleasePolicyError(f"cannot read release inventory member: {member.name}")
    return extracted.read()


def verify_release_inventory_payload(payload: bytes, logical_path: str, member_reader) -> None:
    document = json.loads(payload.decode("utf-8"))
    if document.get("schemaVersion") != "1.0":
        raise ReleasePolicyError(f"unsupported release inventory schema: {logical_path}")
    artifacts = document.get("artifacts") or []
    paths = {artifact.get("path") for artifact in artifacts}
    required = {"hertzbeat-collector.cdx.json", "hertzbeat-otel-runtime.cdx.json"}
    if paths != required:
        raise ReleasePolicyError(f"release inventory must list exactly both SBOMs: {logical_path}")
    inventory_member = logical_path.rsplit("!/", 1)[-1]
    parent = str(PurePosixPath(inventory_member).parent)
    for artifact in artifacts:
        sibling = str(PurePosixPath(parent) / artifact["path"])
        try:
            content = member_reader(sibling)
        except KeyError as exc:
            raise ReleasePolicyError(f"release inventory member is missing: {sibling}") from exc
        actual = hashlib.sha512(content).hexdigest()
        if actual != artifact.get("sha512"):
            raise ReleasePolicyError(f"release inventory checksum mismatch: {sibling}")


def inspect_nested_member(payload: bytes, logical_path: str, depth: int) -> None:
    if depth > MAX_NESTED_DEPTH:
        raise ReleasePolicyError(f"nested archive depth exceeds {MAX_NESTED_DEPTH}: {logical_path}")
    if len(payload) > MAX_ARCHIVE_MEMBER_BYTES:
        raise ReleasePolicyError(f"nested archive member exceeds safety limit: {logical_path}")
    reject_distribution_name(logical_path)
    try:
        if zipfile.is_zipfile(io.BytesIO(payload)):
            inspect_zip(payload, logical_path, depth)
            return
        try:
            inspect_tar(payload, logical_path, depth)
        except tarfile.ReadError:
            return
    except (OSError, tarfile.TarError, zipfile.BadZipFile) as exc:
        raise ReleasePolicyError(f"cannot inspect nested archive {logical_path}: {type(exc).__name__}") from exc


def inspect_release_archive(path: Path) -> None:
    reject_distribution_name(path.name)
    payload = path.read_bytes()
    inspect_nested_member(payload, str(path), 0)


def read_source_member(path: Path, suffix: str) -> bytes:
    payload = path.read_bytes()
    if zipfile.is_zipfile(io.BytesIO(payload)):
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            matches = [name for name in archive.namelist() if normalized_name(name).endswith(suffix)]
            if len(matches) != 1:
                raise ReleasePolicyError(f"source archive must contain one {suffix}: {path}")
            return archive.read(matches[0])
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:*") as archive:
        matches = [member for member in archive.getmembers()
                   if member.isfile() and normalized_name(member.name).endswith(suffix)]
        if len(matches) != 1:
            raise ReleasePolicyError(f"source archive must contain one {suffix}: {path}")
        extracted = archive.extractfile(matches[0])
        if extracted is None:
            raise ReleasePolicyError(f"cannot read source policy file: {matches[0].name}")
        return extracted.read()


def verify_source_java_agent_scope(path: Path) -> None:
    pom = read_source_member(path, "hertzbeat-collector/hertzbeat-collector-collector/pom.xml")
    root = ElementTree.fromstring(pom)
    dependencies = []
    for dependency in root.findall(".//{*}dependency"):
        group_id = dependency.findtext("{*}groupId")
        artifact_id = dependency.findtext("{*}artifactId")
        if group_id == JAVA_AGENT_GROUP and artifact_id == JAVA_AGENT_ARTIFACT:
            dependencies.append(dependency)
    if len(dependencies) != 1:
        raise ReleasePolicyError("source archive must contain exactly one approved Java Agent dependency")
    scope = (dependencies[0].findtext("{*}scope") or "").strip()
    if scope != "test":
        raise ReleasePolicyError("approved Java Agent dependency must remain test scoped")


def component_values(component: dict) -> str:
    fields = [component.get(key) for key in ("group", "name", "purl", "bom-ref")]
    return " ".join(str(value) for value in fields if value).lower()


def walk_components(components: list[dict]) -> list[dict]:
    flattened = []
    for component in components:
        flattened.append(component)
        flattened.extend(walk_components(component.get("components") or []))
    return flattened


def verify_collector_sbom_payload(payload: bytes, logical_path: str) -> None:
    document = json.loads(payload.decode("utf-8"))
    if document.get("bomFormat") != "CycloneDX":
        raise ReleasePolicyError(f"Collector SBOM is not CycloneDX: {logical_path}")
    for component in walk_components(document.get("components") or []):
        value = component_values(component)
        if (JAVA_AGENT_GROUP in value and JAVA_AGENT_ARTIFACT in value
                or FORBIDDEN_DISTRIBUTION_NAME.search(value)
                or FORBIDDEN_LANGUAGE_SDK_COMPONENT.search(value)
                or FORBIDDEN_LANGUAGE_SDK_PURL.search(value)
                or "@opentelemetry sdk-node" in value
                or "open-telemetry sdk" in value):
            raise ReleasePolicyError(f"forbidden release SBOM component: {value}")


def verify_collector_sbom(path: Path) -> None:
    verify_collector_sbom_payload(path.read_bytes(), str(path))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", type=Path, default=[])
    parser.add_argument("--jvm", action="append", type=Path, default=[])
    parser.add_argument("--native", action="append", type=Path, default=[])
    parser.add_argument("--collector-sbom", action="append", type=Path, default=[])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supplied = args.source + args.jvm + args.native + args.collector_sbom
    if not supplied:
        print("at least one release archive or Collector SBOM is required", file=sys.stderr)
        return 2
    try:
        for path in supplied:
            if not path.is_file():
                raise ReleasePolicyError(f"release input is missing: {path}")
        for path in args.source:
            inspect_release_archive(path)
            verify_source_java_agent_scope(path)
        for path in args.jvm + args.native:
            inspect_release_archive(path)
        for path in args.collector_sbom:
            verify_collector_sbom(path)
    except (ReleasePolicyError, ElementTree.ParseError, json.JSONDecodeError) as exc:
        print(f"Hybrid Collector release content check failed: {exc}", file=sys.stderr)
        return 1
    print("Hybrid Collector recursive release content contract passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
