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

"""Verify the assembled thin-JAR HertzBeat Server release distribution."""

from __future__ import annotations

import argparse
import io
import re
import sys
import tarfile
import zipfile
from pathlib import Path, PurePosixPath


MAX_APPLICATION_JAR_BYTES = 512 * 1024 * 1024
ROOT_PATTERN = re.compile(r"apache-hertzbeat-(?P<version>[0-9][A-Za-z0-9_.-]*)-bin")
FORBIDDEN_PARTS = {
    ".tmp",
    "__pycache__",
    "playwright-report",
    "target",
    "test-results",
}
FORBIDDEN_FILE_SUFFIXES = (".h2.db", ".mv.db", ".trace.db")
CORE_LIB_PATTERNS = (
    re.compile(r"spring-boot-[0-9].*\.jar"),
    re.compile(r"hertzbeat-common-spring-.*\.jar"),
    re.compile(r"hertzbeat-manager-.*\.jar"),
    re.compile(r"hertzbeat-warehouse-.*\.jar"),
    re.compile(r"hertzbeat-alerter-.*\.jar"),
    re.compile(r"hertzbeat-observability-.*\.jar"),
    re.compile(r"hertzbeat-ai-gateway-.*\.jar"),
)


class PackageContractError(RuntimeError):
    """The assembled Server archive violates its release contract."""


def normalized_member_name(name: str) -> PurePosixPath:
    if (
        not name
        or "\x00" in name
        or "\\" in name
        or name.startswith("/")
        or re.match(r"^[A-Za-z]:", name)
    ):
        raise PackageContractError(f"unsafe archive member path: {name!r}")
    path = PurePosixPath(name)
    if ".." in path.parts:
        raise PackageContractError(f"unsafe archive member path: {name!r}")
    return path


def read_member(archive: tarfile.TarFile, member: tarfile.TarInfo) -> bytes:
    stream = archive.extractfile(member)
    if stream is None:
        raise PackageContractError(f"unable to read archive member: {member.name}")
    return stream.read()


def require_text_member(
    archive: tarfile.TarFile,
    members: dict[str, tarfile.TarInfo],
    name: str,
) -> str:
    member = members.get(name)
    if member is None or not member.isfile():
        raise PackageContractError(f"Server archive is missing file: {name}")
    if member.size > 4 * 1024 * 1024:
        raise PackageContractError(f"Server text contract file is unexpectedly large: {name}")
    return read_member(archive, member).decode("utf-8", errors="strict")


def verify_application_jar(payload: bytes, logical_path: str) -> None:
    if len(payload) > MAX_APPLICATION_JAR_BYTES:
        raise PackageContractError("Server application JAR exceeds the verification limit")
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as jar:
            names = set(jar.namelist())
            manifest = jar.read("META-INF/MANIFEST.MF").decode("utf-8", errors="replace")
    except (KeyError, zipfile.BadZipFile) as error:
        raise PackageContractError(f"invalid Server application JAR: {logical_path}") from error
    if "org/apache/hertzbeat/startup/HertzBeatApplication.class" not in names:
        raise PackageContractError("Server application JAR is missing HertzBeatApplication")
    if not re.search(
        r"(?im)^Main-Class:\s*org\.apache\.hertzbeat\.startup\.HertzBeatApplication\s*$",
        manifest,
    ):
        raise PackageContractError("Server application JAR has the wrong Main-Class")


def verify_package(archive_path: Path) -> None:
    if not archive_path.is_file():
        raise PackageContractError(f"Server archive does not exist: {archive_path}")
    try:
        archive = tarfile.open(archive_path, "r:gz")
    except tarfile.TarError as error:
        raise PackageContractError(f"invalid Server tar.gz archive: {archive_path}") from error

    with archive:
        members: dict[str, tarfile.TarInfo] = {}
        roots: set[str] = set()
        for member in archive.getmembers():
            path = normalized_member_name(member.name)
            if member.issym() or member.islnk() or not (member.isfile() or member.isdir()):
                raise PackageContractError(f"archive links or special files are not allowed: {member.name}")
            lowered_parts = {part.lower() for part in path.parts}
            if lowered_parts & FORBIDDEN_PARTS:
                raise PackageContractError(f"local build or proof artifact is not releasable: {member.name}")
            lowered_name = path.name.lower()
            if lowered_name == "progress.md" or lowered_name.endswith(FORBIDDEN_FILE_SUFFIXES):
                raise PackageContractError(f"local state file is not releasable: {member.name}")
            roots.add(path.parts[0])
            if member.name in members:
                raise PackageContractError(f"duplicate archive member: {member.name}")
            members[member.name] = member

        if len(roots) != 1:
            raise PackageContractError("Server archive must contain exactly one root directory")
        root = next(iter(roots))
        root_match = ROOT_PATTERN.fullmatch(root)
        if root_match is None:
            raise PackageContractError(f"unexpected Server archive root: {root}")
        for relative in (
            "README.md",
            "LICENSE",
            "NOTICE",
            "config/application.yml",
            "config/logback-spring.xml",
            "config/sureness.yml",
            "dist/index.html",
            "bin/startup.sh",
            "bin/shutdown.sh",
            "bin/restart.sh",
            "bin/entrypoint.sh",
            "bin/startup.bat",
            "bin/shutdown.bat",
        ):
            name = f"{root}/{relative}"
            member = members.get(name)
            if member is None or not member.isfile():
                raise PackageContractError(f"Server archive is missing file: {relative}")

        if not any(
            name.startswith(f"{root}/define/") and member.isfile()
            for name, member in members.items()
        ):
            raise PackageContractError("Server archive is missing monitor definitions")

        root_jars = [
            name
            for name, member in members.items()
            if member.isfile()
            and PurePosixPath(name).parent == PurePosixPath(root)
            and name.lower().endswith(".jar")
        ]
        expected_jar = f"{root}/apache-hertzbeat-{root_match.group('version')}.jar"
        if root_jars != [expected_jar]:
            raise PackageContractError(
                "Server archive must contain exactly one version-matched root application JAR"
            )
        verify_application_jar(read_member(archive, members[expected_jar]), expected_jar)

        lib_jars = [
            PurePosixPath(name).name
            for name, member in members.items()
            if member.isfile()
            and PurePosixPath(name).parent == PurePosixPath(root, "lib")
            and name.lower().endswith(".jar")
        ]
        if not lib_jars:
            raise PackageContractError("Server archive is missing packaged lib dependencies")
        for pattern in CORE_LIB_PATTERNS:
            if not any(pattern.fullmatch(name) for name in lib_jars):
                raise PackageContractError(
                    f"Server archive is missing required runtime library: {pattern.pattern}"
                )
        if any(name.startswith("hertzbeat-startup-") for name in lib_jars):
            raise PackageContractError(
                "Server archive contains a duplicate startup application JAR in lib"
            )

        unix_classpath = 'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"'
        for relative in ("bin/startup.sh", "bin/entrypoint.sh"):
            name = f"{root}/{relative}"
            source = require_text_member(archive, members, name)
            if 'LIB_PATH="$DEPLOY_DIR/lib"' not in source or unix_classpath not in source:
                raise PackageContractError(f"{relative} must load packaged lib dependencies")
            if members[name].mode & 0o111 == 0:
                raise PackageContractError(f"{relative} must be executable")
        for relative in ("bin/shutdown.sh", "bin/restart.sh"):
            if members[f"{root}/{relative}"].mode & 0o111 == 0:
                raise PackageContractError(f"{relative} must be executable")

        windows = require_text_member(archive, members, f"{root}/bin/startup.bat")
        if (
            "set LIB_PATH=%DEPLOY_DIR%\\lib" not in windows
            or "set CLASSPATH=%DEPLOY_DIR%\\%JAR_NAME%;%LIB_PATH%\\*;%EXT_LIB_PATH%\\*"
            not in windows
        ):
            raise PackageContractError("bin/startup.bat must load packaged lib dependencies")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    try:
        verify_package(args.archive)
    except (OSError, UnicodeError, PackageContractError) as error:
        print(error, file=sys.stderr)
        return 1
    print("Server release package verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
