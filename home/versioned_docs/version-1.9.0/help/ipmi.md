---
id: ipmi
title: IPMI2 Monitoring
sidebar_label: Server Monitor
keywords: [open source monitoring tool, open source server Monitoring, IPMI Monitoring]
---

> Collect and monitor the general performance Metrics of Server using IPMI2.

**Protocol: IPMI**

## Pre-monitoring steps

1. The target server supports the **IPMI2 protocol**.
2. The **BMC** (Baseboard Management Controller) has been configured with a network interface, allowing access to the **IPMI port**.
3. **User accounts** have been configured, and appropriate **permissions** have been assigned to the accounts.

These are basic checks you can follow, and for further details on enabling and configuring IPMI over LAN, you can consult the specific user manual of the server manufacturer.

## Configuration Parameters

| Parameter Name | Parameter Description                                                                                          |
| -------------- |----------------------------------------------------------------------------------------------------------------|
| Target Host    | The IPv4, IPv6, or domain name of the monitored peer. Note: without protocol header (e.g., https://, http://). |
| Port           | The port number of the server IPMI over LAN, default is 623.                                                   |
| Username       | IPMI user name                                                                                                 |
| Password       | IPMI password                                                                                                  |

### Collected Metrics

#### Metric Set: Chassis

| Metric Name          | Unit | Metric Description                                           |
| -------------------- | ---- | ------------------------------------------------------------ |
| System Power         | none | Current Power State. Power is on.                            |
| Power Overload       | none | Power overload. System shutdown because of power overload condition. |
| Power Interlock      | none | Power Interlock.                                             |
| Main Power Fault     | none | Power fault. Fault detected in main power subsystem.         |
| Power Control Fault  | none | Power control fault. Controller attempted to turn system power on or off, but systemdid not enter desired state. |
| Power Restore Policy | none | Power restore policy.                                        |
| Last Power Event     | none | Last Power Event.                                            |
| Cooling/Fan Fault    | none | Cooling/fan fault detected.                                  |
| Drive Fault          | none | Drive Fault.                                                 |
| Front-Panel Lockout  | none | Front Panel Lockout active (power off and reset via chassispush-buttons disabled.) |

#### Metric Set: Sensor

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Sensor ID      | none | Sensor ID.                                                   |
| Entity ID      | none | Indicates the physical entity that the sensor is monitoring or is otherwiseassociated with the sensor. |
| Sensor Type    | none | Sensor Type.                                                 |
| Sensor Reading | none | Current Sensor Reading.                                      |
