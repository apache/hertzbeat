---
id: synology_nas
title: Monitoring：Synology NAS
sidebar_label: Synology NAS
keywords: [ open source monitoring tool, server monitoring, Synology Nas ]
---

> Collect and monitor the general performance Metrics of Synology NAS device.

**Protocol Use: SNMP**

## Pre-monitoring operations

Please refer to [SNMP](https://kb.synology.com/en-global/DSM/help/DSM/AdminCenter/system_snmp) to enable SNMP service. Currently, SNMPv1, SNMPv2c and SNMPv3 protocols are supported.

### Configuration parameter

|     Parameter name      |                                                                                                                                                                                                                                 Parameter help description                                                                                                                                                                                                                                 |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Target Host             | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                                                                                                                                                                                                                                                                                                                                 |
| Task Name               | Identify the name of this monitoring. The name needs to be unique                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Port                    | Port of SNMP. The default is 161                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| SNMP Version            | SNMP version to use                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| SNMP Community          | Used in SNMP v1 and SNMP v2c, used to complete authentication in SNMP Agent, in string form. Group name includes "read" and "write", when performing SNMP query operation, "read" group name is used for authentication; when performing SNMP setting operation, "write" group name is used for authentication. When performing SNMP query operation, "read" group name is used for authentication; when performing SNMP setting operation, "write" group name is used for authentication. |
| SNMP username           | For SNMP v3, MSG username                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| SNMP contextName        | For SNMP v3, used to determine the MIB view of the Context EngineID to the managed device                                                                                                                                                                                                                                                                                                                                                                                                  |
| SNMP authPassword       | For SNMP v3, SNMP authentication passwords                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| authPassword Encryption | For SNMP v3, SNMP authentication algorithm                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| SNMP privPassphrase     | For SNMP v3, SNMP encrypted passwords                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| privPassword Encryption | For SNMP v3, SNMP encrypted algorithm                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Timeout                 | Set the timeout time when querying unresponsive data, in milliseconds, the default is 6000 milliseconds                                                                                                                                                                                                                                                                                                                                                                                    |
| Intervals               | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                                                                                                                                                                                                                                                                                                                                    |
| Description             | For more information about identifying and describing this monitoring, users can note information here                                                                                                                                                                                                                                                                                                                                                                                     |

### Collection Metric

Since there are too many metrics that can be queried, detailed metrics can be queried
on [SNMP MIB Guide](https://kb.synology.com/en-global/DG/Synology_DiskStation_MIB_Guide/3).

This document only introduces the monitoring indicators queried in the monitor template.

### Metric Set: system

| Metric Name      | Metric Unit | Metric Help Description |
|------------------|-------------|-------------------------|
| modelName        | None        | Model name of this NAS  |
| serialNumber     | None        | Model serial number     |
| version          | None        | The version of DSM      |
| controllerNumber | None        | The controller number   |

### Metric Set: status

| Metric Name     | Metric Unit   | Metric Help Description                                 |
|-----------------|---------------|---------------------------------------------------------|
| powerStatus     | None          | Power status，returns error if power supplies fail       |
| systemFanStatus | None          | System fan status, returns error if system fan fails    |
| cpuFanStatus    | None          | CPU fan status, returns error if CPU fan fails          |
| systemStatus    | None          | System partition status                                 |
| thermalStatus   | None          | returns error if thermal status is abnormal             |
| temperature     | None          | Temperature of this NAS                                 |
| cpuUtilization  | Percentage(%) | Utilization (%) is the sum of user and system CPU usage |
| memUtilization  | Percentage(%) | Utilization (%) is the sum of memory usage              |

### Metric Set: disk

| Metric Name      | Metric Unit | Metric Help Description                                           |
|------------------|-------------|-------------------------------------------------------------------|
| diskID           | None        | Disk name in DSM                                                  |
| diskModel        | None        | Disk model                                                        |
| diskType         | None        | Disk type, e.g. SATA, SSD                                         |
| diskStatus       | None        | Current disk status                                               |
| diskTemperature  | None        | Disk temperature                                                  |
| diskRole         | None        | The role of the disk in system                                    |
| diskRetry        | None        | The count of each disk connection retries                         |
| diskBadSector    | None        | The count of each disk I/O bad sector                             |
| diskIdentifyFail | None        | The count of each disk identify fails                             |
| diskRemainLife   | None        | The estimate remain life of each disk                             |
| diskName         | None        | Disk name which will keep the same value in different DSM version |
| diskHealthStatus | None        | Current disk health status                                        |

### Metric Set: RAID

| Metric Name     | Metric Unit | Metric Help Description                                                                  |
|-----------------|-------------|------------------------------------------------------------------------------------------|
| raidName        | None        | The name of each RAID in DSM                                                             |
| raidStatus      | None        | It shows the RAID status right now                                                       |
| raidFreeSize    | None        | The free size of volume / disk group                                                     |
| raidTotalSize   | None        | The total size of volume / disk group                                                    |
| raidHotspareCnt | None        | Total hotspare disks count which can protect RAID (smaller than 0 means something wrong) |

### Metric Set: S.M.A.R.T

| Metric Name            | Metric Unit | Metric Help Description                                |
|------------------------|-------------|--------------------------------------------------------|
| diskSMARTInfoDevName   | None        | Describes the disk to which this SMART info belongs to |
| diskSMARTAttrName      | None        | The name of the SMART info attribute                   |
| diskSMARTAttrId        | None        | SMART attribute ID number                              |
| diskSMARTAttrCurrent   | None        | SMART attribute current value                          |
| diskSMARTAttrWorst     | None        | SMART attribute worst value                            |
| diskSMARTAttrThreshold | None        | SMART attribute threshold value                        |
| diskSMARTAttrRaw       | None        | SMART attribute raw value                              |
| diskSMARTAttrStatus    | None        | Status of this SMART info                              |

### Metric Set: space io

| Metric Name   | Metric Unit   | Metric Help Description                                 |
|---------------|---------------|---------------------------------------------------------|
| spaceIODevice | None          | The name of the device this volume mounted on           |
| spaceIOReads  | None          | The number of read accesses from this volume since boot |
| spaceIOWrites | None          | The number of write accesses to this volume since boot  |
| spaceIOLA     | Percentage(%) | The load of disk in the volume                          |
| spaceIOLA1    | Percentage(%) | The 1 minute average load of disk in the volume         |
| spaceIOLA5    | Percentage(%) | The 5 minute average load of disk in the volume         |
| spaceIOLA15   | Percentage(%) | The 15 minute average load of disk in the volume        |
| spaceUUID     | None          | The UUID of this volume                                 |

### Metric Set: storage io

| Metric Name           | Metric Unit   | Metric Help Description                                 |
|-----------------------|---------------|---------------------------------------------------------|
| storageIODevice       | None          | The name of the device we are counting/checking         |
| storageIOReads        | None          | The number of read accesses from this device since boot |
| storageIOWrites       | None          | The number of write accesses to this device since boot  |
| storageIOLA           | Percentage(%) | The load of disk                                        |
| storageIOLA1          | Percentage(%) | The 1-minute average load of disk                       |
| storageIOLA5          | Percentage(%) | The 5-minute average load of disk                       |
| storageIOLA15         | Percentage(%) | The 15-minute average load of disk                      |
| storageIODeviceSerial | None          | The serial number of this device                        |
