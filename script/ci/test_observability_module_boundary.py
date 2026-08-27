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

"""Architecture contracts for the single observability backend module."""

from __future__ import annotations

import unittest
import xml.etree.ElementTree as element_tree
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MAVEN_NAMESPACE = {"m": "http://maven.apache.org/POM/4.0.0"}
OBSERVABILITY_ARTIFACT = "hertzbeat-observability"
LEGACY_ARTIFACTS = ("hertzbeat-log", "hertzbeat-otel")


def pom_artifact_ids(path: Path, query: str) -> list[str]:
    root = element_tree.parse(path).getroot()
    return [
        value
        for node in root.findall(query, MAVEN_NAMESPACE)
        if (value := node.findtext("m:artifactId", namespaces=MAVEN_NAMESPACE))
    ]


class ObservabilityModuleBoundaryTest(unittest.TestCase):

    def test_root_reactor_contains_only_the_consolidated_observability_module(self) -> None:
        root = element_tree.parse(ROOT / "pom.xml").getroot()
        modules = [
            node.text
            for node in root.findall("m:modules/m:module", MAVEN_NAMESPACE)
            if node.text
        ]

        self.assertEqual(1, modules.count(OBSERVABILITY_ARTIFACT))
        for artifact in LEGACY_ARTIFACTS:
            self.assertNotIn(artifact, modules)

    def test_dependency_management_does_not_publish_legacy_observability_artifacts(self) -> None:
        managed_artifacts = pom_artifact_ids(
            ROOT / "pom.xml",
            "m:dependencyManagement/m:dependencies/m:dependency",
        )

        for artifact in LEGACY_ARTIFACTS:
            self.assertNotIn(artifact, managed_artifacts)

    def test_startup_uses_the_consolidated_observability_module(self) -> None:
        startup_artifacts = pom_artifact_ids(
            ROOT / "hertzbeat-startup/pom.xml",
            "m:dependencies/m:dependency",
        )

        self.assertIn(OBSERVABILITY_ARTIFACT, startup_artifacts)
        for artifact in LEGACY_ARTIFACTS:
            self.assertNotIn(artifact, startup_artifacts)

    def test_legacy_observability_source_modules_do_not_exist(self) -> None:
        for artifact in LEGACY_ARTIFACTS:
            with self.subTest(artifact=artifact):
                legacy_path = ROOT / artifact
                self.assertFalse(
                    legacy_path.is_file()
                    or any(path.is_file() for path in legacy_path.rglob("*")),
                )


if __name__ == "__main__":
    unittest.main()
