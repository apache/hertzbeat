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

"""Reproducible fixtures for the recursive Hybrid Collector release scanner."""

from __future__ import annotations

import importlib.util
import hashlib
import io
import json
import tarfile
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("verify-hybrid-collector-release-content.py")
SPEC = importlib.util.spec_from_file_location("release_content", SCRIPT)
release_content = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(release_content)


TEST_POM = """<project xmlns="http://maven.apache.org/POM/4.0.0">
  <dependencies><dependency>
    <groupId>io.opentelemetry.javaagent</groupId>
    <artifactId>opentelemetry-javaagent</artifactId>
    <version>2.27.0</version><scope>{scope}</scope>
  </dependency></dependencies>
</project>"""


def zip_bytes(entries: dict[str, bytes | str]) -> bytes:
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, payload in entries.items():
            archive.writestr(name, payload)
    return result.getvalue()


def tar_bytes(entries: dict[str, bytes]) -> bytes:
    result = io.BytesIO()
    with tarfile.open(fileobj=result, mode="w:gz") as archive:
        for name, payload in entries.items():
            info = tarfile.TarInfo(name)
            info.size = len(payload)
            archive.addfile(info, io.BytesIO(payload))
    return result.getvalue()


class ReleaseContentPolicyTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def write(self, name: str, payload: bytes) -> Path:
        path = self.root / name
        path.write_bytes(payload)
        return path

    def test_source_allows_only_test_scoped_java_agent_coordinate(self) -> None:
        source = self.write("source.zip", zip_bytes({
            "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml": TEST_POM.format(scope="test"),
            "release/lib/ordinary.jar": zip_bytes({"META-INF/MANIFEST.MF": "Manifest-Version: 1.0\n"}),
        }))

        release_content.inspect_release_archive(source)
        release_content.verify_source_java_agent_scope(source)

    def test_source_rejects_non_test_java_agent_coordinate(self) -> None:
        source = self.write("source.zip", zip_bytes({
            "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml": TEST_POM.format(scope="runtime"),
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.verify_source_java_agent_scope(source)

    def test_renamed_java_agent_is_found_inside_nested_jvm_archive(self) -> None:
        renamed_agent = zip_bytes({
            "META-INF/MANIFEST.MF": (
                "Manifest-Version: 1.0\n"
                "Premain-Class: io.opentelemetry.javaagent.OpenTelemetryAgent\n"
            ),
            "io/opentelemetry/javaagent/OpenTelemetryAgent.class": b"class",
        })
        jvm = self.write("collector.jar", zip_bytes({"BOOT-INF/lib/telemetry-helper.bin": renamed_agent}))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(jvm)

    def test_dotnet_auto_instrumentation_is_found_inside_native_tar(self) -> None:
        nested = zip_bytes({"OpenTelemetry.AutoInstrumentation.dll": b"binary"})
        native = self.write("native.tar.gz", tar_bytes({"runtime/extension.nupkg": nested}))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(native)

    def test_embedded_collector_sbom_is_checked_recursively(self) -> None:
        sbom = json.dumps({
            "bomFormat": "CycloneDX",
            "components": [{"name": "opentelemetry-sdk-python"}],
        }).encode()
        native = self.write("native.tar.gz", tar_bytes({"sbom/hertzbeat-collector.cdx.json": sbom}))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(native)

    def test_release_inventory_checks_both_embedded_sboms(self) -> None:
        collector_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
        runtime_sbom = json.dumps({"bomFormat": "CycloneDX", "components": []}).encode()
        inventory = json.dumps({
            "schemaVersion": "1.0",
            "artifacts": [
                {"path": "hertzbeat-collector.cdx.json", "sha512": hashlib.sha512(collector_sbom).hexdigest()},
                {"path": "hertzbeat-otel-runtime.cdx.json", "sha512": "0" * 128},
            ],
        }).encode()
        native = self.write("native.tar.gz", tar_bytes({
            "runtime/hertzbeat-collector.cdx.json": collector_sbom,
            "runtime/hertzbeat-otel-runtime.cdx.json": runtime_sbom,
            "runtime/release-inventory.json": inventory,
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(native)

    def test_collector_sbom_rejects_test_agent_and_language_sdk_components(self) -> None:
        java_agent = self.write("java-agent.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "components": [{
                "group": "io.opentelemetry.javaagent",
                "name": "opentelemetry-javaagent",
                "scope": "excluded",
            }],
        }).encode())
        node_sdk = self.write("node-sdk.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "components": [{"name": "opentelemetry-sdk-node"}],
        }).encode())

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.verify_collector_sbom(java_agent)
        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.verify_collector_sbom(node_sdk)

    def test_collector_sbom_allows_internal_java_telemetry_libraries(self) -> None:
        sbom = self.write("collector.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "components": [
                {"group": "io.opentelemetry", "name": "opentelemetry-sdk"},
                {"group": "org.apache.hertzbeat", "name": "hertzbeat-observability"},
            ],
        }).encode())

        release_content.verify_collector_sbom(sbom)

    def test_collector_sbom_rejects_ecosystem_specific_sdk_purls(self) -> None:
        purls = [
            "pkg:npm/%40opentelemetry/sdk-node@0.204.0",
            "pkg:pypi/opentelemetry-sdk@1.43.0",
            "pkg:composer/open-telemetry/sdk@1.14.0",
            "pkg:nuget/OpenTelemetry@1.12.0",
        ]
        for index, purl in enumerate(purls):
            with self.subTest(purl=purl):
                sbom = self.write(f"ecosystem-{index}.cdx.json", json.dumps({
                    "bomFormat": "CycloneDX",
                    "components": [{"purl": purl}],
                }).encode())
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.verify_collector_sbom(sbom)

    def test_node_sdk_is_rejected_by_real_node_modules_path(self) -> None:
        release = self.write("node-release.zip", zip_bytes({
            "app/node_modules/@opentelemetry/sdk-node/package.json": '{"name":"@opentelemetry/sdk-node"}',
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_python_sdk_is_rejected_by_wheel_metadata(self) -> None:
        renamed_wheel = zip_bytes({
            "runtime-1.43.0.dist-info/METADATA": "Name: opentelemetry-sdk\nVersion: 1.43.0\n",
        })
        release = self.write("python-release.tar.gz", tar_bytes({"deps/runtime.bin": renamed_wheel}))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_php_sdk_is_rejected_by_composer_vendor_path(self) -> None:
        release = self.write("php-release.tar.gz", tar_bytes({
            "app/vendor/open-telemetry/sdk/src/Sdk.php": b"<?php",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_dotnet_sdk_is_rejected_by_real_nuget_package(self) -> None:
        package = zip_bytes({
            "OpenTelemetry.nuspec": (
                "<package><metadata><id>OpenTelemetry</id><version>1.12.0</version></metadata></package>"
            ),
        })
        release = self.write("dotnet-release.zip", zip_bytes({
            "packages/OpenTelemetry.1.12.0.nupkg": package,
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)


if __name__ == "__main__":
    unittest.main()
