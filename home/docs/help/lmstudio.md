---
id: lmstudio
title: Monitoring LM Studio
sidebar_label: LM Studio
keywords: [ open source monitoring system, open source network monitoring, LM Studio monitoring, local LLM monitoring ]
---

### Prerequisites

> Ensure that the LM Studio server is running and the REST API is enabled.
> By default, LM Studio listens on `localhost:1234`.

### Notes

> 1. HertzBeat needs network access to the LM Studio server. Ensure the target host and port are reachable.
> 2. By default, LM Studio does not require authentication for API requests. To enable authentication so that only
     requests with a valid API Token are accepted, toggle the switch in the Developers Page > Server Settings.

### Configuration Parameters

| Parameter Name    | Parameter Description                                                                          |
|:------------------|:-----------------------------------------------------------------------------------------------|
| Target Host       | The IP address or domain of the LM Studio server. Default: `localhost`.                        |
| Port              | The port of the LM Studio REST API. Default: `1234`.                                           |
| HTTPS             | Whether to enable HTTPS.                                                                       |
| API Token         | The API token for authentication (optional, required if API auth is enabled in LM Studio).     |
| Task Name         | Identify the name of this monitoring, ensuring uniqueness.                                     |
| Collector         | Configure which collector to use for scheduling collection for this monitoring.                |
| Monitoring Period | Interval time for periodic data collection, in seconds, with a minimum interval of 30 seconds. |
| Bound Tags        | Tags for managing classification of monitoring resources.                                      |
| Description       | Additional identification and description for this monitoring, users can leave remarks here.   |

### Collection Metrics

#### Metric Set: Models

| Metric Name        | Metric Unit | Metric Description                       |
|--------------------|-------------|------------------------------------------|
| Model Key          | None        | Unique model identifier                  |
| Display Name       | None        | Human-readable model name                |
| Model Type         | None        | Model category: llm or embedding         |
| Publisher          | None        | Model creator identifier                 |
| Architecture       | None        | Model architecture (e.g., gemma3, llama) |
| Quantization       | None        | Quantization method (e.g., Q4_0, F16)    |
| Quantization Bits  | None        | Bits per weight for quantization         |
| Model Size         | MB          | Model file size                          |
| Parameters         | None        | Parameter count (e.g., 7B, 270M)         |
| Max Context Length | None        | Maximum token context window             |
| Format             | None        | Model file format (gguf, mlx)            |
