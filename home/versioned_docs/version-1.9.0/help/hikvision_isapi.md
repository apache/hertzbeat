---
id: hikvision_isapi
title: Monitor Hikvision ISAPI
sidebar_label: Hikvision ISAPI
keywords: [ monitor, hikvision_isapi ]
---

> Monitor Hikvision devices through ISAPI interface to collect health data.

## Monitor Configuration

| Parameter | Description |
| ----------- | ----------- |
| Host | The IP or domain name of the monitored device. Note⚠️ Do not include protocol prefix (eg: https://, http://). |
| Name | The unique name that identifies this monitor. |
| Port | Network request port, default is 80. |
| Timeout | Timeout period, in milliseconds, default is 5000ms. |
| Username | Login username for Hikvision device. |
| Password | Login password for Hikvision device. |
| SSL | Whether to enable HTTPS, disabled by default. |
| Collection Interval | The interval time for periodic data collection, in seconds. The minimum interval is 30 seconds. |

## Metrics

### System Info

- Device Name
- Device ID
- Firmware Version
- Device Model
- Mac Address

### Status

- CPU Utilization (%)
- Memory Usage (MB)
- Memory Available (MB)
- Cache Size (MB)
- Net Port 1 Speed (Mbps)
- Net Port 2 Speed (Mbps)
- Boot Time
- Device Uptime
- Last Calibration Time
- Last Calibration Time Diff (s)
- Avg Upload Time (ms)
- Max Upload Time (ms)
- Min Upload Time (ms)
- Last Calibration Mode
- Last Calibration Address
- Response Time (ms)

## Implementation Principle

The monitoring is implemented by accessing the Hikvision device's ISAPI interface:

1. Collect system information through: `/ISAPI/System/deviceInfo`

2. Collect device status through: `/ISAPI/System/status`

It uses HTTP protocol with Digest Authentication to access the interfaces and parses XML response data to extract monitoring metrics.
