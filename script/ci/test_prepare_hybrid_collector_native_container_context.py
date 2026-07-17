#!/usr/bin/env python3

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

from __future__ import annotations

import hashlib
import io
import json
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("prepare-hybrid-collector-native-container-context.sh")


class NativeContainerContextTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.release_dir = self.root / "release"
        self.release_dir.mkdir()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def write_archive(
            self,
            platform: str,
            *,
            missing: str | None = None,
            extra: dict[str, bytes] | None = None,
    ) -> Path:
        package_root = f"apache-hertzbeat-collector-native-1.8.0-{platform}-bin"
        collector_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
        runtime_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
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
        runtime_root = f"{package_root}/runtime/{platform}"
        entries = {
            f"{package_root}/bin/foreground.sh": b"#!/bin/sh\n",
            f"{package_root}/config/application.yml": b"collector: {}\n",
            f"{package_root}/LICENSE": b"Apache License 2.0\n",
            f"{package_root}/NOTICE": b"Apache HertzBeat\n",
            f"{runtime_root}/hertzbeat-otel-runtime": b"runtime",
            f"{runtime_root}/runtime-manifest.json": b"{}",
            f"{runtime_root}/hertzbeat-collector.cdx.json": collector_sbom,
            f"{runtime_root}/hertzbeat-otel-runtime.cdx.json": runtime_sbom,
            f"{runtime_root}/release-inventory.json": inventory,
            f"{runtime_root}/SHA512SUMS": b"checksums\n",
            f"{runtime_root}/licenses/LICENSE-dependency.txt": b"license\n",
            f"{package_root}/service/hertzbeat-collector.service": b"[Service]\n",
        }
        if missing is not None:
            entries.pop(f"{package_root}/{missing}")
        entries.update(extra or {})
        archive = self.release_dir / f"apache-hertzbeat-collector-native-1.8.0-{platform}-bin.tar.gz"
        with tarfile.open(archive, mode="w:gz") as output:
            for name, payload in entries.items():
                info = tarfile.TarInfo(name)
                info.size = len(payload)
                output.addfile(info, io.BytesIO(payload))
        return archive

    def run_prepare(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [SCRIPT, self.release_dir, self.root / "context"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def test_verified_archives_and_scanner_are_copied_to_context(self) -> None:
        self.write_archive("linux-amd64")
        self.write_archive("linux-arm64")

        result = self.run_prepare()

        self.assertEqual(0, result.returncode, result.stderr)
        context = self.root / "context"
        self.assertTrue((context / "collector-native-linux-amd64.tar.gz").is_file())
        self.assertTrue((context / "collector-native-linux-arm64.tar.gz").is_file())
        self.assertTrue((context / "script/ci/verify-hybrid-collector-native-package.sh").is_file())
        self.assertTrue((context / "script/ci/verify-hybrid-collector-release-content.py").is_file())

    def test_missing_required_layout_never_enters_context(self) -> None:
        self.write_archive("linux-amd64")
        self.write_archive("linux-arm64", missing="config/application.yml")

        result = self.run_prepare()

        self.assertNotEqual(0, result.returncode)
        self.assertFalse((self.root / "context/collector-native-linux-amd64.tar.gz").exists())

    def test_nested_language_sdk_never_enters_context(self) -> None:
        self.write_archive(
            "linux-amd64",
            extra={"payload/vendor/open-telemetry/sdk/src/Sdk.php": b"forbidden"},
        )
        self.write_archive("linux-arm64")

        result = self.run_prepare()

        self.assertNotEqual(0, result.returncode)
        self.assertFalse((self.root / "context/collector-native-linux-amd64.tar.gz").exists())

    def test_unsafe_member_path_never_enters_context(self) -> None:
        self.write_archive("linux-amd64", extra={"../../escape": b"forbidden"})
        self.write_archive("linux-arm64")

        result = self.run_prepare()

        self.assertNotEqual(0, result.returncode)
        self.assertFalse((self.root / "context/collector-native-linux-amd64.tar.gz").exists())


if __name__ == "__main__":
    unittest.main()
