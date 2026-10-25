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

"""Offline launcher contracts: commands/signals are fixtures, never host discovery."""
import json
import os
import re
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
ARROW = '--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED'


class ReleaseScripts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='hertzbeat-scripts-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.home = self.root / ('installation' if self._testMethodName.startswith('test_plain_installation_') else 'installation with spaces')
        self.bin = self.home / 'bin'
        self.bin.mkdir(parents=True)
        (self.home / 'logs').mkdir()
        (self.home / 'config').mkdir()
        self.fake = self.root / 'fake-bin'
        self.fake.mkdir()
        for name in ('bash', 'dirname', 'mkdir', 'cat', 'rm', 'nohup', 'grep', 'awk', 'head', 'wc', 'seq', 'date', 'which'):
            executable = shutil.which(name)
            if executable:
                (self.fake / name).symlink_to(executable)
        self.state = self.root / 'state.json'
        self.state.write_text('{}')
        self.signals = self.root / 'signals'
        self.capture = self.root / 'capture.json'
        stub = '''import json,os,sys,time,signal
from pathlib import Path
state=Path(os.environ['STATE']); records=json.loads(state.read_text()); args=sys.argv[1:]; name=Path(sys.argv[0]).name
if name=='ps':
 if os.environ.get('PS_ERROR')=='1': sys.exit(2)
 if '-p' in args:
  item=records.get(args[args.index('-p')+1]); field=args[-1]
  if item and item.get('query_error'): sys.exit(2)
  if item: print(item['birth'] if 'lstart' in field else item['cmd'])
  sys.exit(0 if item else 1)
 for pid,item in records.items():
  command=item.get('snapshot_cmd',item['cmd'])
  print(('fixture '+pid+' 1 0 00:00 ? 00:00:00 ' if '-ef' in args or '-f' in args else pid+' ')+command)
elif name=='fakekill':
 pid=args[-1]; item=records.get(pid)
 if args[0]=='-0':
  if item: sys.exit(0)
  print('kill: No such process',file=sys.stderr); sys.exit(1)
 with open(os.environ['SIGNALS'],'a') as f: f.write(' '.join(args)+'\\n')
 if os.environ.get('DENY')=='1': sys.exit(1)
 if os.environ.get('QUERY_CHANGE')=='1' and args[0]=='-TERM':
  records[pid]['query_error']=True; state.write_text(json.dumps(records)); sys.exit(0)
 if os.environ.get('CHANGE')=='1' and args[0]=='-TERM':
  records[pid]['birth']='reused'; state.write_text(json.dumps(records)); sys.exit(0)
 if os.environ.get('KEEP')!='1':
  targets=args[1:] if args[0].startswith('-') else args
  for target in targets: records.pop(target,None)
  state.write_text(json.dumps(records))
 sys.exit(0 if item else 1)
elif name=='lsof':
 if os.environ.get('READY')=='other': print('9999')
 if os.environ.get('READY')=='1':
  for pid in records:
   if '-p' not in args or args[args.index('-p')+1]==pid: print(pid)
elif name in ('ss','netstat'):
 if '--version' in args: sys.exit(0)
 if os.environ.get('READY')=='1':
  for pid in records:
   port=os.environ['PORT']
   print('LISTEN 0 128 0.0.0.0:'+port+' 0.0.0.0:* users:((java,pid='+pid+',fd=7))' if name=='ss' else 'tcp 0 0 0.0.0.0:'+port+' 0.0.0.0:* LISTEN '+pid+'/java')
elif name=='sleep': time.sleep(0.2)
elif name in ('java','collector-native'):
 if os.environ.get('TRAP_TERM')=='1':
  def terminated(signum,frame):
   Path(os.environ['CAPTURE']+'.term').write_text('TERM'); sys.exit(143)
  signal.signal(signal.SIGTERM,terminated)
 Path(os.environ['CAPTURE']).write_text(json.dumps({'args':args,'pid':os.getpid(),'cwd':os.getcwd(),'executable':sys.argv[0]}))
 if os.environ.get('EXIT')=='1': sys.exit(42)
 command=('java ' if name=='java' else str(Path(sys.argv[0]).resolve())+' ')+' '.join(args)
 records[str(os.getpid())]={'cmd':command,'birth':'fixture child'};state.write_text(json.dumps(records))
 time.sleep(3)
'''
        for name in ('ps', 'fakekill', 'lsof', 'sleep', 'java'):
            f = self.fake / name
            f.write_text(f'#!{sys.executable}\n' + stub)
            f.chmod(0o755)
        self.native = self.home / 'collector-native'
        self.native.write_text(f'#!{sys.executable}\n' + stub)
        self.native.chmod(0o755)
        self.hook = self.root / 'bash-env'
        self.hook.write_text('kill() { command fakekill "$@"; }\n')
        self.env = dict(os.environ, PATH=str(self.fake), BASH_ENV=str(self.hook),
                        STATE=str(self.state), SIGNALS=str(self.signals), CAPTURE=str(self.capture),
                        HERTZBEAT_START_TIMEOUT='2', HERTZBEAT_STOP_TIMEOUT='1', READY='1')
        self.env.pop('JAVA_OPTS', None)

    def install(self, kind):
        self.env['PORT'] = '1157' if kind == 'server' else '1159'
        source = ROOT / ('script/assembly/server/bin' if kind == 'server' else 'script/assembly/collector/bin-native')
        for f in source.glob('*.sh'):
            body = f.read_text().replace('${project.artifactId}', 'hertzbeat-fixture').replace('${project.build.finalName}', 'collector-native' if kind == 'native' else 'server-fixture').replace('${java.version}', '25')
            target = self.bin / f.name
            target.write_text(body)
            target.chmod(0o755)

    def run_script(self, name, *args, **env):
        process = subprocess.Popen(['bash', str(self.bin / name), *args], cwd=self.root,
                                   env=dict(self.env, **env), stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, start_new_session=True)
        try:
            output, _ = process.communicate(timeout=5)
            return process.returncode, output, process.pid
        finally:
            # This process group was created above; no host PID or port search.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    def record(self, pid, kind, suffix='', birth='fixture'):
        config = f'{self.home}{suffix}/config/'
        command = (f'java -Dspring.config.location={config} -cp {self.home}{suffix}/server-fixture.jar:{self.home}{suffix}/lib/*:{self.home}{suffix}/ext-lib/* org.apache.hertzbeat.startup.HertzBeatApplication'
                   if kind == 'server' else f'{self.home}{suffix}/collector-native --spring.config.location={config}')
        records = json.loads(self.state.read_text())
        records[str(pid)] = {'cmd': command, 'birth': birth}
        self.state.write_text(json.dumps(records))

    def test_plain_installation_entrypoint_control(self):
        self.install('server')
        self.assertNotIn(' ', str(self.home))
        code, output, _ = self.run_script('entrypoint.sh', EXIT='1')
        self.assertEqual(code, 42, output)
        args = json.loads(self.capture.read_text())['args']
        self.assertIn(ARROW, args)
        self.assertIn(f'-Dspring.config.location={self.home}/config/', args)
        self.assertIn('org.apache.hertzbeat.startup.HertzBeatApplication', args)

    def test_plain_installation_custom_options_keep_arrow(self):
        self.install('server')
        code, output, _ = self.run_script('entrypoint.sh', JAVA_OPTS='-Xmx256m', EXIT='1')
        self.assertEqual(code, 42, output)
        args = json.loads(self.capture.read_text())['args']
        self.assertIn('-Xmx256m', args)
        self.assertIn(ARROW, args)

    def test_plain_installation_multiline_java_options(self):
        self.install('server')
        code, output, _ = self.run_script('entrypoint.sh',
                                           JAVA_OPTS='-Xmx256m\n-Dcustom=yes\t-Dthird=ok', EXIT='1')
        self.assertEqual(code, 42, output)
        args = json.loads(self.capture.read_text())['args']
        for option in ('-Xmx256m', '-Dcustom=yes', '-Dthird=ok'):
            self.assertIn(option, args)

    def test_plain_installation_shutdown_control(self):
        self.assertNotIn(' ', str(self.home))
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            code, output, _ = self.run_script('shutdown.sh')
            self.assertEqual(code, 0, output)
            self.assertNotIn('4101', json.loads(self.state.read_text()))
            self.assertTrue(self.signals.exists())
            self.signals.unlink()

    def test_entrypoint_options_args_exec_and_exit(self):
        self.install('server')
        for opts in ('', '-Xmx256m -Dcustom=yes'):
            code, output, pid = self.run_script('entrypoint.sh', '--fixture=value with spaces', JAVA_OPTS=opts, EXIT='1')
            self.assertEqual(code, 42, output)
            captured = json.loads(self.capture.read_text())
            self.assertIn(ARROW, captured['args'])
            if opts:
                self.assertIn('-Xmx256m', captured['args'])
            self.assertIn('--fixture=value with spaces', captured['args'])
            self.assertEqual(captured['pid'], pid)
            self.assertIn(f'-Dspring.config.location={self.home}/config/', captured['args'])

    def test_entrypoint_preserves_bundled_java(self):
        self.install('server')
        java = self.home / 'java/bin/java'
        java.parent.mkdir(parents=True)
        java.write_text((self.fake / 'java').read_text())
        java.chmod(0o755)
        self.assertEqual(self.run_script('entrypoint.sh', EXIT='1')[0], 42)
        self.assertEqual(json.loads(self.capture.read_text())['executable'], str(java))

    def test_entrypoint_owns_term_signal(self):
        self.install('server')
        process = subprocess.Popen(['bash', str(self.bin / 'entrypoint.sh')],
                                   cwd=self.root, env=dict(self.env, TRAP_TERM='1'),
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                   text=True, start_new_session=True)
        try:
            deadline = time.monotonic() + 2
            while not self.capture.exists() and time.monotonic() < deadline:
                time.sleep(0.02)
            self.assertTrue(self.capture.exists())
            self.assertEqual(json.loads(self.capture.read_text())['pid'], process.pid)
            process.send_signal(signal.SIGTERM)
            output, _ = process.communicate(timeout=2)
            self.assertEqual(process.returncode, 143, output)
            self.assertEqual(Path(str(self.capture) + '.term').read_text(), 'TERM')
        finally:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    def test_restart_cwd_args_and_failure(self):
        for kind in ('server', 'native'):
            self.install(kind)
            (self.bin / 'shutdown.sh').write_text('#!/bin/bash\nexit 7\n')
            (self.bin / 'startup.sh').write_text('#!/bin/bash\nexit 8\n')
            self.assertEqual(self.run_script('restart.sh')[0], 7)
            (self.bin / 'shutdown.sh').write_text('#!/bin/bash\nexit 0\n')
            self.assertEqual(self.run_script('restart.sh')[0], 8)
            (self.bin / 'startup.sh').write_text('#!/bin/bash\n[ "$1" = "space value" ]\n')
            self.assertEqual(self.run_script('restart.sh', 'space value')[0], 0)

    def test_shutdown_exact_installation_and_idempotence(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            self.record(4102, kind, '-other')
            self.record(4103, kind, '/nested')
            if kind == 'server':
                self.record(4104, kind)
                state = json.loads(self.state.read_text())
                state['4104']['cmd'] = state['4104']['cmd'].replace('server-fixture.jar', 'another.jar')
                self.state.write_text(json.dumps(state))
            self.assertEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertNotIn('4101', json.loads(self.state.read_text()))
            self.assertIn('4102', json.loads(self.state.read_text()))
            self.assertIn('4103', json.loads(self.state.read_text()))
            self.assertEqual(self.run_script('shutdown.sh')[0], 0)
            self.state.write_text('{}')

    def test_shutdown_ambiguity_permission_and_bound(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            self.record(4102, kind)
            self.assertNotEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertFalse(self.signals.exists())
            self.state.write_text('{}')
            self.record(4101, kind)
            self.assertNotEqual(self.run_script('shutdown.sh', DENY='1')[0], 0)
            self.assertNotEqual(self.run_script('shutdown.sh', KEEP='1')[0], 0)
            self.assertLessEqual(len(self.signals.read_text().splitlines()), 4)
            self.signals.unlink()
            self.state.write_text('{}')

    def test_stale_or_reused_pid_is_never_signalled(self):
        for kind in ('server', 'native'):
            self.install(kind)
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            self.state.write_text(json.dumps({'4101': {'cmd': 'unrelated process', 'birth': 'later'}}))
            pidfile.write_text('4101\nearlier\n')
            self.assertIn('stopped', self.run_script('startup.sh', 'status')[1])
            self.assertEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertFalse(self.signals.exists())
            self.record(4101, kind, birth='later')
            pidfile.write_text('4101\nearlier\n')
            self.assertNotEqual(self.run_script('startup.sh', 'status')[0], 0)
            self.assertNotEqual(self.run_script('startup.sh')[0], 0)
            self.assertNotEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertTrue(pidfile.exists())
            self.assertFalse(self.signals.exists())
            self.state.write_text('{}')

    def test_identity_change_prevents_signal_escalation(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            pidfile.write_text('4101\nfixture\n')
            self.assertNotEqual(self.run_script('shutdown.sh', CHANGE='1')[0], 0)
            self.assertEqual(self.signals.read_text().splitlines(), ['-TERM 4101'])
            self.assertTrue(pidfile.exists())
            self.signals.unlink()
            self.state.write_text('{}')

    def test_start_success_args_and_failure(self):
        for kind in ('server', 'native'):
            self.install(kind)
            code, output, _ = self.run_script('startup.sh', '--fixture=value with spaces', JAVA_OPTS='-Xmx256m')
            self.assertEqual(code, 0, output)
            captured = json.loads(self.capture.read_text())
            self.assertIn('--fixture=value with spaces', captured['args'])
            if kind == 'server':
                self.assertIn(ARROW, captured['args'])
                self.assertIn('-Xmx256m', captured['args'])
            self.state.write_text('{}')
            self.assertNotEqual(self.run_script('startup.sh', EXIT='1')[0], 0)
            self.state.write_text('{}')
            self.record(4109, kind, '-other')
            self.assertNotEqual(self.run_script('startup.sh', READY='other')[0], 0)
            self.state.write_text('{}')

    def test_missing_lsof_fails_closed(self):
        (self.fake / 'lsof').unlink()
        for kind in ('server', 'native'):
            self.install(kind)
            code, output, _ = self.run_script('startup.sh')
            self.assertNotEqual(code, 0, output)
            self.assertFalse(self.capture.exists(), output)

    def test_unreadable_process_after_term_is_not_gone(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            pidfile.write_text('4101\nfixture\n')
            self.assertNotEqual(self.run_script('shutdown.sh', QUERY_CHANGE='1')[0], 0)
            self.assertTrue(pidfile.exists())
            self.assertEqual(self.signals.read_text().splitlines(), ['-TERM 4101'])
            self.signals.unlink()
            self.state.write_text('{}')

    def test_linux_readiness_fallbacks(self):
        source = (self.fake / 'lsof').read_text()
        (self.fake / 'lsof').unlink()
        for tool in ('ss', 'netstat'):
            target = self.fake / tool
            target.write_text(source)
            target.chmod(0o755)
            for kind in ('server', 'native'):
                self.install(kind)
                self.assertEqual(self.run_script('startup.sh')[0], 0)
                self.state.write_text('{}')
            target.unlink()

    def test_only_matching_unreadable_process_blocks(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            state = json.loads(self.state.read_text())
            state['4102'] = {'cmd': 'foreign process', 'birth': 'foreign', 'query_error': True}
            self.state.write_text(json.dumps(state))
            self.assertEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertIn('4102', json.loads(self.state.read_text()))
            self.signals.unlink()
            self.record(4101, kind)
            state = json.loads(self.state.read_text())
            state['4101']['query_error'] = True
            self.state.write_text(json.dumps(state))
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            pidfile.write_text('4101\nfixture\n')
            self.assertNotEqual(self.run_script('shutdown.sh')[0], 0)
            self.assertTrue(pidfile.exists())
            self.assertFalse(self.signals.exists())
            self.state.write_text('{}')

    def test_saved_unreadable_pid_with_redacted_snapshot_fails_closed(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            state = json.loads(self.state.read_text())
            state['4101'].update(query_error=True, snapshot_cmd='[redacted]')
            self.state.write_text(json.dumps(state))
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            pidfile.write_text('4101\nfixture\n')
            for script, args in (('startup.sh', ('status',)), ('startup.sh', ()), ('shutdown.sh', ())):
                code, output, _ = self.run_script(script, *args)
                self.assertNotEqual(code, 0, output)
                self.assertTrue(pidfile.exists())
                self.assertFalse(self.signals.exists())
                self.assertFalse(self.capture.exists())
            self.state.write_text('{}')

    def test_process_query_errors_preserve_pid_record(self):
        for kind in ('server', 'native'):
            self.install(kind)
            self.record(4101, kind)
            pidfile = self.home / 'logs/hertzbeat-fixture.pid'
            pidfile.write_text('4101\nfixture\n')
            self.assertNotEqual(self.run_script('shutdown.sh', PS_ERROR='1')[0], 0)
            self.assertTrue(pidfile.exists())
            self.assertFalse(self.signals.exists())
            self.state.write_text('{}')

    def test_dedicated_workflow_covers_contract_inputs(self):
        workflow = ROOT / '.github/workflows/release-script-contracts.yml'
        self.assertTrue(workflow.is_file())
        text = workflow.read_text()
        for event in ('push', 'pull_request'):
            block = re.search(r'^  ' + event + r':\n((?:^ {4,}.*\n)*)', text, re.MULTILINE)
            self.assertIsNotNone(block, event)
            self.assertIn('branches: [1.9.x-dev]', block.group(1))
            paths = re.search(r'^    paths:\n((?:^      - .*\n)*)', block.group(1), re.MULTILINE)
            self.assertIsNotNone(paths, event)
            for path in ('script/assembly/**', 'script/docker/**', 'script/tests/**', '.github/workflows/release-script-contracts.yml'):
                self.assertIn("      - '" + path + "'\n", paths.group(1))
        self.assertIn('  workflow_dispatch:', text)
        self.assertIn('python3 -m unittest discover -s script/tests', text)


class RealReadinessUtilities(unittest.TestCase):
    """Optional integration checks, restricted to a socket child created here."""

    def check_tool(self, tool):
        strict = os.environ.get('HERTZBEAT_REQUIRE_REAL_READINESS') == '1'
        if not shutil.which(tool):
            if strict:
                self.fail(tool + ' is required by strict readiness validation')
            self.skipTest(tool + ' is not installed')
        if tool == 'netstat' and subprocess.run([tool, '--version'], stdout=subprocess.DEVNULL,
                                                stderr=subprocess.DEVNULL).returncode:
            if strict:
                self.fail('Linux netstat is required by strict readiness validation')
            self.skipTest('Linux netstat is not installed')
        child = subprocess.Popen([sys.executable, '-u', '-c',
                                  'import socket,sys; a=socket.socket(); a.bind(("127.0.0.1",0)); '
                                  'a.listen(); b=socket.socket(); b.bind(("127.0.0.1",0)); '
                                  'print(a.getsockname()[1],b.getsockname()[1],flush=True); sys.stdin.read()'],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True)
        try:
            announcement = child.stdout.readline()
            self.assertTrue(announcement, child.stderr.read() if child.poll() is not None else 'listener child did not announce ports')
            port, wrong_port = announcement.split()
            helper = ROOT / 'script/assembly/server/bin/lifecycle.sh'
            env = dict(os.environ)
            env.pop('BASH_ENV', None)
            command = '. "$1"; READINESS_TOOL="$2"; APP_PID="$3"; SERVER_PORT="$4"; listener_ready'
            for pid, selected_port, expected in ((child.pid, port, 0),
                                                  (os.getpid(), port, 1),
                                                  (child.pid, wrong_port, 1)):
                result = subprocess.run(['bash', '-c', command, 'readiness-contract', str(helper),
                                         tool, str(pid), selected_port], env=env,
                                        capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode == 0, expected == 0, result.stderr)
        finally:
            # No discovered PID is signalled: only this test's child is cleaned up.
            try:
                child.communicate('', timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.communicate(timeout=5)

    def test_real_lsof_own_listener(self):
        self.check_tool('lsof')

    def test_real_ss_own_listener(self):
        self.check_tool('ss')

    def test_real_linux_netstat_own_listener(self):
        self.check_tool('netstat')


if __name__ == '__main__':
    unittest.main()
