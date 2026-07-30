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

"""Synthetic package contracts for generic and platform JVM Collector archives."""

from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import tarfile
import tempfile
import time
import unittest
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
VERIFIER = REPO_ROOT / "script/ci/verify-hybrid-collector-jvm-package.sh"
SHUTDOWN_TEMPLATE = REPO_ROOT / "script/assembly/collector/bin/shutdown.sh"
ROOT = "apache-hertzbeat-collector-2.0.0"


def zip_bytes(entries: dict[str, bytes | str]) -> bytes:
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, payload in entries.items():
            archive.writestr(name, payload)
    return result.getvalue()


def runtime_entries(platform: str) -> dict[str, bytes]:
    runtime_root = f"{ROOT}/runtime/{platform}"
    binary = "hertzbeat-otel-runtime.exe" if platform == "windows-amd64" else "hertzbeat-otel-runtime"
    collector_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
    runtime_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
    manifest = json.dumps({"schemaVersion": 1}).encode()
    binary_payload = b"synthetic-managed-runtime"
    inventory = json.dumps({
        "schemaVersion": "1.0",
        "artifacts": [
            {
                "path": "hertzbeat-collector.cdx.json",
                "sha512": hashlib.sha512(collector_sbom).hexdigest(),
            },
            {
                "path": "hertzbeat-otel-runtime.cdx.json",
                "sha512": hashlib.sha512(runtime_sbom).hexdigest(),
            },
        ],
    }).encode()
    checksummed = {
        binary: binary_payload,
        "runtime-manifest.json": manifest,
        "hertzbeat-collector.cdx.json": collector_sbom,
        "hertzbeat-otel-runtime.cdx.json": runtime_sbom,
        "release-inventory.json": inventory,
    }
    checksums = "".join(
        f"{hashlib.sha512(payload).hexdigest()}  {name}\n"
        for name, payload in checksummed.items()
    ).encode()
    return {
        **{f"{runtime_root}/{name}": payload for name, payload in checksummed.items()},
        f"{runtime_root}/SHA512SUMS": checksums,
        f"{runtime_root}/licenses/LICENSE-dependency": b"Apache-2.0",
    }


def base_entries() -> dict[str, bytes]:
    return {
        f"{ROOT}/config/application.yml": b"spring: {}",
        f"{ROOT}/README.md": b"readme",
        f"{ROOT}/LICENSE": b"license",
        f"{ROOT}/NOTICE": b"notice",
        f"{ROOT}/bin/startup.sh": (
            b"#!/bin/sh\n"
            b'LIB_PATH="$DEPLOY_DIR/lib"\n'
            b'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"\n'
        ),
        f"{ROOT}/bin/shutdown.sh": SHUTDOWN_TEMPLATE.read_bytes(),
        f"{ROOT}/bin/startup.bat": (
            b"@echo off\r\n"
            b"set LIB_PATH=%DEPLOY_DIR%\\lib\r\n"
            b"set CLASSPATH=%DEPLOY_DIR%\\%JAR_NAME%;%LIB_PATH%\\*;%EXT_LIB_PATH%\\*\r\n"
        ),
        f"{ROOT}/bin/shutdown.bat": b"@echo off\r\n",
        f"{ROOT}/apache-hertzbeat-collector-2.0.0.jar": zip_bytes({
            "META-INF/MANIFEST.MF": "Manifest-Version: 1.0\n",
        }),
    }


class JvmPackageVerifierTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def archive(self, name: str, entries: dict[str, bytes]) -> Path:
        path = self.root / name
        with tarfile.open(path, "w:gz") as archive:
            for member_name, payload in entries.items():
                info = tarfile.TarInfo(member_name)
                info.size = len(payload)
                info.mode = 0o755 if member_name.endswith(("/startup.sh", "/shutdown.sh")) else 0o644
                archive.addfile(info, io.BytesIO(payload))
        return path

    def verify(self, archive: Path, platform: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["sh", str(VERIFIER), str(archive), platform],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
        )

    def test_platform_archive_requires_complete_runtime_release_assets(self) -> None:
        complete = {**base_entries(), **runtime_entries("linux-amd64")}
        valid = self.archive("valid-platform.tar.gz", complete)
        self.assertEqual(0, self.verify(valid, "linux-amd64").returncode)

        incomplete = {
            name: payload for name, payload in complete.items()
            if "/runtime/" not in name
        }
        missing = self.archive("missing-runtime-assets.tar.gz", incomplete)
        self.assertNotEqual(0, self.verify(missing, "linux-amd64").returncode)

    def test_platform_archive_rejects_bad_or_unbound_sha512_entries(self) -> None:
        entries = {**base_entries(), **runtime_entries("linux-amd64")}
        checksum_path = f"{ROOT}/runtime/linux-amd64/SHA512SUMS"

        bad_digest = dict(entries)
        bad_digest[checksum_path] = bad_digest[checksum_path].replace(b"a", b"0", 1)
        self.assertNotEqual(
            0,
            self.verify(self.archive("bad-digest.tar.gz", bad_digest), "linux-amd64").returncode,
        )

        missing_member = dict(entries)
        missing_member[checksum_path] += b"0" * 128 + b"  helper.bin\n"
        self.assertNotEqual(
            0,
            self.verify(self.archive("missing-member.tar.gz", missing_member), "linux-amd64").returncode,
        )

    def test_platform_archive_requires_runtime_licenses(self) -> None:
        entries = {
            name: payload for name, payload in {
                **base_entries(),
                **runtime_entries("linux-amd64"),
            }.items() if "/licenses/" not in name
        }
        archive = self.archive("missing-runtime-license.tar.gz", entries)

        self.assertNotEqual(0, self.verify(archive, "linux-amd64").returncode)

    def test_generic_archive_remains_jvm_only(self) -> None:
        generic = self.archive("generic.tar.gz", base_entries())
        self.assertEqual(0, self.verify(generic, "generic").returncode)

        disguised_hybrid = self.archive(
            "generic-with-runtime.tar.gz",
            {**base_entries(), **runtime_entries("linux-amd64")},
        )
        self.assertNotEqual(0, self.verify(disguised_hybrid, "generic").returncode)

    def test_archive_rejects_every_additional_root_jar(self) -> None:
        for extra_name in (
            "stale-build-output.jar",
            "apache-hertzbeat-collector-native-2.0.0.jar",
        ):
            with self.subTest(extra_name=extra_name):
                entries = {
                    **base_entries(),
                    f"{ROOT}/{extra_name}": zip_bytes({
                        "META-INF/MANIFEST.MF": "Manifest-Version: 1.0\n",
                    }),
                }
                archive = self.archive(f"extra-{extra_name}.tar.gz", entries)

                self.assertNotEqual(0, self.verify(archive, "generic").returncode)

    def test_archive_requires_startup_script_to_load_packaged_dependencies(self) -> None:
        entries = base_entries()
        entries[f"{ROOT}/bin/startup.sh"] = (
            b"#!/bin/sh\n"
            b'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$EXT_LIB_PATH/*"\n'
        )
        archive = self.archive("missing-lib-classpath.tar.gz", entries)

        result = self.verify(archive, "generic")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("lib/*", result.stderr)

    def test_unix_archive_rejects_direct_sigkill_without_managed_child_cleanup(self) -> None:
        entries = base_entries()
        entries[f"{ROOT}/bin/shutdown.sh"] = (
            b"#!/bin/bash\n"
            b"PID=\"$(ps -ef | awk '/java/ { print $2 }')\"\n"
            b'kill -9 $PID\n'
        )
        archive = self.archive("direct-sigkill-shutdown.tar.gz", entries)

        result = self.verify(archive, "generic")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("graceful", result.stderr)

    def test_unix_shutdown_terminates_captured_managed_child(self) -> None:
        shutdown = self.root / "shutdown.sh"
        shutdown.write_text(
            SHUTDOWN_TEMPLATE.read_text()
            .replace("${project.artifactId}", "hertzbeat-collector-collector")
            .replace("${project.build.finalName}", "apache-hertzbeat-collector-2.0.0")
        )
        shutdown.chmod(0o755)
        marker = self.root / "signals.log"
        child_pid_file = self.root / "child.pid"
        child = self.root / "managed-child.sh"
        child.write_text(
            "#!/bin/bash\n"
            "marker=\"$1\"\n"
            "trap 'printf \"%s\\n\" child-term >> \"$marker\"; exit 0' TERM\n"
            "while :; do sleep 1; done\n"
        )
        child.chmod(0o755)
        parent = self.root / "java-parent"
        parent.write_text(
            "#!/bin/bash\n"
            "child=\"$2\"\n"
            "marker=\"$3\"\n"
            "child_pid_file=\"$4\"\n"
            "trap 'printf \"%s\\n\" parent-term >> \"$marker\"; exit 0' TERM\n"
            "\"$child\" \"$marker\" &\n"
            "child_pid=$!\n"
            "printf '%s\\n' \"$child_pid\" > \"$child_pid_file\"\n"
            "wait \"$child_pid\"\n"
        )
        parent.chmod(0o755)
        process = subprocess.Popen(
            [
                str(parent),
                "apache-hertzbeat-collector-2.0.0.jar",
                str(child),
                str(marker),
                str(child_pid_file),
            ],
            cwd=self.root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        child_pid = None
        try:
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline and not child_pid_file.exists():
                time.sleep(0.05)
            self.assertTrue(child_pid_file.exists(), "managed child did not start")
            child_pid = int(child_pid_file.read_text().strip())
            time.sleep(0.2)

            env = {
                **os.environ,
                "SHUTDOWN_TIMEOUT_SECONDS": "5",
                "KILL_WAIT_SECONDS": "2",
            }
            result = subprocess.run(
                [str(shutdown)],
                cwd=self.root,
                env=env,
                capture_output=True,
                text=True,
                timeout=12,
            )

            self.assertEqual(0, result.returncode, result.stderr)
            process.wait(timeout=5)
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline and self.process_exists(child_pid):
                time.sleep(0.05)
            self.assertFalse(self.process_exists(child_pid), "managed child remained after shutdown")
            signals = marker.read_text().splitlines()
            self.assertIn("parent-term", signals)
            self.assertIn("child-term", signals)
        finally:
            for pid in (child_pid, process.pid):
                if pid is not None and self.process_exists(pid):
                    os.kill(pid, 9)
            process.wait(timeout=5)

    def test_unix_shutdown_rejects_invalid_timeout_values(self) -> None:
        shutdown = self.root / "shutdown.sh"
        shutdown.write_text(
            SHUTDOWN_TEMPLATE.read_text()
            .replace("${project.artifactId}", "hertzbeat-collector-collector")
            .replace("${project.build.finalName}", "apache-hertzbeat-collector-2.0.0")
        )
        shutdown.chmod(0o755)
        invalid_environments = (
            {"SHUTDOWN_TIMEOUT_SECONDS": "1:2"},
            {"SHUTDOWN_TIMEOUT_SECONDS": "08"},
            {"SHUTDOWN_TIMEOUT_SECONDS": "0"},
            {"KILL_WAIT_SECONDS": "1:2"},
            {"KILL_WAIT_SECONDS": "08"},
            {"KILL_WAIT_SECONDS": "0"},
        )

        for overrides in invalid_environments:
            with self.subTest(overrides=overrides):
                result = subprocess.run(
                    [str(shutdown)],
                    cwd=self.root,
                    env={**os.environ, **overrides},
                    capture_output=True,
                    text=True,
                    timeout=5,
                )

                self.assertEqual(2, result.returncode)
                self.assertIn("positive integer seconds", result.stderr)

    @staticmethod
    def process_exists(pid: int) -> bool:
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        return True

    def test_windows_archive_requires_startup_script_to_load_packaged_dependencies(self) -> None:
        entries = {**base_entries(), **runtime_entries("windows-amd64")}
        entries[f"{ROOT}/bin/startup.bat"] = (
            b"@echo off\r\n"
            b"set CLASSPATH=%DEPLOY_DIR%\\%JAR_NAME%;%EXT_LIB_PATH%\\*\r\n"
        )
        archive = self.archive("windows-missing-lib-classpath.tar.gz", entries)

        result = self.verify(archive, "windows-amd64")

        self.assertNotEqual(0, result.returncode)
        self.assertIn("lib\\*", result.stderr)

    def test_windows_archive_accepts_exact_classpath_with_crlf_line_endings(self) -> None:
        entries = {**base_entries(), **runtime_entries("windows-amd64")}
        archive = self.archive("windows-crlf-classpath.tar.gz", entries)

        result = self.verify(archive, "windows-amd64")

        self.assertEqual(0, result.returncode, result.stderr)


if __name__ == "__main__":
    unittest.main()
