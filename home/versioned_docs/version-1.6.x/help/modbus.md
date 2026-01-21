---
id: modbus
title: Monitoring Modbus
sidebar_label: Modbus Monitor
keywords: [ open source monitoring tool, Modbus monitoring ]
---

> The response of Modbus service and other related indicators are monitored.

### Configuration Parameters

| Parameter Name           | Parameter Help Description                                                                                                                 |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Host of Modbus Service   | The IPv4, IPv6, or domain name of the Modbus device to be monitored. Note ⚠️ do not include the protocol header (e.g., https://, http://). |
| Task Name                | A name that identifies this monitoring task; the name must be unique.                                                                      |
| Port                     | The port used for Modbus network communication.                                                                                            |
| Slave ID (slaveId)       | The ID of the slave device in the Modbus network.                                                                                          |
| Holding Register Address | Used for categorizing and managing monitored resources.                                                                                    |
| Coil Register Address    | Additional notes and descriptions for this monitoring task; users can add remarks here.                                                    |
| Timeout                  | The allowed time for collecting a response.                                                                                                |

### Collected Metrics

#### Metric Set: holding-register

1. The number of parameters must match the total number of coil register addresses specified in the parameters.
2. Alias format for parameters: holding-register:m or holding-register:m-n

Parameter example:

Coil register addresses:  

```text
1,2[3]
```

Parameter alias names:

```yaml
aliasFields:
  - responseTime
  - holding-register:0
  - holding-register:1-0
  - holding-register:1-1
  - holding-register:1-2
```

| Metric Name                | Metric Unit  | Metric Help Description                                         |
|----------------------------|--------------|-----------------------------------------------------------------|
| Response Time              | Milliseconds | The time required by the Modbus server to respond to a request. |
| Holding Register Parameter |              | Setpoint for analog output                                      |

#### Metric Set: coil

1. The number of parameters must match the total number of coil register addresses specified in the parameters.
2. Alias format for parameters: coil:m or coil:m-n

Parameter example:  

Coil register addresses:  

```text
1,2[3]
```

Parameter alias names:

```yaml
aliasFields:
  - responseTime
  - coil:0
  - coil:1-0
  - coil:1-1
  - coil:1-2
```

| Metric Name   | Metric Unit  | Metric Help Description                                         |
|---------------|--------------|-----------------------------------------------------------------|
| Response Time | Milliseconds | The time required by the Modbus server to respond to a request. |
| Coil Status   |              | Coil status (0 or 1)                                            |
