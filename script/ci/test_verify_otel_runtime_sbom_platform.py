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

"""Contracts for target-platform metadata in managed runtime SBOMs."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("verify-otel-runtime-sbom-platform.py")
SPEC = importlib.util.spec_from_file_location("runtime_sbom_platform", SCRIPT)
runtime_sbom_platform = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(runtime_sbom_platform)


def go_version_output(goos: str, goarch: str) -> str:
    return (
        "hertzbeat-otel-runtime: go1.25.0\n"
        "\tpath\tgithub.com/apache/hertzbeat/hertzbeat-otel-runtime/generated\n"
        f"\tbuild\tGOARCH={goarch}\n"
        f"\tbuild\tGOOS={goos}\n"
    )


class RuntimeSbomPlatformTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def platform_dir(self, platform: str, purl_goos: str, purl_goarch: str) -> Path:
        directory = self.root / platform
        directory.mkdir()
        binary = "hertzbeat-otel-runtime.exe" if platform == "windows-amd64" else "hertzbeat-otel-runtime"
        (directory / binary).write_bytes(b"synthetic-binary")
        (directory / "hertzbeat-otel-runtime.cdx.json").write_text(json.dumps({
            "bomFormat": "CycloneDX",
            "metadata": {
                "component": {
                    "purl": (
                        "pkg:golang/github.com/apache/hertzbeat/hertzbeat-otel-runtime/generated"
                        f"@v2.0.0-phase1?goarch={purl_goarch}&goos={purl_goos}&type=module"
                    ),
                },
            },
        }))
        return directory

    def test_macos_platform_maps_to_darwin_metadata(self) -> None:
        directory = self.platform_dir("macos-arm64", "darwin", "arm64")

        runtime_sbom_platform.verify_platform_directory(
            directory,
            go_version_output("darwin", "arm64"),
        )

    def test_windows_platform_uses_exe_and_windows_metadata(self) -> None:
        directory = self.platform_dir("windows-amd64", "windows", "amd64")

        runtime_sbom_platform.verify_platform_directory(
            directory,
            go_version_output("windows", "amd64"),
        )

    def test_rejects_host_values_in_target_sbom(self) -> None:
        directory = self.platform_dir("linux-amd64", "darwin", "arm64")

        with self.assertRaises(runtime_sbom_platform.RuntimeSbomPlatformError):
            runtime_sbom_platform.verify_platform_directory(
                directory,
                go_version_output("linux", "amd64"),
            )

    def test_rejects_binary_metadata_that_disagrees_with_platform(self) -> None:
        directory = self.platform_dir("macos-amd64", "darwin", "amd64")

        with self.assertRaises(runtime_sbom_platform.RuntimeSbomPlatformError):
            runtime_sbom_platform.verify_platform_directory(
                directory,
                go_version_output("darwin", "arm64"),
            )


if __name__ == "__main__":
    unittest.main()
