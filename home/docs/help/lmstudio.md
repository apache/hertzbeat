---
id: lmstudio
title: LM Studio monitoring
sidebar_label: LM Studio monitoring
---

This guide describes the existing **Agentless monitor template** for LM Studio model metadata. It does not configure LM Studio as an AI Gateway provider, instrument inference requests or establish model quality/performance.

## Configure the monitor

1. Start the LM Studio HTTP service and verify that it is reachable **from the selected HertzBeat collector**. A collector running in another host or container has its own `localhost`.
2. Select LM Studio in the monitor creation catalog. Set **Host**, **Port** (template default `1234`) and **HTTPS** to match that service.
3. If the endpoint requires authentication, set the monitor's **API Token**. The template uses Bearer authentication. Keep credentials in protected configuration and out of screenshots and diagnostic exports.
4. Run the form's detection, inspect the returned model fields, then save. Recheck current samples after at least one configured collection interval.

The source template `hertzbeat-manager/src/main/resources/define/app-lmstudio.yml` sends `GET /api/v1/models` and reads `models`. The matching upstream contract is documented in [LM Studio's model-list API](https://lmstudio.ai/docs/developer/rest/list). An older or different endpoint is not automatically compatible with this template.

## What the rows mean

The template exposes model key, display name, type, publisher, architecture, quantization, model size, parameter description, maximum context length and format. Model size is converted from bytes to MB by the monitor configuration. Optional or absent model fields must not be read as measured zeroes. This is an inventory response, not per-request latency, token throughput or GPU utilization.

## Diagnose an unsuccessful collection

Check host reachability and the exact port/protocol before changing credentials. A `401`/`403` response requires an authentication/permission correction; it is not an empty model list. For a parsing failure, compare the endpoint and response field names with the source template. An empty `models` array can be valid when there are no available models; it does not prove inference availability.

This alpha acceptance validated the Agentless MySQL and OTel Java paths, not a real LM Studio installation. The template and upstream API were reviewed; test your LM Studio version and retain the actual result before treating it as a verified source. For provider setup, use the separate [AI Gateway guide](./ai_agent.md).
