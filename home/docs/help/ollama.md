---
id: ollama
title: Monitoring Ollama Local LLM Service
sidebar_label: Ollama
keywords: [ Open Source Monitoring System, Open Source LLM Monitoring, Ollama Monitoring ]
---

> HertzBeat monitors Ollama local LLM service including version info, installed models and running models.

## Preparation

Ensure that Ollama is running and the API is accessible. By default, Ollama listens on port `11434`.

If Ollama is running on a remote server, you may need to set the `OLLAMA_HOST` environment variable to `0.0.0.0` to
allow external access.

### Configuration Parameters

| Parameter Name      | Parameter Description                                                                                              |
|---------------------|--------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | The target IPV4, IPV6 or domain name of the Ollama service. Note: without protocol header (eg: https://, http://). |
| Task Name           | The name that identifies this monitoring task, which must be unique.                                               |
| Port                | The port Ollama service is listening on, default is 11434.                                                         |
| SSL                 | Whether to use HTTPS to connect to the Ollama service.                                                             |
| API Key             | To directly access the API key of ollama.com.                                                                      |
| Collector           | Configure which collector is used to schedule data collection for this monitoring.                                 |
| Monitoring Interval | The interval for periodically collecting data, in seconds. The minimum interval that can be set is 30 seconds.     |
| Bound Tags          | Tags for categorizing and managing monitoring resources.                                                           |
| Description/Remarks | Additional remarks to identify and describe this monitoring. Users can add notes here.                             |

### Collection Metrics

#### Metric Set: Version Info

| Metric Name | Metric Unit | Metric Description                 |
|-------------|-------------|------------------------------------|
| Version     | None        | The version of the Ollama service. |

#### Metric Set: Installed Models

| Metric Name        | Metric Unit | Metric Description                                      |
|--------------------|-------------|---------------------------------------------------------|
| Model Name         | None        | The name of the installed model.                        |
| Model Size         | MB          | The size of the model file.                             |
| Parameter Size     | None        | The parameter scale of the model (e.g., 7B, 13B).       |
| Quantization Level | None        | The quantization level of the model (e.g., Q4_0, Q8_0). |
| Model Family       | None        | The model family (e.g., llama, qwen).                   |
| Format             | None        | The model format (e.g., gguf).                          |
| Modified At        | None        | The last modified time of the model.                    |

#### Metric Set: Running Models

| Metric Name | Metric Unit | Metric Description                                    |
|-------------|-------------|-------------------------------------------------------|
| Model Name  | None        | The name of the running model.                        |
| Model Size  | MB          | The size of the model in memory.                      |
| VRAM Size   | MB          | The VRAM occupied by the model.                       |
| Expires At  | None        | The time when the model will be unloaded from memory. |
