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

"""Synthetic contracts for the assembled Server release archive."""

from __future__ import annotations

import io
import subprocess
import sys
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VERIFIER = REPO_ROOT / "script/ci/verify-server-release-package.py"
ROOT = "apache-hertzbeat-2.0.0-bin"


def jar_bytes(*, application: bool = False) -> bytes:
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        manifest = "Manifest-Version: 1.0\n"
        if application:
            manifest += "Main-Class: org.apache.hertzbeat.startup.HertzBeatApplication\n"
        archive.writestr("META-INF/MANIFEST.MF", manifest)
        if application:
            archive.writestr(
                "org/apache/hertzbeat/startup/HertzBeatApplication.class", b"synthetic"
            )
    return result.getvalue()


def valid_entries() -> dict[str, bytes]:
    entries = {
        f"{ROOT}/README.md": b"readme",
        f"{ROOT}/LICENSE": b"license",
        f"{ROOT}/NOTICE": b"notice",
        f"{ROOT}/config/application.yml": b"spring: {}",
        f"{ROOT}/config/logback-spring.xml": b"<configuration/>",
        f"{ROOT}/config/sureness.yml": b"resourceRole: []",
        f"{ROOT}/dist/index.html": b"<!doctype html>",
        f"{ROOT}/define/app-api.yml": b"category: service",
        f"{ROOT}/bin/startup.sh": (
            b"#!/bin/sh\n"
            b'LIB_PATH="$DEPLOY_DIR/lib"\n'
            b'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"\n'
        ),
        f"{ROOT}/bin/shutdown.sh": b"#!/bin/sh\nexit 0\n",
        f"{ROOT}/bin/restart.sh": b"#!/bin/sh\nexit 0\n",
        f"{ROOT}/bin/entrypoint.sh": (
            b"#!/bin/sh\n"
            b'LIB_PATH="$DEPLOY_DIR/lib"\n'
            b'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"\n'
        ),
        f"{ROOT}/bin/startup.bat": (
            b"@echo off\r\n"
            b"set LIB_PATH=%DEPLOY_DIR%\\lib\r\n"
            b"set CLASSPATH=%DEPLOY_DIR%\\%JAR_NAME%;%LIB_PATH%\\*;%EXT_LIB_PATH%\\*\r\n"
        ),
        f"{ROOT}/bin/shutdown.bat": b"@echo off\r\n",
        f"{ROOT}/apache-hertzbeat-2.0.0.jar": jar_bytes(application=True),
    }
    for artifact in (
        "spring-boot-4.0.3.jar",
        "hertzbeat-common-spring-2.0.0.jar",
        "hertzbeat-manager-2.0.0.jar",
        "hertzbeat-warehouse-2.0.0.jar",
        "hertzbeat-alerter-2.0.0.jar",
        "hertzbeat-observability-2.0.0.jar",
        "hertzbeat-ai-gateway-2.0.0.jar",
    ):
        entries[f"{ROOT}/lib/{artifact}"] = jar_bytes()
    return entries


class ServerReleasePackageVerifierTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def archive(
        self,
        name: str,
        entries: dict[str, bytes],
        *,
        symlink: tuple[str, str] | None = None,
    ) -> Path:
        path = self.root / name
        with tarfile.open(path, "w:gz") as archive:
            directories = {
                str(parent)
                for member_name in entries
                for parent in Path(member_name).parents
                if str(parent) != "."
            }
            for directory in sorted(directories, key=lambda value: (value.count("/"), value)):
                info = tarfile.TarInfo(directory)
                info.type = tarfile.DIRTYPE
                info.mode = 0o755
                archive.addfile(info)
            for member_name, payload in entries.items():
                info = tarfile.TarInfo(member_name)
                info.size = len(payload)
                info.mode = 0o755 if "/bin/" in member_name else 0o644
                archive.addfile(info, io.BytesIO(payload))
            if symlink is not None:
                info = tarfile.TarInfo(symlink[0])
                info.type = tarfile.SYMTYPE
                info.linkname = symlink[1]
                archive.addfile(info)
        return path

    def verify(self, archive: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(VERIFIER), str(archive)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
        )

    def test_accepts_complete_thin_jar_server_distribution(self) -> None:
        result = self.verify(self.archive("valid.tar.gz", valid_entries()))

        self.assertEqual(0, result.returncode, result.stderr)

    def test_requires_runtime_dependencies_and_frontend(self) -> None:
        for label, entries in (
            (
                "no-libs",
                {name: payload for name, payload in valid_entries().items() if "/lib/" not in name},
            ),
            (
                "no-frontend",
                {name: payload for name, payload in valid_entries().items() if not name.endswith("/dist/index.html")},
            ),
        ):
            with self.subTest(label):
                result = self.verify(self.archive(f"{label}.tar.gz", entries))
                self.assertNotEqual(0, result.returncode)

    def test_requires_all_launchers_to_load_the_packaged_lib_directory(self) -> None:
        entries = valid_entries()
        entries[f"{ROOT}/bin/startup.sh"] = (
            b"#!/bin/sh\n"
            b'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$EXT_LIB_PATH/*"\n'
        )

        result = self.verify(self.archive("bad-classpath.tar.gz", entries))

        self.assertNotEqual(0, result.returncode)
        self.assertIn("lib", result.stderr.lower())

    def test_rejects_a_duplicate_startup_application_jar_in_lib(self) -> None:
        entries = valid_entries()
        entries[f"{ROOT}/lib/hertzbeat-startup-2.0.0.jar"] = jar_bytes(application=True)

        result = self.verify(self.archive("duplicate-startup.tar.gz", entries))

        self.assertNotEqual(0, result.returncode)
        self.assertIn("duplicate", result.stderr.lower())

    def test_rejects_local_artifacts_and_archive_links(self) -> None:
        entries = valid_entries()
        entries[f"{ROOT}/.tmp/browser-proof.json"] = b"local proof"
        local_result = self.verify(self.archive("local-artifact.tar.gz", entries))
        link_result = self.verify(
            self.archive(
                "link.tar.gz",
                valid_entries(),
                symlink=(f"{ROOT}/config/local.yml", "/tmp/local.yml"),
            )
        )

        self.assertNotEqual(0, local_result.returncode)
        self.assertNotEqual(0, link_result.returncode)


if __name__ == "__main__":
    unittest.main()
