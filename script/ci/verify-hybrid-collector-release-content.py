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
import stat
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
RELEASE_SBOM_NAMES = {
    "hertzbeat-collector.cdx.json",
    "hertzbeat-otel-runtime.cdx.json",
}

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
NATIVE_PACKAGE_ROOT = re.compile(
    r"^apache-hertzbeat-collector-native-(?P<version>.+)-"
    r"(?P<platform>macos-arm64|macos-amd64|linux-arm64|linux-amd64|windows-amd64)-bin$"
)
RUNTIME_PLATFORMS = {
    "macos-arm64",
    "macos-amd64",
    "linux-arm64",
    "linux-amd64",
    "windows-amd64",
}
ALLOWED_JVM_NATIVE_JAR_PREFIXES = (
    "jna-",
    "lz4-java-",
    "netty-resolver-dns-native-",
    "netty-tcnative-boringssl-static-",
    "netty-transport-native-",
    "snappy-java-",
    "xugu-jdbc-",
    "zstd-jni-",
)
MACH_O_MAGICS = {
    b"\xfe\xed\xfa\xce",
    b"\xce\xfa\xed\xfe",
    b"\xfe\xed\xfa\xcf",
    b"\xcf\xfa\xed\xfe",
    b"\xca\xfe\xba\xbf",
    b"\xbf\xba\xfe\xca",
    b"\xbe\xba\xfe\xca",
}


class ReleasePolicyError(RuntimeError):
    """Release content violates the no-application-Agent policy."""


def normalized_name(name: str) -> str:
    return str(PurePosixPath(name.replace("\\", "/"))).lower()


def is_release_sbom(name: str) -> bool:
    return PurePosixPath(normalized_name(name)).name in RELEASE_SBOM_NAMES


def reject_unsafe_archive_member(name: str, logical_path: str) -> None:
    normalized = name.replace("\\", "/")
    if (not normalized
            or "\x00" in normalized
            or normalized.startswith("/")
            or re.match(r"^[a-zA-Z]:/", normalized)
            or ".." in PurePosixPath(normalized).parts):
        raise ReleasePolicyError(f"unsafe archive member path: {logical_path}")


def looks_like_archive(name: str) -> bool:
    lowered = normalized_name(name)
    return lowered.endswith((".jar", ".zip", ".war", ".ear", ".nupkg", ".whl", ".tar", ".tar.gz", ".tgz"))


def has_archive_signature(payload: bytes) -> bool:
    """Recognize renamed nested ZIP, gzip, and uncompressed tar members."""
    return (payload.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08", b"\x1f\x8b"))
            or len(payload) >= 265 and payload[257:262] == b"ustar")


def native_binary_kind(prefix: bytes) -> str | None:
    if prefix.startswith(b"\x7fELF"):
        return "ELF"
    if prefix.startswith(b"MZ"):
        return "PE"
    magic = prefix[:4]
    if magic in MACH_O_MAGICS:
        return "Mach-O"
    if magic == b"\xca\xfe\xba\xbe":
        # CAFEBABE is shared by Java class files and 32-bit fat Mach-O. Actual
        # Java class versions occupy this range; ordinary fat binaries have a
        # small architecture count in the same four bytes.
        if len(prefix) >= 8:
            major = int.from_bytes(prefix[6:8], "big")
            if 45 <= major <= 100:
                return None
        return "Mach-O"
    return None


def is_allowed_packaged_native_path(name: str, logical_path: str) -> bool:
    parts = PurePosixPath(normalized_name(name)).parts
    if len(parts) >= 2 and parts[0].startswith("apache-hertzbeat-collector-"):
        if parts[1] in {"java", "jre"}:
            return len(parts) >= 3
        if (len(parts) == 4
                and parts[1] == "runtime"
                and parts[2] in RUNTIME_PLATFORMS):
            expected = ("hertzbeat-otel-runtime.exe"
                        if parts[2] == "windows-amd64"
                        else "hertzbeat-otel-runtime")
            return parts[3] == expected
        native_root = NATIVE_PACKAGE_ROOT.fullmatch(parts[0])
        if native_root is not None and len(parts) == 2:
            expected = f"apache-hertzbeat-collector-native-{native_root.group('version')}"
            if native_root.group("platform") == "windows-amd64":
                expected += ".exe"
            return parts[1] == expected

    normalized_logical = normalized_name(logical_path)
    if re.search(
            r"!/apache-hertzbeat-collector-[^/]+/(?:java|jre)/",
            normalized_logical):
        return True
    jvm_native = re.search(
        r"!/apache-hertzbeat-collector-[^/]+/lib/([^/]+\.jar)!/([^!]+)$",
        normalized_logical,
    )
    if jvm_native is None:
        return False
    jar_name, native_member = jvm_native.groups()
    return (jar_name.startswith(ALLOWED_JVM_NATIVE_JAR_PREFIXES)
            and native_member.endswith((".so", ".dll", ".dylib", ".jnilib")))


def reject_unknown_native(name: str, prefix: bytes, logical_path: str) -> None:
    binary_kind = native_binary_kind(prefix)
    if binary_kind is not None and not is_allowed_packaged_native_path(name, logical_path):
        raise ReleasePolicyError(
            f"unknown packaged {binary_kind} executable or shared library: {logical_path}")


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
            reject_unsafe_archive_member(name, member_path)
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
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ReleasePolicyError(f"archive symbolic link is not allowed: {logical_path}!/{info.filename}")
            if info.is_dir():
                continue
            member_path = f"{logical_path}!/{info.filename}"
            with archive.open(info) as member:
                prefix = member.read(512)
            reject_unknown_native(info.filename, prefix, member_path)
            if not looks_like_archive(info.filename) and not has_archive_signature(prefix):
                if is_release_sbom(info.filename):
                    verify_release_sbom_payload(archive.read(info), member_path)
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
            reject_unsafe_archive_member(member.name, member_path)
            if member.issym() or member.islnk():
                raise ReleasePolicyError(f"archive link is not allowed: {member_path}")
            reject_distribution_name(member_path)
            if not member.isfile():
                continue
            extracted = archive.extractfile(member)
            if extracted is None:
                continue
            prefix = extracted.read(512)
            reject_unknown_native(member.name, prefix, member_path)
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
            is_sbom = is_release_sbom(member.name)
            is_archive = looks_like_archive(member.name) or has_archive_signature(prefix)
            if not is_sbom and not is_archive:
                continue
            member_payload = prefix + extracted.read(MAX_ARCHIVE_MEMBER_BYTES + 1 - len(prefix))
            if is_sbom:
                verify_release_sbom_payload(member_payload, member_path)
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


def inspect_container_zip(payload: bytes, logical_path: str, depth: int) -> None:
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        names = archive.namelist()
        for name in names:
            member_path = f"{logical_path}!/{name}"
            reject_unsafe_archive_member(name, member_path)
            reject_distribution_name(member_path)
            normalized = normalized_name(name)
            if (normalized.endswith(".dist-info/metadata")
                    or normalized.endswith(".nuspec")
                    or normalized.endswith("package.json")):
                inspect_ecosystem_package_metadata(name, archive.read(name), member_path)
            if is_release_sbom(name):
                verify_release_sbom_payload(archive.read(name), member_path)
        inspect_java_agent_signature(archive, logical_path, names)
        for info in archive.infolist():
            if info.is_dir():
                continue
            with archive.open(info) as member:
                prefix = member.read(512)
            if not looks_like_archive(info.filename) and not has_archive_signature(prefix):
                continue
            if info.file_size > MAX_ARCHIVE_MEMBER_BYTES:
                raise ReleasePolicyError(
                    f"nested container archive member exceeds safety limit: {logical_path}")
            inspect_container_nested_member(
                archive.read(info), f"{logical_path}!/{info.filename}", depth + 1)


def inspect_container_tar(payload: bytes, logical_path: str, depth: int) -> None:
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:*") as archive:
        for member in archive.getmembers():
            member_path = f"{logical_path}!/{member.name}"
            reject_unsafe_archive_member(member.name, member_path)
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
                metadata_payload = prefix + extracted.read(
                    MAX_PACKAGE_METADATA_BYTES + 1 - len(prefix))
                inspect_ecosystem_package_metadata(
                    member.name, metadata_payload, member_path)
                continue
            is_sbom = is_release_sbom(member.name)
            is_archive = looks_like_archive(member.name) or has_archive_signature(prefix)
            if not is_sbom and not is_archive:
                continue
            member_payload = prefix + extracted.read(
                MAX_ARCHIVE_MEMBER_BYTES + 1 - len(prefix))
            if is_sbom:
                verify_release_sbom_payload(member_payload, member_path)
            if is_archive:
                inspect_container_nested_member(member_payload, member_path, depth + 1)


def inspect_container_nested_member(payload: bytes, logical_path: str, depth: int) -> None:
    if depth > MAX_NESTED_DEPTH:
        raise ReleasePolicyError(
            f"nested container archive depth exceeds {MAX_NESTED_DEPTH}: {logical_path}")
    if len(payload) > MAX_ARCHIVE_MEMBER_BYTES:
        raise ReleasePolicyError(
            f"nested container archive member exceeds safety limit: {logical_path}")
    reject_distribution_name(logical_path)
    try:
        if zipfile.is_zipfile(io.BytesIO(payload)):
            inspect_container_zip(payload, logical_path, depth)
            return
        try:
            inspect_container_tar(payload, logical_path, depth)
        except tarfile.ReadError:
            return
    except (OSError, tarfile.TarError, zipfile.BadZipFile) as exc:
        raise ReleasePolicyError(
            f"cannot inspect nested container archive {logical_path}: {type(exc).__name__}") from exc


def inspect_container_layer(payload: bytes, logical_path: str) -> None:
    if len(payload) > MAX_ARCHIVE_MEMBER_BYTES:
        raise ReleasePolicyError(f"container image layer exceeds safety limit: {logical_path}")
    try:
        inspect_container_tar(payload, logical_path, 0)
    except (OSError, tarfile.TarError) as exc:
        raise ReleasePolicyError(
            f"container image layer is not a supported tar archive: {logical_path}") from exc


def read_image_archive_members(archive: tarfile.TarFile, logical_path: str) -> dict[str, tarfile.TarInfo]:
    members = {}
    for member in archive.getmembers():
        reject_unsafe_archive_member(member.name, f"{logical_path}!/{member.name}")
        if member.issym() or member.islnk():
            raise ReleasePolicyError(f"container image archive link is not allowed: {logical_path}")
        if not member.isfile():
            continue
        normalized = normalized_name(member.name)
        if normalized in members:
            raise ReleasePolicyError(f"duplicate container image archive member: {logical_path}")
        members[normalized] = member
    return members


def read_image_member(
        archive: tarfile.TarFile,
        members: dict[str, tarfile.TarInfo],
        name: str,
        logical_path: str,
) -> bytes:
    member = members.get(normalized_name(name))
    if member is None:
        raise ReleasePolicyError(f"container image archive member is missing: {logical_path}")
    if member.size > MAX_ARCHIVE_MEMBER_BYTES:
        raise ReleasePolicyError(f"container image archive member exceeds safety limit: {logical_path}")
    return read_tar_member(archive, member)


def inspect_docker_save(
        archive: tarfile.TarFile,
        members: dict[str, tarfile.TarInfo],
        logical_path: str,
) -> None:
    manifest = json.loads(
        read_image_member(archive, members, "manifest.json", logical_path).decode("utf-8"))
    if not isinstance(manifest, list) or not manifest:
        raise ReleasePolicyError(f"docker-save manifest is empty or invalid: {logical_path}")
    layers = []
    for image in manifest:
        if not isinstance(image, dict) or not isinstance(image.get("Layers"), list):
            raise ReleasePolicyError(f"docker-save manifest entry is invalid: {logical_path}")
        layers.extend(image["Layers"])
    if not layers or any(not isinstance(layer, str) for layer in layers):
        raise ReleasePolicyError(f"docker-save manifest has no valid layers: {logical_path}")
    for layer in dict.fromkeys(layers):
        payload = read_image_member(archive, members, layer, logical_path)
        inspect_container_layer(payload, f"{logical_path}!/{layer}")


def oci_blob_name(digest: str, logical_path: str) -> str:
    match = re.fullmatch(r"sha256:([0-9a-f]{64})", digest) if isinstance(digest, str) else None
    if match is None:
        raise ReleasePolicyError(f"unsupported OCI descriptor digest: {logical_path}")
    return f"blobs/sha256/{match.group(1)}"


def read_oci_descriptor_blob(
        archive: tarfile.TarFile,
        members: dict[str, tarfile.TarInfo],
        descriptor: dict,
        logical_path: str,
) -> bytes:
    if not isinstance(descriptor, dict):
        raise ReleasePolicyError(f"invalid OCI descriptor: {logical_path}")
    digest = descriptor.get("digest")
    size = descriptor.get("size")
    media_type = descriptor.get("mediaType")
    if (not isinstance(digest, str)
            or not isinstance(size, int)
            or isinstance(size, bool)
            or size < 0
            or not isinstance(media_type, str)
            or not media_type):
        raise ReleasePolicyError(f"invalid OCI descriptor: {logical_path}")
    payload = read_image_member(
        archive, members, oci_blob_name(digest, logical_path), logical_path)
    if len(payload) != size:
        raise ReleasePolicyError(f"OCI descriptor size mismatch: {logical_path}")
    if hashlib.sha256(payload).hexdigest() != digest.split(":", 1)[1]:
        raise ReleasePolicyError(f"OCI descriptor checksum mismatch: {logical_path}")
    return payload


def parse_json_object(payload: bytes, description: str, logical_path: str) -> dict:
    try:
        document = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ReleasePolicyError(f"{description} is not valid JSON: {logical_path}") from exc
    if not isinstance(document, dict):
        raise ReleasePolicyError(f"{description} must be a JSON object: {logical_path}")
    return document


def require_nonempty_list(document: dict, key: str, description: str, logical_path: str) -> list:
    value = document.get(key)
    if not isinstance(value, list) or not value:
        raise ReleasePolicyError(f"{description} must contain a non-empty {key}: {logical_path}")
    return value


def is_docker_attestation_descriptor(descriptor: dict, logical_path: str) -> bool:
    annotations = descriptor.get("annotations")
    if not isinstance(annotations, dict):
        return False
    if annotations.get("vnd.docker.reference.type") != "attestation-manifest":
        return False
    reference_digest = annotations.get("vnd.docker.reference.digest")
    if (not isinstance(reference_digest, str)
            or re.fullmatch(r"sha256:[0-9a-f]{64}", reference_digest) is None):
        raise ReleasePolicyError(
            f"Docker attestation reference digest is invalid: {logical_path}")
    return True


def inspect_oci_descriptor(
        archive: tarfile.TarFile,
        members: dict[str, tarfile.TarInfo],
        descriptor: dict,
        logical_path: str,
        visited: set[tuple[str, bool]],
) -> None:
    payload = read_oci_descriptor_blob(
        archive, members, descriptor, logical_path)
    digest = descriptor["digest"]
    is_attestation = is_docker_attestation_descriptor(descriptor, logical_path)
    visit_key = (digest, is_attestation)
    if visit_key in visited:
        return
    visited.add(visit_key)
    media_type = descriptor["mediaType"]
    if media_type in {
            "application/vnd.oci.image.index.v1+json",
            "application/vnd.docker.distribution.manifest.list.v2+json"}:
        if is_attestation:
            raise ReleasePolicyError(
                f"Docker attestation descriptor must reference an image manifest: {logical_path}")
        index = parse_json_object(payload, "OCI image index", logical_path)
        for child in require_nonempty_list(
                index, "manifests", "OCI image index", logical_path):
            inspect_oci_descriptor(archive, members, child, logical_path, visited)
    elif media_type in {
            "application/vnd.oci.image.manifest.v1+json",
            "application/vnd.docker.distribution.manifest.v2+json"}:
        manifest = parse_json_object(payload, "OCI image manifest", logical_path)
        config = manifest.get("config")
        if not isinstance(config, dict):
            raise ReleasePolicyError(f"OCI image manifest has an invalid config: {logical_path}")
        layers = require_nonempty_list(
            manifest, "layers", "OCI image manifest", logical_path)
        config_payload = read_oci_descriptor_blob(
            archive, members, config, logical_path)
        if is_attestation:
            if config.get("mediaType") != "application/vnd.oci.empty.v1+json":
                raise ReleasePolicyError(
                    f"Docker attestation manifest has a non-empty config type: {logical_path}")
            parse_json_object(config_payload, "Docker attestation config", logical_path)
            for layer in layers:
                if (not isinstance(layer, dict)
                        or layer.get("mediaType") != "application/vnd.in-toto+json"):
                    raise ReleasePolicyError(
                        f"Docker attestation manifest has a container layer: {logical_path}")
                statement = read_oci_descriptor_blob(
                    archive, members, layer, logical_path)
                parse_json_object(statement, "Docker attestation statement", logical_path)
            return
        image_config_types = {
            "application/vnd.oci.image.config.v1+json",
            "application/vnd.docker.container.image.v1+json",
        }
        if config.get("mediaType") not in image_config_types:
            raise ReleasePolicyError(f"OCI image config type is unsupported: {logical_path}")
        parse_json_object(config_payload, "OCI image config", logical_path)
        for layer in layers:
            if not isinstance(layer, dict) or "layer" not in str(layer.get("mediaType", "")):
                raise ReleasePolicyError(f"OCI image manifest has an invalid layer: {logical_path}")
            layer_payload = read_oci_descriptor_blob(
                archive, members, layer, logical_path)
            layer_digest = layer["digest"]
            inspect_container_layer(layer_payload, f"{logical_path}!/{layer_digest}")
    else:
        raise ReleasePolicyError(f"unsupported OCI descriptor media type: {logical_path}")


def inspect_oci_image(
        archive: tarfile.TarFile,
        members: dict[str, tarfile.TarInfo],
        logical_path: str,
) -> None:
    index = parse_json_object(
        read_image_member(archive, members, "index.json", logical_path),
        "OCI image index",
        logical_path,
    )
    manifests = require_nonempty_list(
        index, "manifests", "OCI image index", logical_path)
    visited = set()
    for descriptor in manifests:
        inspect_oci_descriptor(archive, members, descriptor, logical_path, visited)


def inspect_container_image(path: Path) -> None:
    try:
        with tarfile.open(path, mode="r:*") as archive:
            members = read_image_archive_members(archive, str(path))
            if "manifest.json" in members:
                inspect_docker_save(archive, members, str(path))
            elif "oci-layout" in members and "index.json" in members:
                inspect_oci_image(archive, members, str(path))
            else:
                raise ReleasePolicyError(
                    f"unsupported container image archive layout: {path}")
    except (OSError, tarfile.TarError) as exc:
        raise ReleasePolicyError(
            f"cannot inspect container image archive {path}: {type(exc).__name__}") from exc


def inspect_release_archive(path: Path) -> None:
    reject_distribution_name(path.name)
    payload = path.read_bytes()
    inspect_nested_member(payload, str(path), 0)


def read_source_poms(path: Path) -> list[tuple[str, bytes]]:
    payload = path.read_bytes()
    if zipfile.is_zipfile(io.BytesIO(payload)):
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            matches = [name for name in archive.namelist()
                       if PurePosixPath(normalized_name(name)).name == "pom.xml"]
            if not matches:
                raise ReleasePolicyError(f"source archive must contain at least one pom.xml: {path}")
            return [(name, archive.read(name)) for name in matches]
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:*") as archive:
        matches = [member for member in archive.getmembers()
                   if member.isfile() and PurePosixPath(normalized_name(member.name)).name == "pom.xml"]
        if not matches:
            raise ReleasePolicyError(f"source archive must contain at least one pom.xml: {path}")
        poms = []
        for member in matches:
            extracted = archive.extractfile(member)
            if extracted is None:
                raise ReleasePolicyError(f"cannot read source POM: {member.name}")
            poms.append((member.name, extracted.read()))
        return poms


def verify_source_has_no_java_agent_dependency(path: Path) -> None:
    for pom_name, pom in read_source_poms(path):
        pom_text = pom.decode("utf-8", errors="replace").lower()
        if JAVA_AGENT_GROUP in pom_text and JAVA_AGENT_ARTIFACT in pom_text:
            raise ReleasePolicyError(
                f"source archive must not contain an application Java Agent coordinate: {pom_name}")
        root = ElementTree.fromstring(pom)
        for dependency in root.findall(".//{*}dependency"):
            group_id = (dependency.findtext("{*}groupId") or "").strip()
            artifact_id = (dependency.findtext("{*}artifactId") or "").strip()
            if group_id == JAVA_AGENT_GROUP and artifact_id == JAVA_AGENT_ARTIFACT:
                raise ReleasePolicyError(
                    f"source archive must not contain an application Java Agent dependency: {pom_name}")


def component_values(component: dict) -> str:
    fields = [component.get(key) for key in ("group", "name", "purl", "bom-ref")]
    return " ".join(str(value) for value in fields if value).lower()


def walk_components(components: list[dict]) -> list[dict]:
    flattened = []
    for component in components:
        flattened.append(component)
        flattened.extend(walk_components(component.get("components") or []))
    return flattened


def all_sbom_components(document: dict) -> list[dict]:
    component_roots = []
    metadata = document.get("metadata")
    if isinstance(metadata, dict) and isinstance(metadata.get("component"), dict):
        component_roots.append(metadata["component"])
    component_roots.extend(document.get("components") or [])
    return walk_components(component_roots)


def verify_release_sbom_payload(payload: bytes, logical_path: str) -> None:
    document = json.loads(payload.decode("utf-8"))
    if document.get("bomFormat") != "CycloneDX":
        raise ReleasePolicyError(f"release SBOM is not CycloneDX: {logical_path}")
    for component in all_sbom_components(document):
        value = component_values(component)
        if (JAVA_AGENT_GROUP in value and JAVA_AGENT_ARTIFACT in value
                or FORBIDDEN_DISTRIBUTION_NAME.search(value)
                or FORBIDDEN_LANGUAGE_SDK_COMPONENT.search(value)
                or FORBIDDEN_LANGUAGE_SDK_PURL.search(value)
                or "@opentelemetry sdk-node" in value
                or "open-telemetry sdk" in value):
            raise ReleasePolicyError(f"forbidden release SBOM component: {value}")


def verify_collector_sbom(path: Path) -> None:
    verify_release_sbom_payload(path.read_bytes(), str(path))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", type=Path, default=[])
    parser.add_argument("--jvm", action="append", type=Path, default=[])
    parser.add_argument("--native", action="append", type=Path, default=[])
    parser.add_argument("--collector-sbom", action="append", type=Path, default=[])
    parser.add_argument("--container-image", action="append", type=Path, default=[])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supplied = (args.source + args.jvm + args.native
                + args.collector_sbom + args.container_image)
    if not supplied:
        print("at least one release archive or Collector SBOM is required", file=sys.stderr)
        return 2
    try:
        for path in supplied:
            if not path.is_file():
                raise ReleasePolicyError(f"release input is missing: {path}")
        for path in args.source:
            inspect_release_archive(path)
            verify_source_has_no_java_agent_dependency(path)
        for path in args.jvm + args.native:
            inspect_release_archive(path)
        for path in args.collector_sbom:
            verify_collector_sbom(path)
        for path in args.container_image:
            inspect_container_image(path)
    except (ReleasePolicyError, ElementTree.ParseError, json.JSONDecodeError) as exc:
        print(f"Hybrid Collector release content check failed: {exc}", file=sys.stderr)
        return 1
    print("Hybrid Collector recursive release content contract passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
