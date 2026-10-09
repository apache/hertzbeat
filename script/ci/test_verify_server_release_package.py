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
import os
import signal
import socket
import subprocess
import sys
import tarfile
import tempfile
import threading
import unittest
import xml.etree.ElementTree as ET
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


class ServerLauncherContractTest(unittest.TestCase):
    """Run packaged shell entry points with isolated child/HTTP commands only."""

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.app = self.root / "app with spaces"
        self.bin = self.app / "bin"
        self.bin.mkdir(parents=True)
        for name in ("config", "lib", "ext-lib"):
            (self.app / name).mkdir()
        self.fake_bin = self.root / "fake" / "bin"
        self.fake_bin.mkdir(parents=True)
        self.capture = self.root / "java-args.txt"
        self.stub("ps", 'if [ -f "$CAPTURE.pid" ]; then pid=$(cat "$CAPTURE.pid"); args=$(cat "$CAPTURE.flat"); case "$1" in -p) printf "java %s\\n" "$args";; *) printf "%s java %s\\n" "$pid" "$args";; esac; fi')
        self.stub("lsof", "exit 0")
        self.stub("netstat", "exit 0")
        self.stub("java", 'printf "%s\\n" "$@" > "$CAPTURE"; printf "%s " "$@" > "$CAPTURE.flat"; echo $$ > "$CAPTURE.pid"; [ "$CHILD_MODE" = fail ] && exit 42; exec sleep 30')
        self.stub("curl", 'printf "%s\\n" "$HTTP_BODY"; exit "$HTTP_EXIT"')
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            self.port = listener.getsockname()[1]
        self.env = {key: value for key, value in os.environ.items()
                    if key not in ("JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS", "JAVA_OPTS")}
        self.env.update(PATH=str(self.fake_bin) + ":/usr/bin:/bin", CAPTURE=str(self.capture),
                        CHILD_MODE="alive", HTTP_BODY='{"phase":"configuration_required"}',
                        HTTP_EXIT="0", SERVER_PORT=str(self.port), START_TIMEOUT="1")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def stub(self, name: str, body: str) -> None:
        path = self.fake_bin / name
        path.write_text("#!/bin/sh\n" + body + "\n")
        path.chmod(0o755)

    def launcher(self, name: str) -> Path:
        source = REPO_ROOT / "script/assembly/server/bin" / name
        path = self.bin / name
        path.write_text(source.read_text().replace("${project.artifactId}", "apache-hertzbeat")
                        .replace("${project.build.finalName}", "apache-hertzbeat-2.0.0"))
        path.chmod(0o755)
        return path

    def run_launcher(self, name: str, timeout: int = 4, args: tuple[str, ...] = ()) -> tuple[int | None, str]:
        shell = "/bin/sh" if name == "entrypoint.sh" else "/bin/bash"
        process = subprocess.Popen([shell, str(self.launcher(name)), *args], cwd=self.app,
                                   env=self.env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   text=True, start_new_session=True)
        try:
            output, _ = process.communicate(timeout=timeout)
            return process.returncode, output
        except subprocess.TimeoutExpired:
            return None, "Launcher did not finish within the bounded test deadline"
        finally:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            process.communicate(timeout=2)

    def test_failed_java_child_exits_without_waiting_for_an_unrelated_port(self) -> None:
        self.env["CHILD_MODE"] = "fail"
        code, output = self.run_launcher("startup.sh")
        self.assertEqual(1, code, output)
        self.assertIn("startup.log", output)
        self.assertNotIn("Service Start Success", output)

    def test_shutdown_does_not_signal_other_java_or_prefix_configuration(self) -> None:
        for mismatch in ("config", "main", "classpath"):
            with self.subTest(mismatch=mismatch):
                child = subprocess.Popen(["/bin/sleep", "30"])
                reaper = threading.Thread(target=child.wait, daemon=True)
                reaper.start()
                config = f"{self.app}/config/" + ("other/" if mismatch == "config" else "")
                main = "OtherJavaApplication" if mismatch == "main" else "org.apache.hertzbeat.startup.HertzBeatApplication"
                cp = "/other.jar" if mismatch == "classpath" else f"{self.app}/apache-hertzbeat-2.0.0.jar:{self.app}/lib/*:{self.app}/ext-lib/*"
                self.env.update(PROOF_PID=str(child.pid), PROOF_ARGS=f"java -Xmx64m -Dspring.config.location={config} -cp {cp} {main}")
                self.stub("ps", 'case "$1" in -ef) printf "user %s 1 now %s\\n" "$PROOF_PID" "$PROOF_ARGS";; -p) printf "%s\\n" "$PROOF_ARGS";; *) printf "%s %s\\n" "$PROOF_PID" "$PROOF_ARGS";; esac')
                try:
                    status = subprocess.run(["/bin/bash", str(self.launcher("startup.sh")), "status"],
                                            env=self.env, capture_output=True, text=True, timeout=5)
                    result = subprocess.run(["/bin/bash", str(self.launcher("shutdown.sh"))],
                                            env=self.env, capture_output=True, text=True, timeout=5)
                    self.assertIsNone(child.poll(), result.stdout + result.stderr)
                    self.assertIn("is stopped", status.stdout)
                    self.assertEqual(0, result.returncode, result.stderr)
                finally:
                    child.kill()
                    reaper.join(timeout=2)

    def test_owned_shutdown_requires_exit_and_preserves_other_identity(self) -> None:
        for mode in ("graceful", "deadline", "changed"):
            with self.subTest(mode=mode):
                if mode == "graceful":
                    child = subprocess.Popen(["/bin/sleep", "30"])
                else:
                    child = subprocess.Popen([sys.executable, "-c",
                        "import signal,time; signal.signal(signal.SIGTERM,signal.SIG_IGN); print('ready',flush=True); time.sleep(30)"],
                        stdout=subprocess.PIPE, text=True)
                    self.assertEqual("ready", child.stdout.readline().strip())
                reaper = threading.Thread(target=child.wait, daemon=True)
                reaper.start()
                count = self.root / "ps-count"
                count.unlink(missing_ok=True)
                cp = f"{self.app}/apache-hertzbeat-2.0.0.jar:{self.app}/lib/*:{self.app}/ext-lib/*"
                self.env.update(PROOF_PID=str(child.pid), PROOF_MODE=mode, PROOF_COUNT=str(count), STOP_TIMEOUT="1",
                    PROOF_ARGS=f"java -Xmx64m -Dproof.setting=kept -Dspring.config.location={self.app}/config/ -cp {cp} org.apache.hertzbeat.startup.HertzBeatApplication --server.port=1234")
                self.stub("ps", '''args="$PROOF_ARGS"
if [ "$1" = -p ]; then
  n=$(cat "$PROOF_COUNT" 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > "$PROOF_COUNT"
  if [ "$PROOF_MODE" = changed ] && [ "$n" -ge 3 ]; then args="java AnotherApplication"; fi
  printf '%s\n' "$args"
else
  printf '%s %s\n' "$PROOF_PID" "$args"
fi''')
                try:
                    result = subprocess.run(["/bin/bash", str(self.launcher("shutdown.sh"))],
                                            env=self.env, capture_output=True, text=True, timeout=5)
                    self.assertEqual(0 if mode == "graceful" else 1, result.returncode, result.stdout + result.stderr)
                    self.assertEqual(mode != "graceful", child.poll() is None)
                    self.assertEqual(mode == "graceful", "Shutdown Apache HertzBeat apache-hertzbeat Success" in result.stdout)
                    if mode == "changed":
                        self.assertIn("changed identity", result.stderr)
                finally:
                    child.kill()
                    reaper.join(timeout=2)
                    if child.stdout is not None:
                        child.stdout.close()

    def test_setup_document_ready_keeps_custom_options_and_quoted_paths(self) -> None:
        self.env["JAVA_OPTS"] = "-Xmx256m -Dproof.setting=kept"
        code, output = self.run_launcher("startup.sh")
        self.assertEqual(0, code, output)
        self.assertIn("Setup required", output)
        arguments = self.capture.read_text().splitlines()
        self.assertIn("-Xmx256m", arguments)
        self.assertIn("-Dproof.setting=kept", arguments)
        self.assertIn(f"-Dspring.config.location={self.app}/config/", arguments)
        self.assertIn(f"{self.app}/apache-hertzbeat-2.0.0.jar:{self.app}/lib/*:{self.app}/ext-lib/*", arguments)
        self.assertTrue(any(arg.startswith("--add-opens=java.base/java.nio=") for arg in arguments))

    def test_unrelated_listener_is_rejected_before_launching_java(self) -> None:
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", self.port))
            listener.listen()
            code, output = self.run_launcher("startup.sh")
        self.assertEqual(1, code, output)
        self.assertIn("already used", output)
        self.assertFalse(self.capture.exists())

    def test_http_200_without_setup_phase_is_not_ready(self) -> None:
        self.env["HTTP_BODY"] = '{"phase":"application_starting"}'
        code, output = self.run_launcher("startup.sh")
        self.assertEqual(1, code, output)
        self.assertIn("timed out", output)
        self.assertNotIn("Service Start Success", output)

    def test_entrypoint_custom_options_retain_required_arrow_access(self) -> None:
        self.env.update(CHILD_MODE="fail", JAVA_OPTS="-Xmx256m")
        code, output = self.run_launcher("entrypoint.sh", args=("--server.port=9123",))
        self.assertEqual(42, code, output)
        arguments = self.capture.read_text().splitlines()
        self.assertIn("-Xmx256m", arguments)
        self.assertTrue(any(arg.startswith("--add-opens=java.base/java.nio=") for arg in arguments))
        self.assertIn(f"-Dspring.config.location={self.app}/config/", arguments)
        self.assertEqual("--server.port=9123", arguments[-1])
        self.assertLess(arguments.index("org.apache.hertzbeat.startup.HertzBeatApplication"),
                        arguments.index("--server.port=9123"))

    def test_restart_propagates_shutdown_and_startup_failure(self) -> None:
        for shutdown, startup in ((7, 0), (0, 8)):
            with self.subTest(shutdown=shutdown, startup=startup):
                for name, code in (("shutdown.sh", shutdown), ("startup.sh", startup)):
                    path = self.bin / name
                    path.write_text(f"#!/bin/sh\nexit {code}\n")
                    path.chmod(0o755)
                code, output = self.run_launcher("restart.sh")
                self.assertEqual(shutdown or startup, code, output)
                self.assertNotIn("Restart Success", output)

    def test_docker_archive_selection_is_exact_and_matches_distribution_version(self) -> None:
        pom = ET.parse(REPO_ROOT / "pom.xml")
        version = pom.findtext("m:properties/m:hzb.version", namespaces={"m": "http://maven.apache.org/POM/4.0.0"})
        dockerfile = (REPO_ROOT / "script/docker/server/Dockerfile").read_text()
        self.assertIn(f"ARG HERTZBEAT_VERSION={version}", dockerfile)
        self.assertIn("ADD apache-hertzbeat-${HERTZBEAT_VERSION}-docker-bin.tar.gz /opt/", dockerfile)
        self.assertNotIn("1.*-docker-bin", dockerfile)


if __name__ == "__main__":
    unittest.main()
