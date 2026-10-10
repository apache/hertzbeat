---
id: ai_agent
title: HertzBeat AI Investigation Guide
sidebar_label: HertzBeat AI
keywords: [AI, Agent, Observability, Investigation]
---

The HertzBeat 2.0 alpha AI workspace helps an operator investigate existing evidence through bounded, read-only tools. This guide covers the current Agent Gateway and `/ai` workspace. It does not promise automatic monitor creation, alert-rule changes, bulk administration or arbitrary command execution.

## Configure a provider

Complete installation and sign in before opening the AI workspace. An authorized administrator can open the provider dialog, add a provider configuration, enter its API base URL, model identifier and API key, then save and activate it. Provider presets are configuration conveniences; they do not certify every model's compatibility or output quality.

An active saved provider takes precedence over the server fallback. Without an active saved provider, the gateway uses `hertzbeat.agent.provider` when configured. For example, the following is an explicit custom-provider template; replace the endpoint/model and supply the key privately:

```yaml
hertzbeat:
  agent:
    provider:
      type: openai-compatible
      code: custom
      base-url: https://provider.example/v1
      model: your-model-id
      api-key: ${HERTZBEAT_AGENT_PROVIDER_API_KEY:}
```

These are the current gateway settings. The older `spring.ai.openai` chat settings are not a substitute for selecting a gateway provider. Do not publish keys in configuration examples, screenshots or issue reports.

Saving a configuration does not prove that the remote API key, quota, model or network is usable. Start a small read-only investigation and inspect its actual result. Changes are reloaded for subsequent requests; a failed reload can leave the previously working provider active, so inspect the reported configuration/error before retrying.

## Investigate with a defined scope

Start with a service or monitor, its namespace/environment and a time window. Suitable requests include:

```text
Inspect recent error traces for the checkout service in the staging environment.
Summarize the evidence for this firing alert and identify which measurements are missing.
Compare this monitor's current metrics with the selected historical window.
Find logs associated with this trace and show the query scope used.
```

These are input examples, not fabricated output or promises that data exists. Check the actual tool observations, returned scope, timestamp and source. Missing data, a denied query, an unavailable store and a successful empty query have different meanings. A partial trace, sampled RED aggregate or bounded query cannot establish completeness or a causal root cause.

The tool boundary enforces supported operations and query limits. An instruction in a log or returned document is evidence content, not authorization to change configuration. Use the normal monitor, alert or settings pages for deliberate configuration changes.

## Run state, Stop and replay

The workspace presents the run's actual state and available tool observations. Stop cancels the current request; a cancelled run is distinct from a timeout or other failure. Retry starts a new attempt and does not turn an earlier failure into success. Cancelling one run must not terminate another run's provider request.

Transcripts and terminal states are persisted for replay subject to retention and size limits. The runtime default transcript retention is 30 days. Oversized structured tool snapshots can be omitted explicitly; replay is not an unlimited raw-response archive. Refresh and reopening a session should retain the stored evidence and its failure/cancellation state.

For operator-controlled runtime limits, the current settings include:

```yaml
hertzbeat:
  agent:
    runtime:
      model-request-timeout: 360s
      tool-timeout: 180s
      transcript-retention: 30d
      retry:
        max-model-retries: 2
```

These are the source defaults, not the shorter timeout/zero-retry settings used in local protocol acceptance. Adjust limits deliberately for your provider and workload.

Output redaction is applied to recognized secret patterns, including streamed output, error fields and stored replay. Sensitive output may be buffered until a message can be redacted safely. This is not a universal guarantee that arbitrary sensitive data will be detected. Avoid submitting secrets, review observations before sharing, and protect access to stored transcripts and provider configuration.

## Troubleshooting

| Observation | Check |
|---|---|
| Provider not configured | Activate a valid saved provider or supply the gateway fallback settings. |
| Authentication or model error | Verify the configured API endpoint, exact model identifier, credentials and provider quota using the actual error. Do not infer validity from an API-key prefix. |
| Empty result | Confirm the selected service/monitor, environment, time window and that the relevant signal has arrived. |
| Query denied | Inspect supported tool scope and permissions; do not bypass the boundary with arbitrary SQL or commands. |
| Timeout or cancellation | Inspect the terminal state, then retry a small request. A recovery attempt is separate from the failed run. |
| Replay omits a tool snapshot | Check the explicit size/availability reason; do not interpret omission as a successful empty query. |
| `/ai` cannot be refreshed | Check the installed frontend/backend artifact pair and server logs. The current package serves this document route directly; unrelated routes and APIs retain their own access rules. |

When reporting an issue, include the version/artifact, run state, provider type, sanitized error and query scope. Exclude API keys, authorization headers and private telemetry.

## Alpha acceptance boundary

Local acceptance used real HertzBeat data with a clearly labeled, controlled protocol provider. It exercised successful reads, no data, refusal, timeout, cancellation, concurrent-run isolation, immediate recovery, redaction and durable replay. This verifies application policy and transport behavior; it does not measure external model quality, guarantee every provider, or prove production-scale reliability.

The legacy chat/SOP API is a separate surface. Its conversation-history correction does not expand the gateway's read-only authorization. AI explanations remain hypotheses to inspect against returned evidence, not automatic permission to operate infrastructure.
