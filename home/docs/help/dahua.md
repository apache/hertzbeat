---
id: dahua
title: Monitor Dahua Devices
sidebar_label: Dahua
keywords: [ monitor, dahua ]
---

> Monitor Dahua devices through HTTP interface to collect health data.

## Configuration

| Parameter | Description |
| ----------- | ----------- |
| Host | Target IP/Domain |
| Name | Unique monitor name |
| Port | Network port (default 80) |
| Timeout | Request timeout in ms |
| Username | Device username |
| Password | Device password |
| SSL | Enable HTTPS |
| Interval | Collection interval (≥30s) |

## Metrics

### Network Info

- Default Interface
- Domain Name
- Hostname
- eth0 IP Address
- eth0 Gateway  
- eth0 MAC
- eth0 Subnet Mask
- eth0 MTU
- DNS Servers

### User Info

- Client Address
- Username
- Login Type
- Login Time

### NTP Info

- NTP Server
- NTP Port
- Sync Interval

## Implementation

Access device APIs via:

1. Network: `/cgi-bin/configManager.cgi?action=getConfig&name=Network`

2. Users: `/cgi-bin/userManager.cgi?action=getActiveUserInfoAll`

3. NTP: `/cgi-bin/configManager.cgi?action=getConfig&name=NTP`

Using Digest Auth and parsing config format responses.
