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
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""CI trigger contracts; no builds, application starts, or network access."""
import fnmatch
import io
import os
import tarfile
import tempfile
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

import package_smoke
import test_release_scripts

ROOT = Path(__file__).resolve().parents[2]


def event_block(text, event):
    match = re.search(r'^  ' + event + r':\n((?:^ {4,}.*\n)*)', text, re.MULTILINE)
    if not match:
        raise AssertionError('Missing event ' + event)
    return match.group(1)


def patterns(block, key):
    match = re.search(r'^    ' + key + r':\n((?:^      - .*\n)*)', block, re.MULTILINE)
    return re.findall(r"^      - ['\"]?([^'\"\n]+)['\"]?$", match.group(1), re.MULTILINE) if match else []


class ReleaseValidation(unittest.TestCase):
    def test_native_aot_keeps_opt_in_health_types_only_in_native_profile(self):
        pom = ET.parse(ROOT / 'hertzbeat-collector/hertzbeat-collector-collector/pom.xml')
        ns = {'m': 'http://maven.apache.org/POM/4.0.0'}
        expected = '--management.endpoints.web.exposure.include=health,prometheus'
        matching_profiles = []
        for profile in pom.findall('./m:profiles/m:profile', ns):
            for plugin in profile.findall('./m:build/m:plugins/m:plugin', ns):
                if plugin.findtext('m:artifactId', namespaces=ns) == 'spring-boot-maven-plugin':
                    args = [arg.text for arg in plugin.findall('./m:configuration/m:arguments/m:argument', ns)]
                    if expected in args:
                        matching_profiles.append(profile.findtext('m:id', namespaces=ns))
        self.assertEqual(matching_profiles, ['native'])
        self.assertNotIn(expected, [arg.text for arg in pom.findall(
            './m:build/m:plugins/m:plugin/m:configuration/m:arguments/m:argument', ns)])

    def test_collector_runtime_health_remains_explicit_opt_in(self):
        default = (ROOT / 'hertzbeat-collector/hertzbeat-collector-collector/src/main/resources/application.yml').read_text()
        exposure = default.split('management:\n', 1)[1].split('  endpoint:\n', 1)[0]
        self.assertRegex(exposure, r"include:\s*\n\s*- 'prometheus'")
        self.assertNotIn('health', exposure)
        fixture = (ROOT / 'script/tests/fixtures/collector-smoke/application-smoke.yml').read_text()
        self.assertIn('include: health,prometheus', fixture)

    def test_strict_mode_fails_instead_of_skipping_missing_tools(self):
        case = test_release_scripts.RealReadinessUtilities()
        with patch('test_release_scripts.shutil.which', return_value=None):
            with patch.dict(os.environ, HERTZBEAT_REQUIRE_REAL_READINESS='1'):
                for tool in ('lsof', 'ss', 'netstat'):
                    with self.assertRaises(AssertionError):
                        case.check_tool(tool)
            with patch.dict(os.environ, HERTZBEAT_REQUIRE_REAL_READINESS='0'):
                with self.assertRaises(unittest.SkipTest):
                    case.check_tool('lsof')

    def test_package_http_health_requires_success_and_up_json(self):
        with patch('package_smoke.http.client.HTTPConnection') as connect:
            response = connect.return_value.getresponse.return_value
            response.status = 200
            response.read.return_value = b'{"status":"UP"}'
            self.assertEqual(package_smoke.health_response(18559, '/actuator/health'), {'status': 'UP'})
            connect.assert_called_with('127.0.0.1', 18559, timeout=2)
            connect.return_value.request.assert_called_with('GET', '/actuator/health')
            for status, body in ((503, b'{"status":"UP"}'), (200, b'{"status":"DOWN"}'),
                                 (200, b'not JSON'), (302, b'{"status":"UP"}')):
                response.status, response.read.return_value = status, body
                self.assertIsNone(package_smoke.health_response(18559, '/actuator/health'))

    def test_package_optional_http_basic_credentials_are_not_diagnostics(self):
        import base64
        with patch('package_smoke.http.client.HTTPConnection') as connect:
            response = connect.return_value.getresponse.return_value
            response.status = 401
            response.read.return_value = b'{"error":"Unauthorized"}'
            diagnostic = {}
            auth = ('fixture-admin', 'fixture-password')
            self.assertIsNone(package_smoke.health_response(18557, '/actuator/health', diagnostic, auth))
            encoded = base64.b64encode(b'fixture-admin:fixture-password').decode('ascii')
            connect.return_value.request.assert_called_with(
                'GET', '/actuator/health', headers={'Authorization': 'Basic ' + encoded})
            self.assertNotIn('fixture-admin', str(diagnostic))
            self.assertNotIn('fixture-password', str(diagnostic))
            self.assertNotIn(encoded, str(diagnostic))
            response.read.return_value = ('{"status":"UP","echo":"fixture-admin fixture-password ' + encoded + '"}').encode()
            healthy = package_smoke.health_response(18557, '/actuator/health', diagnostic, auth)
            # Status still fails while the HTTP response itself remains 401.
            self.assertIsNone(healthy)
            for credential in (*auth, encoded):
                self.assertNotIn(credential, str(diagnostic))
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(package_smoke.smoke_credentials())
        for name in ('HERTZBEAT_SMOKE_USERNAME', 'HERTZBEAT_SMOKE_PASSWORD'):
            with patch.dict(os.environ, {name: 'fixture-value'}, clear=True):
                with self.assertRaises(ValueError):
                    package_smoke.smoke_credentials()
        with patch.dict(os.environ, HERTZBEAT_SMOKE_USERNAME='fixture-admin',
                        HERTZBEAT_SMOKE_PASSWORD='fixture-password'):
            self.assertEqual(package_smoke.smoke_credentials(), auth)

    def test_package_diagnostics_persist_bounded_redacted_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            state = {'readiness': {'returncode': 1, 'stderr': 'permission denied'}, 'http': {}}
            with patch('package_smoke.http.client.HTTPConnection') as connect:
                response = connect.return_value.getresponse.return_value
                response.status = 503
                response.read.return_value = b'{"status":"DOWN","password":"fixture-secret"}'
                self.assertIsNone(package_smoke.health_response(18559, '/actuator/health', state['http']))
            state['readiness']['stdout'] = 'x' * 10000
            package_smoke.persist_diagnostics(output, state)
            text = (output / 'diagnostics.json').read_text()
            self.assertNotIn('fixture-secret', text)
            self.assertIn('REDACTED', text)
            self.assertIn('permission denied', text)
            self.assertIn('503', text)
            self.assertIn('DOWN', text)
            self.assertLess(len(text), 4096)

    def test_package_archive_rejects_path_escape_before_launch(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / 'invalid.tar.gz'
            with tarfile.open(archive, 'w:gz') as output:
                member = tarfile.TarInfo('../outside')
                member.size = 1
                output.addfile(member, io.BytesIO(b'x'))
            destination = root / 'extract'
            destination.mkdir()
            with self.assertRaises(tarfile.TarError):
                package_smoke.extract_package(archive, destination)
            self.assertFalse((root / 'outside').exists())

    def test_backend_runtime_changes_trigger_each_event(self):
        text = (ROOT / '.github/workflows/backend-build-test.yml').read_text()
        for event in ('push', 'pull_request'):
            block = event_block(text, event)
            self.assertIn('1.9.x-dev', block)
            for path in ('script/assembly/server/bin/entrypoint.sh',
                         'script/assembly/collector/assembly-native.xml',
                         'script/docker/server/Dockerfile', 'script/tests/package_smoke.py'):
                self.assertFalse(any(fnmatch.fnmatchcase(path, p) for p in patterns(block, 'paths-ignore')), (event, path))
        self.assertIn('needs: backend-build', text)
        self.assertIn('name: Run E2E', text)
        self.assertIn('-Prelease', text)

    def test_strict_linux_readiness_utilities(self):
        text = (ROOT / '.github/workflows/release-script-contracts.yml').read_text()
        self.assertIn('runs-on: ubuntu-latest', text)
        self.assertRegex(text, r'apt-get install[^\n]*lsof[^\n]*iproute2[^\n]*net-tools')
        self.assertIn('command -v lsof', text)
        self.assertIn('command -v ss', text)
        self.assertIn('netstat --version', text)
        self.assertIn('HERTZBEAT_REQUIRE_REAL_READINESS=1 python3 -m unittest', text)
        for event in ('push', 'pull_request'):
            block = event_block(text, event)
            for path in ('script/assembly/server/bin/entrypoint.sh', 'script/docker/server/Dockerfile',
                         'script/tests/test_release_validation.py', '.github/workflows/release-script-contracts.yml'):
                self.assertTrue(any(fnmatch.fnmatchcase(path, p) for p in patterns(block, 'paths')), (event, path))

    def test_native_trigger_and_existing_platform_policy(self):
        text = (ROOT / '.github/workflows/collector-native-build.yml').read_text()
        for event in ('push', 'pull_request'):
            block = event_block(text, event)
            self.assertIn('1.9.x-dev', block)
            for path in ('script/assembly/collector/bin-native/startup.sh',
                         'script/assembly/collector/assembly-native.xml',
                         'script/tests/package_smoke.py', 'script/tests/test_release_scripts.py',
                         'hertzbeat-common-core/src/main/java/Runtime.java',
                         'hertzbeat-common-spring/src/main/java/Runtime.java',
                         'hertzbeat-remoting/src/main/java/Runtime.java',
                         '.github/workflows/collector-native-build.yml'):
                self.assertTrue(any(fnmatch.fnmatchcase(path, p) for p in patterns(block, 'paths')), (event, path))
        for platform in ('linux-amd64', 'linux-arm64', 'windows-amd64'):
            self.assertIn('platform: ' + platform, text)
        self.assertIn('native-image --version', text)
        self.assertIn('collect strategies', text)
        self.assertIn('script/tests/package_smoke.py', text)
        self.assertIn('--config script/tests/fixtures/collector-smoke', text)
        self.assertIn("if: runner.os == 'Linux'", text)


if __name__ == '__main__':
    unittest.main()
