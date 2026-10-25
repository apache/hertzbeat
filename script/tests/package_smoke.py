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

"""Smoke a real Linux/macOS distribution; never discover or signal host processes.

The caller supplies a trusted release tarball and an explicit configuration overlay.
Only the Popen child created here is terminated. Native launch is direct because the
standalone startup launcher intentionally discovers processes; its contract has a
separate isolated fixture suite. Logs survive extraction cleanup in --output-dir.
"""
import argparse
import base64
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tarfile
import tempfile
import time


def extract_package(archive, destination):
    with tarfile.open(archive, 'r:*') as package:
        package.extractall(destination, filter='data')
    roots = [p for p in destination.iterdir() if p.is_dir() and (p / 'bin/lifecycle.sh').is_file()]
    if len(roots) != 1:
        raise ValueError('archive must contain exactly one distribution with bin/lifecycle.sh')
    home = roots[0]
    for script in home.glob('bin/*.sh'):
        if '${project.' in script.read_text():
            raise ValueError('unfiltered packaged launcher: ' + str(script))
    return home


def command_for(home, kind):
    if kind == 'server':
        launcher = home / 'bin/entrypoint.sh'
        if not launcher.is_file() or not any(home.glob('*.jar')):
            raise ValueError('server package must contain entrypoint.sh and its real application jar')
        return [str(launcher)]
    # Reject script substitutes: a native package must carry an ELF or Mach-O binary.
    binaries = []
    for candidate in home.iterdir():
        if candidate.is_file() and os.access(candidate, os.X_OK):
            with candidate.open('rb') as content:
                if content.read(4) in (b'\x7fELF', b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf'):
                    binaries.append(candidate)
    if len(binaries) != 1:
        raise ValueError('native package must contain exactly one real executable')
    return [str(binaries[0]), '--spring.config.location=' + str(home / 'config') + '/']


def bounded_text(value):
    text = str(value)
    sensitive = re.compile(r'password|secret|token|authorization|cookie|credential', re.I)

    def redact(item):
        if isinstance(item, dict):
            return {key: '[REDACTED]' if sensitive.search(key) else redact(val) for key, val in item.items()}
        if isinstance(item, list):
            return [redact(val) for val in item]
        return item

    try:
        parsed = json.loads(text)
        if isinstance(parsed, (dict, list)):
            return re.sub(r'(://)[^/@\s]+@', r'\1[REDACTED]@', json.dumps(redact(parsed)))[:2048]
    except ValueError:
        pass
    text = re.sub(r'(?i)(password|secret|token|authorization|cookie|credential)[\"\']?\s*[:=]\s*[^\r\n]*',
                  r'\1=[REDACTED]', text)
    text = re.sub(r'(://)[^/@\s]+@', r'\1[REDACTED]@', text)
    return text[:2048]


def persist_diagnostics(output, state):
    # A single overwritten snapshot, never an accumulating history or HTTP headers.
    def bounded(item):
        if isinstance(item, dict):
            return {key: bounded(value) for key, value in item.items()}
        return bounded_text(item) if isinstance(item, str) else item
    (output / 'diagnostics.json').write_text(json.dumps(bounded(state), indent=2) + '\n')


def smoke_credentials():
    username = os.environ.get('HERTZBEAT_SMOKE_USERNAME')
    password = os.environ.get('HERTZBEAT_SMOKE_PASSWORD')
    if username is None and password is None:
        return None
    if not username or not password:
        raise ValueError('HERTZBEAT_SMOKE_USERNAME and HERTZBEAT_SMOKE_PASSWORD must both be nonempty')
    return username, password


def health_response(port, path, diagnostic=None, auth=None):
    # Direct loopback connection: no proxy, redirects or remote URL resolution.
    if diagnostic is None:
        diagnostic = {}
    diagnostic.clear()
    diagnostic.update(path=path, status=None, error=None, body='')
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
    encoded = base64.b64encode((auth[0] + ':' + auth[1]).encode()).decode('ascii') if auth else None

    def safe_text(value):
        text = str(value)
        if auth:
            for credential in (auth[0], auth[1], encoded):
                text = text.replace(credential, '[REDACTED]')
        return text

    try:
        if auth:
            connection.request('GET', path, headers={'Authorization': 'Basic ' + encoded})
        else:
            connection.request('GET', path)
        response = connection.getresponse()
        body = safe_text(response.read(65536).decode('utf-8', errors='replace'))
        diagnostic.update(status=response.status, body=bounded_text(body))
        if not 200 <= response.status < 300:
            return None
        parsed = json.loads(body)
        return parsed if isinstance(parsed, dict) and parsed.get('status') == 'UP' else None
    except (OSError, ValueError, http.client.HTTPException) as error:
        diagnostic['error'] = bounded_text(safe_text(type(error).__name__ + ': ' + str(error)))
        return None
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True, help='explicit fixture config overlay directory')
    parser.add_argument('--kind', choices=('server', 'native'), required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--ready-pattern', required=True)
    parser.add_argument('--http-path', default='/actuator/health', help='loopback health path requiring 2xx JSON status UP')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--timeout', type=int, default=120)
    parser.add_argument('--settle-seconds', type=int, default=10)
    args = parser.parse_args()
    if not args.archive.is_file() or not args.config.is_dir():
        parser.error('archive file and fixture config directory must exist')
    if not 0 < args.port < 65536 or args.timeout <= 0 or args.settle_seconds < 0:
        parser.error('invalid port or timeout')
    if not args.http_path.startswith('/') or args.http_path.startswith('//'):
        parser.error('http-path must be a local absolute path')
    if not shutil.which('lsof'):
        parser.error('lsof is required for child-PID-specific readiness')
    try:
        credentials = smoke_credentials()
    except ValueError as error:
        parser.error(str(error))
    pattern = re.compile(args.ready_pattern)
    # Fail before launch if the requested loopback port is already occupied.
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1', args.port))
    args.output_dir.mkdir(parents=True, exist_ok=False)
    log = args.output_dir.resolve() / 'runtime.log'
    with tempfile.TemporaryDirectory(prefix='installation with spaces ', dir=args.output_dir.resolve()) as temporary:
        home = extract_package(args.archive.resolve(), Path(temporary))
        shutil.copytree(args.config.resolve(), home / 'config', dirs_exist_ok=True)
        command = command_for(home, args.kind) + [
            '--spring.profiles.include=smoke', '--server.address=127.0.0.1', '--server.port=' + str(args.port)]
        env = dict(os.environ)
        env.pop('BASH_ENV', None)
        env.pop('HERTZBEAT_SMOKE_USERNAME', None)
        env.pop('HERTZBEAT_SMOKE_PASSWORD', None)
        with log.open('w') as output:
            child = subprocess.Popen(command, cwd=Path(temporary), env=env, stdout=output, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + args.timeout
                ready_since = None
                diagnostic = {'readiness': {'error': 'not attempted'}, 'http': {'error': 'not attempted: PID readiness not established'}}
                persist_diagnostics(args.output_dir, diagnostic)
                while time.monotonic() < deadline:
                    if child.poll() is not None:
                        raise RuntimeError('runtime exited with status ' + str(child.returncode))
                    try:
                        readiness = subprocess.run(['bash', '-c',
                            '. "$1"; APP_PID="$2"; SERVER_PORT="$3"; READINESS_TOOL=lsof; listener_ready',
                            'packaged-readiness', str(home / 'bin/lifecycle.sh'), str(child.pid), str(args.port)],
                            env=env, capture_output=True, text=True, timeout=5)
                        ready = readiness.returncode == 0
                        diagnostic['readiness'] = {'returncode': readiness.returncode, 'stderr': bounded_text(readiness.stderr)}
                        if not ready:
                            # The installed helper suppresses lsof stderr; capture the same owned query for diagnosis.
                            probe = subprocess.run(['lsof', '-t', '-a', '-p', str(child.pid),
                                                    '-iTCP:' + str(args.port), '-sTCP:LISTEN'],
                                                   env=env, capture_output=True, text=True, timeout=5)
                            diagnostic['readiness'].update(lsof_returncode=probe.returncode,
                                                           stdout=bounded_text(probe.stdout),
                                                           lsof_stderr=bounded_text(probe.stderr))
                    except (OSError, subprocess.TimeoutExpired) as error:
                        ready = False
                        diagnostic['readiness'] = {'error': bounded_text(type(error).__name__ + ': ' + str(error))}
                    health = health_response(args.port, args.http_path, diagnostic['http'], credentials) if ready else None
                    pattern_matched = bool(pattern.search(log.read_text(errors='replace')))
                    diagnostic['log_pattern_matched'] = pattern_matched
                    persist_diagnostics(args.output_dir, diagnostic)
                    if health is not None and pattern_matched:
                        if ready_since is None:
                            ready_since = time.monotonic()
                        if time.monotonic() - ready_since >= args.settle_seconds:
                            (args.output_dir / 'http-response.json').write_text(json.dumps(health) + '\n')
                            print('Package smoke passed; HTTP ' + args.http_path + ' status UP; owned PID=' + str(child.pid) + '; log=' + str(log))
                            return
                    else:
                        ready_since = None
                    time.sleep(1)
                raise TimeoutError('package readiness timed out; log=' + str(log) + '; diagnostics=' + str(args.output_dir / 'diagnostics.json'))
            finally:
                if child.poll() is None:
                    child.terminate()
                try:
                    child.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait(timeout=5)


if __name__ == '__main__':
    main()
