---
id: nvidia  
title: NVIDIA Monitoring  
sidebar_label: NVIDIA Monitoring  
keywords: [Open Source Monitoring System, NVIDIA Monitoring]
---

> Collect and monitor general performance metrics of NVIDIA operating systems.
> NVIDIA monitoring requires the nvidia-smi command, which is installed together with the NVIDIA GPU driver. So when monitoring NVIDIA, we need to install the NVIDIA GPU driver.

### Configuration Parameters

| Parameter Name   | Description                                                 |
|------------------|-------------------------------------------------------------|
| Monitoring Host  | The IP address (IPv4/IPv6) or domain name of the monitored endpoint. Note ⚠️ do not include protocol headers (e.g., https://, http://). |
| Task Name        | The name identifying this monitoring task, which needs to be unique. |
| Port             | The port exposed for Linux SSH, default is 22.               |
| Username         | SSH connection username, optional.                           |
| Password         | SSH connection password, optional.                           |
| Collection Interval | Interval for periodically collecting monitoring data, in seconds. The minimum interval is 30 seconds. |
| Probe Before Monitoring | Whether to probe the monitoring endpoint to check its availability before adding it. Monitoring is added or modified only if the probe succeeds. |
| Description/Remarks | Additional notes and descriptions for this monitoring task. Users can add relevant information here. |

### Collected Metrics

#### Metric Set: basic

| Metric Name            | Unit   | Description      |
|------------------------|--------|------------------|
| index                  | None   | GPU index        |
| name                   | None   | GPU name         |
| utilization.gpu[%]     | None   | GPU utilization  |
| utilization.memory[%]  | None   | Memory utilization |
| memory.total[MiB]      | MiB    | Total memory     |
| memory.used[MiB]       | MiB    | Used memory      |
| memory.free[MiB]       | MiB    | Free memory      |
| temperature.gpu        | None   | GPU temperature  |
