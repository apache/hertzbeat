---
id: dns
title: Monitoring DNS
sidebar_label: DNS Monitor
keywords: [ open source monitoring tool, open source DNS monitoring tool, monitoring DNS metrics ]
---

> Collect and monitor the general performance Metrics of DNS.

**Protocol Use：DNS**

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6. Note⚠️Without protocol header (eg: https://, http://).                                             |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Monitoring port     | The port for DNS service provided to the outside,default is 53.                                                          |
| Address For DNS     | The address for domain name resolution.                                                                                  |
| Connect Timeout     | Set the timeout for connecting to the DNS server, default is 6000 milliseconds.                                          |
| Query Class         | Resource class for DNS query. Optional values include `IN`, `CHAOS`, `HESIOD`, `NONE`, and `ANY`,default is IN.          |
| Use TCP Protocol    | DNS queries use the TCP protocol.                                                                                        |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Bind Tags           | Used to classify and manage monitoring resources.                                                                        |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Collection Metrics

#### Metrics Set：Header

|       Metric name       | Metric unit |              Metric help description              |
|-------------------------|-------------|---------------------------------------------------|
| Response Time           | ms          | Time taken for DNS server to respond to requests. |
| Opcode                  | none        | Type of the current message.                      |
| Response Status         | none        | Status code of the response.                      |
| Response Flags          | none        | Response flags.                                   |
| Question Record Count   | none        | Number of question records.                       |
| Answer Record Count     | none        | Number of answer records.                         |
| Authority Record Count  | none        | Number of authoritative resource records.         |
| Additional Record Count | none        | Number of additional resource records.            |

### Metrics Set: Question

| Metric name | Metric unit |                                                      Metric help description                                                      |
|-------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Section     | none        | Question record information, including the queried domain name, resource type, resource record class, and additional information. |

### Metrics Set: Answer

| Metric name | Metric unit |                                                  Metric help description                                                   |
|-------------|-------------|----------------------------------------------------------------------------------------------------------------------------|
| Section0    | none        | Answer record information, including the queried domain name, TTL, resource record class, resource type, and query result. |

> The metric set collects up to 10 records, with metric names from Section0 to Section9.

### Metrics Set: Authority

| Metric name | Metric unit |                                                                Metric help description                                                                |
|-------------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Section0    | none        | SOA (Start of Authority) record for the domain name, including queried domain name, TTL, resource type, resource record class, and other information. |

> The metric set collects up to 10 records, with metric names from Section0 to Section9.

### Metrics Set: Additional

| Metric name | Metric unit |         Metric help description         |
|-------------|-------------|-----------------------------------------|
| Section0    | none        | Additional information for DNS queries. |

> The metric set collects up to 10 records, with metric names from Section0 to Section9.
