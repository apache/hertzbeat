---
id: uniview
title: Monitor Uniview Devices
sidebar_label: Uniview 
keywords: [ monitor, uniview ]
---

> Monitor Uniview devices through HTTP interface.

## Configuration

| Parameter | Description |
| ----------- | ----------- |
| Host | Device IP/Domain |
| Name | Unique identifier |
| Port | Default 80 |
| Timeout | Milliseconds |
| Username | Auth username |
| Password | Auth password |
| SSL | HTTPS Enable |
| Interval | ≥30 seconds |

## Metrics

### System Info

- Device Name
- Serial Number
- Firmware Version
- Device Model

### NTP Info

- NTP Server IP
- NTP Port
- Sync Interval
- NTP Status

## Implementation

Access device APIs:

1. System: `/LAPI/V1.0/System/DeviceInfo`

2. NTP: `/LAPI/V1.0/System/Time/NTP`

Using Digest Authentication and parsing JSON responses.
