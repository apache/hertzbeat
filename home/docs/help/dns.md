---
id: dns
Title: Monitoring DNS     
sidebar_label: DNS Monitor
keywords: [open source monitoring tool, open source dns monitoring tool, monitoring dns metrics]
---

> Collect and monitor the general performance metrics by `dig` command.

## Pre-monitoring operations

If you want to monitor DNS server, you need to understand what is `dig` command and the output of `dig` command.

**Here's the example of executing dig command**

```shell
dig www.google.com
```


### Configure parameters

| Parameter name | Parameter Help describes the |
| ------------ |------------------------------------------------------|
| DNS Server IP | THE MONITORED PEER IPV4, IPV6 OR DOMAIN NAME. Note ⚠️ that there are no protocol headers (eg: https://, http://). |
| Task Name | A name that identifies this monitoring that needs to be unique. |
| Port | The default port provided by DNS server is 53. |
| Address For DNS | Used for dig command, it is an address that interact with DNS server. |
| Connect Timeout(ms) | Timeout for dig command. |
| Use TCP Protocol | Connect to DNS server using tcp, default is udp. |
| Intervals(s) | Monitor the periodic data acquisition interval, in seconds, and the minimum interval that can be set is 30 seconds |
| Description | For more information identifying and describing the remarks for this monitoring, users can remark the information here |


### Collect metrics

#### Header

| Metric Name | metric unit | Metrics help describe |
| ------------------ | -------- |--------------------------------|
| Response Time | ms | DNS server response time |
| Opcode | None | operation code of dig command |
| Response Status | None | status of DNS server resolving address |
| Response Flags | None | flags of DNS server resolving address |
| Question Record Count | None | Question record count of dig output |
| Answer Record Count | None | Answer record count of dig output |
| Authority Record Count | None | Authority record count of dig output |
| Additional Record Count | None | Additional record count of dig output |

#### Question

| Metric Name | metric unit | Metrics help describe |
|---------| -------- |----------------------------|
| Section     | None        | section of Question record |

#### Answer/Authority/Additional

> Depanding on DNS config, Answer/Authority/Additional can be multi records for one address. Each record will be showd as a section here. Default is 10 sections.

| Metric Name | metric unit | Metrics help describe |
| ----------- | ----------- | --------------------- |
| Section0    | None        | section of record     |
| Section1    | None        | section of record     |
| Section2    | None        | section of record     |
| Section3    | None        | section of record     |
| Section4    | None        | section of record     |
| Section5    | None        | section of record     |
| Section6    | None        | section of record     |
| Section7    | None        | section of record     |
| Section8    | None        | section of record     |
| Section9    | None        | section of record     |



