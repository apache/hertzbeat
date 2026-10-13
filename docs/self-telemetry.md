<!--
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Self telemetry sources

`source=external` remains the default for existing clients and historical mixed data. No historical data is moved or classified by `service.name`. With self telemetry disabled, existing internal SDK exporters retain their configured route.

To isolate new internal telemetry, operators first provision a distinct Greptime database (suggested name: `hertzbeat_self`) and grant the existing configured Greptime account the required permissions. HertzBeat does not create databases or grant permissions. Configure:

```yaml
warehouse:
  store:
    greptime:
      self:
        enabled: true
        database: hertzbeat_self
        workspace-id: your-authorized-workspace
```

The existing endpoint and credentials are reused. Initialization validates the already provisioned database, then prepares `hertzbeat_logs`, the actual SDK/query target `hzb_traces`, and the log pipeline there. Both schemas and their query projections are validated after CREATE and before readiness. Existing incompatible self tables are inspected without ALTER, DDL, or pipeline updates; operators must explicitly plan an upgrade. Invalid identifiers, equal external/self databases, or absent workspace configuration leave self unavailable with `CONFIGURATION_INVALID`. An unavailable database leaves self queries unavailable; writers never fall back to the external database. A startup schema failure requires correcting configuration/storage and restarting. Optional local `hertzbeat.observability.otel.trace-ingress` cannot be combined with self routing: self remains disabled with `TRACE_INGRESS_CONFLICT`; disable ingress before enabling self.

Internal SDK logs and spans carry the configured workspace resource attribute and fixed self database headers. The Micrometer bridge sends real finite gauge values and cumulative counters every 30 seconds, with at most 512 series and 32 labels per sample. It does not map timers, distributions, or histograms. It uses a dedicated HTTP client and does not recursively log export errors. Failed exports are retried on the next interval without permanently disabling schema readiness. Metrics status distinguishes missing registry, unavailable schema, and failed export; an enabled empty registry is not a claim that measurements have been persisted.

The self source requires administrator authorization and the configured workspace. Database names are never taken from request parameters or OTLP payloads. Source identity is selected by the trusted server route, not by resource attributes or service names.
