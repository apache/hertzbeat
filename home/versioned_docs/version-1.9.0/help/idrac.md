---
id: idrac
title: Dell iDRAC Monitoring
sidebar_label: Server Monitor
keywords: [open source monitoring tool, open source server Monitoring, Dell iDRAC Monitoring]
---

> Collect and monitor the general performance Metrics of Dell Server using SNMP Protocol.

**Protocol: SNMP**

## Pre-monitoring steps

1. The target Dell server supports the **SNMP protocol**.
2. The **iDRAC** (Integrated Dell Remote Access Controller) has been configured with a network interface, allowing access to the **SNMP port**.
3. **SNMP community string** or **user credentials** have been configured with appropriate **permissions**.

These are basic checks you can follow, and for further details on enabling and configuring SNMP on Dell iDRAC, you can consult the specific user manual of the Dell server.

## Configuration Parameters

| Parameter Name | Parameter Description                                                                                          |
| -------------- |----------------------------------------------------------------------------------------------------------------|
| Target Host    | The IPv4, IPv6, or domain name of the monitored peer. Note: without protocol header (e.g., https://, http://). |
| Port           | The port number of the server SNMP, default is 161.                                                    |
| SNMP Version   | Choose between SNMPv1, SNMPv2c, or SNMPv3                                                                  |
| SNMP Community | SNMP community for v1 v2c                                                                                  |
| Username       | SNMP username for v3                                                                                       |
| Context Name   | SNMP contextName for v3                                                                                    |
| Auth Password  | SNMP authPassword for v3                                                                                   |
| Auth Encryption| Authentication encryption method for v3 (MD5 or SHA1)                                                       |
| Priv Password  | SNMP privPassphrase for v3                                                                                 |
| Priv Encryption| Privacy encryption method for v3 (DES or AES128)                                                            |

### Collected Metrics

#### Metric Set: System Status

| Metric Name             | Unit | Metric Description                                           |
| ----------------------- | ---- | ------------------------------------------------------------ |
| Global System Status    | none | Overall status of the system                                 |
| System LCD Status       | none | Status of the system LCD                                     |
| Global Storage Status   | none | Overall status of the storage subsystem                      |
| System Power State      | none | Current power state of the system                            |
| System Power Up Time    | day  | Time since the system was last powered on                    |

#### Metric Set: Power Supply

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the power supply                                    |
| Name           | none | Name/Location of the power supply                            |
| Wattage        | W    | Output wattage of the power supply                           |
| Type           | none | Type of the power supply (Linear, Switching, Battery, etc.)  |
| Status         | none | Current status of the power supply                           |

#### Metric Set: Cooling Devices

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the cooling device                                  |
| Name           | none | Name/Location of the cooling device                          |
| Type           | none | Type of the cooling device (Fan, Blower, Heat Pipe, etc.)    |
| Reading        | RPM  | Current rotation per minute reading                          |
| Status         | none | Current status of the cooling device                         |

#### Metric Set: Temperature Sensors

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the temperature sensor                              |
| Name           | none | Name/Location of the temperature sensor                      |
| Reading        | °C   | Current temperature reading                                  |
| Status         | none | Current status of the temperature sensor                     |

#### Metric Set: Voltage Sensors

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the voltage sensor                                  |
| Name           | none | Name/Location of the voltage sensor                          |
| Reading        | V    | Current voltage reading                                      |
| Type           | none | Type of voltage (3.3V, 5V, 12V, etc.)                        |
| Status         | none | Current status of the voltage sensor                         |

#### Metric Set: Memory Devices

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the memory device                                   |
| Name           | none | Name/Location of the memory device                           |
| Type           | none | Type of memory (DDR, DDR2, DDR3, DDR4, etc.)                 |
| Size           | G    | Size of the memory device                                    |
| Status         | none | Current status of the memory device                          |

#### Metric Set: Processors

| Metric Name    | Unit | Metric Description                                           |
| -------------- | ---- | ------------------------------------------------------------ |
| Index          | none | Index of the processor                                       |
| Name           | none | Name/Location of the processor                               |
| Speed          | MHz  | Current speed of the processor                               |
| Family         | none | Family of the processor (Pentium, Xeon, Core i7, etc.)       |
| Status         | none | Current status of the processor                              |
