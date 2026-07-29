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

CLEAN_POM = """<project xmlns="http://maven.apache.org/POM/4.0.0">
  <dependencies><dependency>
    <groupId>org.apache.hertzbeat</groupId>
    <artifactId>hertzbeat-common</artifactId>
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


def plain_tar_bytes(entries: dict[str, bytes]) -> bytes:
    result = io.BytesIO()
    with tarfile.open(fileobj=result, mode="w") as archive:
        for name, payload in entries.items():
            info = tarfile.TarInfo(name)
            info.size = len(payload)
            archive.addfile(info, io.BytesIO(payload))
    return result.getvalue()


def docker_image_bytes(layers: list[bytes]) -> bytes:
    layer_names = [f"layer-{index}/layer.tar" for index in range(len(layers))]
    manifest = json.dumps([{
        "Config": "config.json",
        "RepoTags": ["apache/hertzbeat-collector:test"],
        "Layers": layer_names,
    }]).encode()
    entries = {
        "manifest.json": manifest,
        "config.json": b"{}",
    }
    entries.update(zip(layer_names, layers))
    return plain_tar_bytes(entries)


def oci_blob_descriptor(
        payload: bytes,
        media_type: str,
        *,
        size_adjustment: int = 0,
        corrupt_digest: bool = False,
) -> tuple[dict, dict[str, bytes]]:
    digest = hashlib.sha256(payload).hexdigest()
    if corrupt_digest:
        digest = "0" * 64 if digest != "0" * 64 else "1" * 64
    return ({
        "mediaType": media_type,
        "digest": f"sha256:{digest}",
        "size": len(payload) + size_adjustment,
    }, {f"blobs/sha256/{digest}": payload})


def oci_archive_bytes(index: object, blobs: dict[str, bytes]) -> bytes:
    return plain_tar_bytes({
        "oci-layout": b'{"imageLayoutVersion":"1.0.0"}',
        "index.json": json.dumps(index, separators=(",", ":")).encode(),
        **blobs,
    })


def oci_manifest_document_bytes(
        document: object,
        extra_blobs: dict[str, bytes] | None = None,
) -> bytes:
    payload = json.dumps(document, separators=(",", ":")).encode()
    descriptor, blob = oci_blob_descriptor(
        payload, "application/vnd.oci.image.manifest.v1+json")
    return oci_archive_bytes(
        {"schemaVersion": 2, "manifests": [descriptor]},
        {**blob, **(extra_blobs or {})},
    )


def oci_attestation_bytes() -> bytes:
    config_descriptor, config_blob = oci_blob_descriptor(
        b"{}",
        "application/vnd.oci.empty.v1+json",
    )
    statement_descriptor, statement_blob = oci_blob_descriptor(
        b'{"_type":"https://in-toto.io/Statement/v0.1"}',
        "application/vnd.in-toto+json",
    )
    manifest = json.dumps({
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.manifest.v1+json",
        "config": config_descriptor,
        "layers": [statement_descriptor],
    }, separators=(",", ":")).encode()
    manifest_descriptor, manifest_blob = oci_blob_descriptor(
        manifest, "application/vnd.oci.image.manifest.v1+json")
    manifest_descriptor["annotations"] = {
        "vnd.docker.reference.type": "attestation-manifest",
        "vnd.docker.reference.digest": f"sha256:{'1' * 64}",
    }
    return oci_archive_bytes(
        {"schemaVersion": 2, "manifests": [manifest_descriptor]},
        {**config_blob, **statement_blob, **manifest_blob},
    )


def oci_image_bytes(
        layer: bytes,
        *,
        config_media_type: str = "application/vnd.oci.image.config.v1+json",
        config_size_adjustment: int = 0,
        config_corrupt_digest: bool = False,
        layer_size_adjustment: int = 0,
        layer_corrupt_digest: bool = False,
        manifest_size_adjustment: int = 0,
        manifest_corrupt_digest: bool = False,
        manifest_annotations: dict | None = None,
) -> bytes:
    config_descriptor, config_blob = oci_blob_descriptor(
        b"{}",
        config_media_type,
        size_adjustment=config_size_adjustment,
        corrupt_digest=config_corrupt_digest,
    )
    layer_descriptor, layer_blob = oci_blob_descriptor(
        layer,
        "application/vnd.oci.image.layer.v1.tar",
        size_adjustment=layer_size_adjustment,
        corrupt_digest=layer_corrupt_digest,
    )
    manifest = json.dumps({
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.manifest.v1+json",
        "config": config_descriptor,
        "layers": [layer_descriptor],
    }, separators=(",", ":")).encode()
    manifest_descriptor, manifest_blob = oci_blob_descriptor(
        manifest,
        "application/vnd.oci.image.manifest.v1+json",
        size_adjustment=manifest_size_adjustment,
        corrupt_digest=manifest_corrupt_digest,
    )
    if manifest_annotations is not None:
        manifest_descriptor["annotations"] = manifest_annotations
    index = {
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.index.v1+json",
        "manifests": [manifest_descriptor],
    }
    return oci_archive_bytes(index, {
        **config_blob,
        **layer_blob,
        **manifest_blob,
    })


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

    def test_source_allows_pom_without_java_agent_coordinate(self) -> None:
        source = self.write("source.zip", zip_bytes({
            "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml": CLEAN_POM,
            "release/lib/ordinary.jar": zip_bytes({"META-INF/MANIFEST.MF": "Manifest-Version: 1.0\n"}),
        }))

        release_content.inspect_release_archive(source)
        release_content.verify_source_has_no_java_agent_dependency(source)

    def test_source_rejects_java_agent_coordinate_in_every_scope(self) -> None:
        for scope in ("test", "runtime"):
            with self.subTest(scope=scope):
                source = self.write(f"source-{scope}.zip", zip_bytes({
                    "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml":
                        TEST_POM.format(scope=scope),
                }))

                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.verify_source_has_no_java_agent_dependency(source)

    def test_source_rejects_java_agent_coordinate_in_any_pom(self) -> None:
        source = self.write("source-with-agent-module.zip", zip_bytes({
            "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml": CLEAN_POM,
            "release/other-module/pom.xml": TEST_POM.format(scope="test"),
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.verify_source_has_no_java_agent_dependency(source)

    def test_source_rejects_property_aliased_java_agent_coordinate(self) -> None:
        source = self.write("source-with-aliased-agent.zip", zip_bytes({
            "release/pom.xml": """<project xmlns="http://maven.apache.org/POM/4.0.0">
              <properties>
                <agent.group>io.opentelemetry.javaagent</agent.group>
                <agent.artifact>opentelemetry-javaagent</agent.artifact>
              </properties>
              <dependencies><dependency>
                <groupId>${agent.group}</groupId>
                <artifactId>${agent.artifact}</artifactId>
                <scope>test</scope>
              </dependency></dependencies>
            </project>""",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.verify_source_has_no_java_agent_dependency(source)

    def test_source_rejects_java_agent_file(self) -> None:
        source = self.write("source-with-agent.zip", zip_bytes({
            "release/hertzbeat-collector/hertzbeat-collector-collector/pom.xml": CLEAN_POM,
            "release/deps/opentelemetry-javaagent-2.27.0.jar": b"agent-binary",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(source)

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

    def test_embedded_runtime_sbom_is_checked_recursively(self) -> None:
        sbom = json.dumps({
            "bomFormat": "CycloneDX",
            "components": [{"name": "opentelemetry-sdk-node"}],
        }).encode()
        entries = {"runtime/hertzbeat-otel-runtime.cdx.json": sbom}
        archives = {
            "native.tar.gz": tar_bytes(entries),
            "windows.zip": zip_bytes(entries),
        }

        for name, payload in archives.items():
            with self.subTest(name=name):
                release = self.write(name, payload)
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_release_archive(release)

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

    def test_release_sbom_rejects_forbidden_metadata_components(self) -> None:
        standalone = self.write("metadata-agent.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "metadata": {
                "component": {
                    "group": "io.opentelemetry.javaagent",
                    "name": "opentelemetry-javaagent",
                },
            },
        }).encode())
        embedded = self.write("metadata-sdk.tar.gz", tar_bytes({
            "runtime/hertzbeat-otel-runtime.cdx.json": json.dumps({
                "bomFormat": "CycloneDX",
                "metadata": {
                    "component": {
                        "group": "org.apache.hertzbeat",
                        "name": "hertzbeat-otel-runtime",
                        "components": [{"name": "opentelemetry-sdk-python"}],
                    },
                },
            }).encode(),
        }))

        checks = {
            "standalone-root": lambda: release_content.verify_collector_sbom(standalone),
            "embedded-nested": lambda: release_content.inspect_release_archive(embedded),
        }
        for name, check in checks.items():
            with self.subTest(name=name):
                with self.assertRaises(release_content.ReleasePolicyError):
                    check()

    def test_release_sbom_allows_hertzbeat_metadata_root(self) -> None:
        sbom = self.write("metadata-hertzbeat.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "metadata": {
                "component": {
                    "group": "org.apache.hertzbeat",
                    "name": "hertzbeat-collector",
                    "purl": "pkg:maven/org.apache.hertzbeat/hertzbeat-collector@2.0.0",
                },
            },
        }).encode())

        release_content.verify_collector_sbom(sbom)

    def test_container_image_rejects_agent_and_sdk_from_every_layer(self) -> None:
        renamed_agent = zip_bytes({
            "META-INF/MANIFEST.MF": (
                "Manifest-Version: 1.0\n"
                "Premain-Class: io.opentelemetry.javaagent.OpenTelemetryAgent\n"
            ),
        })
        fixtures = {
            "named-agent": [
                plain_tar_bytes({"opt/opentelemetry-javaagent.jar": b"agent"}),
            ],
            "renamed-agent-before-whiteout": [
                plain_tar_bytes({"opt/helper.bin": renamed_agent}),
                plain_tar_bytes({"opt/.wh.helper.bin": b""}),
            ],
            "language-sdk": [
                plain_tar_bytes({
                    "usr/lib/node_modules/@opentelemetry/sdk-node/package.json":
                        b'{"name":"@opentelemetry/sdk-node"}',
                }),
            ],
        }
        for name, layers in fixtures.items():
            with self.subTest(name=name):
                image = self.write(f"{name}.tar", docker_image_bytes(layers))
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_container_image(image)
        oci_image = self.write("language-sdk.oci.tar", oci_image_bytes(
            plain_tar_bytes({
                "usr/lib/node_modules/@opentelemetry/sdk-node/package.json":
                    b'{"name":"@opentelemetry/sdk-node"}',
            }),
        ))
        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_container_image(oci_image)

    def test_container_image_allows_ordinary_base_native_files(self) -> None:
        layer = plain_tar_bytes({
            "usr/bin/sh": b"\x7fELF" + b"\0" * 64,
            "usr/lib/libc.so.6": b"\x7fELF" + b"\0" * 64,
        })
        images = {
            "base-native.docker.tar": docker_image_bytes([layer]),
            "base-native.oci.tar": oci_image_bytes(layer),
        }
        for name, payload in images.items():
            with self.subTest(name=name):
                release_content.inspect_container_image(self.write(name, payload))

    def test_oci_unknown_config_cannot_bypass_layer_scan(self) -> None:
        layer = plain_tar_bytes({
            "opt/opentelemetry-javaagent.jar": b"agent",
        })
        image = self.write("unknown-config.oci.tar", oci_image_bytes(
            layer,
            config_media_type="application/vnd.example.unknown.config",
        ))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_container_image(image)

    def test_oci_allows_structurally_valid_docker_attestation(self) -> None:
        image = self.write("attestation.oci.tar", oci_attestation_bytes())

        release_content.inspect_container_image(image)

    def test_oci_descriptors_verify_declared_digest_and_size(self) -> None:
        layer = plain_tar_bytes({"usr/share/base.txt": b"base"})
        fixtures = {
            "config-digest": {"config_corrupt_digest": True},
            "config-size": {"config_size_adjustment": 1},
            "manifest-digest": {"manifest_corrupt_digest": True},
            "manifest-size": {"manifest_size_adjustment": 1},
            "layer-digest": {"layer_corrupt_digest": True},
            "layer-size": {"layer_size_adjustment": 1},
        }
        for name, options in fixtures.items():
            with self.subTest(name=name):
                image = self.write(
                    f"{name}.oci.tar",
                    oci_image_bytes(layer, **options),
                )
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_container_image(image)

    def test_oci_invalid_json_shapes_raise_policy_errors(self) -> None:
        config_descriptor, config_blob = oci_blob_descriptor(
            b"{}", "application/vnd.oci.image.config.v1+json")
        documents = {
            "index-not-object": oci_archive_bytes([], {}),
            "manifests-not-list": oci_archive_bytes(
                {"schemaVersion": 2, "manifests": {}}, {}),
            "manifest-not-object": oci_manifest_document_bytes([]),
            "layers-not-list": oci_manifest_document_bytes({
                "schemaVersion": 2,
                "config": config_descriptor,
                "layers": {},
            }, config_blob),
        }
        for name, payload in documents.items():
            with self.subTest(name=name):
                image = self.write(f"{name}.oci.tar", payload)
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_container_image(image)

    def test_collector_sbom_allows_internal_java_telemetry_libraries(self) -> None:
        sbom = self.write("collector.cdx.json", json.dumps({
            "bomFormat": "CycloneDX",
            "components": [
                {"group": "io.opentelemetry", "name": "opentelemetry-sdk"},
                {"group": "org.apache.hertzbeat", "name": "hertzbeat-observability"},
            ],
        }).encode())

        release_content.verify_collector_sbom(sbom)

    def test_jvm_release_allows_internal_java_telemetry_library(self) -> None:
        java_sdk = zip_bytes({
            "META-INF/MANIFEST.MF": "Manifest-Version: 1.0\n",
            "io/opentelemetry/sdk/OpenTelemetrySdk.class": b"class",
        })
        startup = self.write("startup.jar", zip_bytes({
            "BOOT-INF/lib/opentelemetry-sdk.jar": java_sdk,
        }))

        release_content.inspect_release_archive(startup)

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

    def test_python_sdk_is_rejected_from_virtual_environment(self) -> None:
        release = self.write("python-venv.zip", zip_bytes({
            "app/.venv/lib/python3.13/site-packages/opentelemetry/sdk/__init__.py": "",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_php_sdk_is_rejected_by_composer_vendor_path(self) -> None:
        release = self.write("php-release.tar.gz", tar_bytes({
            "app/vendor/open-telemetry/sdk/src/Sdk.php": b"<?php",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_php_instrumentation_extension_is_rejected(self) -> None:
        release = self.write("php-extension.tar.gz", tar_bytes({
            "app/extensions/opentelemetry.so": b"binary",
        }))

        with self.assertRaises(release_content.ReleasePolicyError):
            release_content.inspect_release_archive(release)

    def test_go_sdk_and_ebpf_packages_are_rejected_from_vendor_trees(self) -> None:
        package_paths = [
            "app/vendor/go.opentelemetry.io/otel/sdk/trace/provider.go",
            "app/vendor/go.opentelemetry.io/auto/sdk/autoinstrumentation.go",
        ]
        for index, package_path in enumerate(package_paths):
            with self.subTest(package_path=package_path):
                release = self.write(f"go-release-{index}.zip", zip_bytes({package_path: "package sdk"}))
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

    def test_renamed_standalone_native_payloads_are_rejected_by_magic(self) -> None:
        pe_payload = (
            b"MZ" + b"\0" * 58 + b"\x40\0\0\0" + b"PE\0\0" + b"\0" * 32
        )
        fixtures = [
            ("elf.zip", zip_bytes({"release/helper.bin": b"\x7fELF" + b"\0" * 64})),
            ("dotnet-native.tar.gz", tar_bytes({
                "release/helper": pe_payload,
            })),
            ("macho.zip", zip_bytes({
                "release/helper.bin": b"\xcf\xfa\xed\xfe" + b"\0" * 64,
            })),
            ("fat-macho.zip", zip_bytes({
                "release/helper.bin": b"\xca\xfe\xba\xbe\x00\x00\x00\x02" + b"\0" * 64,
            })),
            ("nested-native.tar.gz", tar_bytes({
                "release/deps.zip": zip_bytes({
                    "helper.bin": b"\x7fELF" + b"\0" * 64,
                }),
            })),
        ]
        for archive_name, payload in fixtures:
            with self.subTest(archive_name=archive_name):
                release = self.write(archive_name, payload)
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_release_archive(release)

    def test_release_allows_native_payloads_only_at_assembled_runtime_paths(self) -> None:
        release = self.write("assembled-native-paths.tar.gz", tar_bytes({
            "apache-hertzbeat-collector-2.0.0/java/bin/java":
                b"\x7fELF" + b"\0" * 64,
            "apache-hertzbeat-collector-2.0.0/jre/bin/java":
                b"\x7fELF" + b"\0" * 64,
            "apache-hertzbeat-collector-2.0.0/runtime/linux-amd64/hertzbeat-otel-runtime":
                b"\x7fELF" + b"\0" * 64,
            "apache-hertzbeat-collector-2.0.0/runtime/windows-amd64/"
            "hertzbeat-otel-runtime.exe":
                b"MZ" + b"\0" * 64,
            "apache-hertzbeat-collector-native-2.0.0-macos-arm64-bin/"
            "apache-hertzbeat-collector-native-2.0.0":
                b"\xcf\xfa\xed\xfe" + b"\0" * 64,
            "apache-hertzbeat-collector-native-2.0.0-windows-amd64-bin/"
            "apache-hertzbeat-collector-native-2.0.0.exe":
                b"MZ" + b"\0" * 64,
            "apache-hertzbeat-collector-2.0.0/lib/"
            "netty-transport-native-epoll-4.1.117.Final-linux-x86_64.jar":
                zip_bytes({
                    "META-INF/native/libnetty_transport_native_epoll_x86_64.so":
                        b"\x7fELF" + b"\0" * 64,
                }),
        }))

        release_content.inspect_release_archive(release)

    def test_java_class_magic_is_not_treated_as_fat_macho(self) -> None:
        old_java_class = b"\xca\xfe\xba\xbe\x00\x03\x00\x2d" + b"\0" * 64
        java_21_class = b"\xca\xfe\xba\xbe\x00\x00\x00\x41" + b"\0" * 64
        release = self.write("old-java-class.tar.gz", tar_bytes({
            "apache-hertzbeat-collector-2.0.0-bin/lib/woodstox-core.jar":
                zip_bytes({
                    "shaded/Datatype.class": old_java_class,
                    "org/apache/hertzbeat/Current.class": java_21_class,
                }),
        }))

        release_content.inspect_release_archive(release)

    def test_archive_rejects_parent_and_absolute_member_paths(self) -> None:
        for index, member_path in enumerate(("../../escape", "/absolute/escape", "C:\\escape")):
            with self.subTest(member_path=member_path):
                release = self.write(
                    f"unsafe-path-{index}.tar.gz",
                    tar_bytes({member_path: b"must-not-extract"}),
                )
                with self.assertRaises(release_content.ReleasePolicyError):
                    release_content.inspect_release_archive(release)


if __name__ == "__main__":
    unittest.main()
