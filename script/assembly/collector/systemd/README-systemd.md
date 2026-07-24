<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements. See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# Hybrid Collector systemd lifecycle

The Linux native archive includes a systemd unit and a lifecycle installer. It
runs the Collector as the unprivileged `hertzbeat` account and separates
immutable releases from persistent state:

- `/opt/hertzbeat-collector/releases/<release>` contains versioned binaries.
- `/opt/hertzbeat-collector/current` points to the active release.
- `/etc/hertzbeat/config` and `/etc/hertzbeat/collector.env` contain operator
  configuration. The environment file is created with mode `0600`.
- `/var/lib/hertzbeat-collector` preserves the Collector identity, revision,
  delivery queues, and filelog offsets.
- `/var/log/hertzbeat-collector` contains local logs.

Run these commands as root from an extracted Linux native archive:

```shell
./service/install-systemd.sh install
./service/install-systemd.sh upgrade
./service/install-systemd.sh uninstall
```

`upgrade` stages and validates the new archive before stopping the active
service. If the new service cannot start, the installer restores and restarts
the previous release. `uninstall` removes the unit and binaries but preserves
configuration, identity, queues, offsets, and logs. To remove that persistent
state explicitly, run:

```shell
./service/install-systemd.sh purge
```

Place credentials only in `/etc/hertzbeat/collector.env` or the protected
configuration files. Do not pass tokens on the command line. The installer does
not print environment file contents and does not download or bundle language
agents or SDKs.
