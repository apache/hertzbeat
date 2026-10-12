---
id: ollama
title: Ollama monitoring
sidebar_label: Ollama monitoring
---

This is the existing **Agentless Ollama monitor**. It reads service/model metadata and is separate from OTel application instrumentation or AI Gateway provider configuration.

## Configure the monitor

Choose Ollama in the monitor creation catalog. Set a host reachable from the selected collector, the port (template default `11434`) and the matching TLS setting. If your endpoint or access proxy requires a Bearer credential, the optional **API Key** field supplies it. This field does not create authentication in an otherwise unauthenticated service.

Run detection before saving, then inspect a fresh current sample after a configured collection interval. A collector container cannot reach another container through its own loopback address. Limit network access according to your deployment and keep keys out of public diagnostics.

## Source-backed collection contract

The template `hertzbeat-manager/src/main/resources/define/app-ollama.yml` issues three GET requests:

| Metric group | Endpoint | Evidence |
|---|---|---|
| `version_info` | `/api/version` | Service version; priority-zero availability check |
| `models` | `/api/tags` | Installed model names, sizes and descriptive metadata |
| `running_models` | `/api/ps` | Currently loaded model rows, size/VRAM fields and expiry |

The model-list and running-model contracts are described in the official [tags](https://docs.ollama.com/api/tags) and [ps](https://docs.ollama.com/api/ps) references. HertzBeat reads those rows; it does not load or download a model. Template size fields are converted from bytes to MB. Empty running-model rows do not imply a failed service, and missing fields are not measured zeroes.

## Diagnose missing results

Version collection must succeed before later metric groups run. Distinguish connection/TLS failures, authentication failures, incompatible response shapes and a valid empty model list. Compare returned fields with the template for your server version. These groups do not measure inference error rate, request latency, model quality or complete memory utilization.

A real Ollama deployment was not part of this alpha's MySQL/Java intake acceptance. This guide records the implemented template and expected upstream shape, not a verified-version matrix. Record actual detection/current samples for your deployment. Use the separate [AI Gateway guide](./ai_agent.md) if you want to configure a model provider.
