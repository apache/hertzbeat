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

import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path


INSTALLER = Path(__file__).parents[1] / "assembly/collector/systemd/install-systemd.sh"
SECRET = "systemd-proof-secret-must-not-leak"


class HybridCollectorSystemdInstallTest(unittest.TestCase):

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.fake_systemctl = self.root / "fake-systemctl.sh"
        self.systemctl_log = self.root / "systemctl.log"
        self.fail_once = self.root / "fail-start-once"
        self.fake_systemctl.write_text(
            "#!/bin/sh\n"
            "printf '%s\\n' \"$*\" >> \"$HERTZBEAT_FAKE_SYSTEMCTL_LOG\"\n"
            "if [ \"$1\" = start ] && [ -f \"$HERTZBEAT_FAKE_FAIL_ONCE\" ]; then\n"
            "  rm -f \"$HERTZBEAT_FAKE_FAIL_ONCE\"\n"
            "  exit 1\n"
            "fi\n",
            encoding="utf-8",
        )
        self.fake_systemctl.chmod(0o755)
        self.source_v1 = self.source("collector-1.0", b"native-v1", "revision: 1\n")
        self.source_v2 = self.source("collector-2.0", b"native-v2", "revision: 2\n")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def source(self, name: str, native_payload: bytes, config: str) -> Path:
        source = self.root / name
        (source / "bin").mkdir(parents=True)
        (source / "config").mkdir()
        (source / "service").mkdir()
        (source / "runtime/linux-amd64").mkdir(parents=True)
        launcher = source / "bin/foreground.sh"
        launcher.write_text("#!/bin/sh\nexec ./apache-hertzbeat-collector-native \"$@\"\n", encoding="utf-8")
        launcher.chmod(0o755)
        native = source / "apache-hertzbeat-collector-native"
        native.write_bytes(native_payload)
        native.chmod(0o755)
        runtime = source / "runtime/linux-amd64/hertzbeat-otel-runtime"
        runtime.write_bytes(b"runtime")
        runtime.chmod(0o755)
        (source / "config/application.yml").write_text(config, encoding="utf-8")
        (source / "service/hertzbeat-collector.service").write_text("[Service]\n", encoding="utf-8")
        return source

    def run_installer(self, action: str, source: Path | None = None) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.update({
            "HERTZBEAT_SYSTEMD_ROOT": str(self.root / "root"),
            "HERTZBEAT_SYSTEMCTL": str(self.fake_systemctl),
            "HERTZBEAT_SYSTEMD_USER": "fixture-user",
            "HERTZBEAT_SYSTEMD_GROUP": "fixture-group",
            "HERTZBEAT_FAKE_SYSTEMCTL_LOG": str(self.systemctl_log),
            "HERTZBEAT_FAKE_FAIL_ONCE": str(self.fail_once),
        })
        command = ["sh", INSTALLER, action]
        if source is not None:
            command.append(source)
        return subprocess.run(
            command,
            env=environment,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def path(self, absolute: str) -> Path:
        return self.root / "root" / absolute.lstrip("/")

    def test_upgrade_preserves_identity_config_queue_offsets_and_permissions(self) -> None:
        installed = self.run_installer("install", self.source_v1)
        self.assertEqual(0, installed.returncode, installed.stderr)
        current = self.path("/opt/hertzbeat-collector/current")
        first_release = current.resolve()
        config = self.path("/etc/hertzbeat/config/application.yml")
        environment = self.path("/etc/hertzbeat/collector.env")
        queue = self.path("/var/lib/hertzbeat-collector/otel-runtime/queue.db")
        offset = self.path("/var/lib/hertzbeat-collector/otel-runtime/filelog.offset")
        config.write_text("collectorId: edge-a\nrevision: 37\n", encoding="utf-8")
        environment.write_text(f"HERTZBEAT_OTLP_TOKEN={SECRET}\nIDENTITY=edge-a\n", encoding="utf-8")
        queue.parent.mkdir(parents=True, exist_ok=True)
        queue.write_text("queued-three-signals", encoding="utf-8")
        offset.write_text("offset=8192", encoding="utf-8")

        upgraded = self.run_installer("upgrade", self.source_v2)

        self.assertEqual(0, upgraded.returncode, upgraded.stderr)
        self.assertNotEqual(first_release, current.resolve())
        self.assertEqual("collectorId: edge-a\nrevision: 37\n", config.read_text(encoding="utf-8"))
        self.assertIn("IDENTITY=edge-a", environment.read_text(encoding="utf-8"))
        self.assertEqual("queued-three-signals", queue.read_text(encoding="utf-8"))
        self.assertEqual("offset=8192", offset.read_text(encoding="utf-8"))
        self.assertEqual(0o600, stat.S_IMODE(environment.stat().st_mode))
        self.assertEqual(0o640, stat.S_IMODE(config.stat().st_mode))
        self.assertTrue((current.resolve() / "config").is_symlink())
        self.assertTrue((current.resolve() / "data").is_symlink())
        self.assertTrue((current.resolve() / "logs").is_symlink())
        evidence = upgraded.stdout + upgraded.stderr + self.systemctl_log.read_text(encoding="utf-8")
        self.assertNotIn(SECRET, evidence)

    def test_failed_upgrade_rolls_back_to_running_previous_release(self) -> None:
        self.assertEqual(0, self.run_installer("install", self.source_v1).returncode)
        current = self.path("/opt/hertzbeat-collector/current")
        previous = current.resolve()
        self.fail_once.touch()

        upgraded = self.run_installer("upgrade", self.source_v2)

        self.assertNotEqual(0, upgraded.returncode)
        self.assertEqual(previous, current.resolve())
        starts = [line for line in self.systemctl_log.read_text(encoding="utf-8").splitlines()
                  if line == "start hertzbeat-collector.service"]
        self.assertGreaterEqual(len(starts), 3)

    def test_install_is_idempotent_and_invalid_source_cannot_replace_current(self) -> None:
        first = self.run_installer("install", self.source_v1)
        current = self.path("/opt/hertzbeat-collector/current")
        first_release = current.resolve()
        config = self.path("/etc/hertzbeat/config/application.yml")
        config.write_text("revision: 91\n", encoding="utf-8")

        second = self.run_installer("install", self.source_v1)
        invalid = self.root / "invalid-source"
        invalid.mkdir()
        rejected = self.run_installer("upgrade", invalid)

        self.assertEqual(0, first.returncode, first.stderr)
        self.assertEqual(0, second.returncode, second.stderr)
        self.assertNotEqual(0, rejected.returncode)
        self.assertEqual(first_release, current.resolve())
        self.assertEqual("revision: 91\n", config.read_text(encoding="utf-8"))

    def test_uninstall_preserves_state_and_explicit_purge_removes_it(self) -> None:
        self.assertEqual(0, self.run_installer("install", self.source_v1).returncode)
        self.path("/etc/hertzbeat/collector.env").write_text(f"TOKEN={SECRET}\n", encoding="utf-8")
        state = self.path("/var/lib/hertzbeat-collector/queue.db")
        state.write_text("queue", encoding="utf-8")

        removed = self.run_installer("uninstall")

        self.assertEqual(0, removed.returncode, removed.stderr)
        self.assertFalse(self.path("/opt/hertzbeat-collector").exists())
        self.assertFalse(self.path("/etc/systemd/system/hertzbeat-collector.service").exists())
        self.assertTrue(self.path("/etc/hertzbeat/collector.env").is_file())
        self.assertTrue(state.is_file())
        self.assertTrue(self.path("/var/log/hertzbeat-collector").is_dir())

        purged = self.run_installer("purge")

        self.assertEqual(0, purged.returncode, purged.stderr)
        self.assertFalse(self.path("/etc/hertzbeat").exists())
        self.assertFalse(self.path("/var/lib/hertzbeat-collector").exists())
        self.assertFalse(self.path("/var/log/hertzbeat-collector").exists())


if __name__ == "__main__":
    unittest.main()
