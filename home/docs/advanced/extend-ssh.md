---
id: extend-ssh  
title: SSH Protocol Custom Monitoring  
sidebar_label: SSH Protocol Custom Monitoring
---

> From [Custom Monitoring](extend-point), you are familiar with how to customize types, Metrics, protocols, etc. Here we will introduce in detail how to use SSH protocol to customize Metric monitoring.
> SSH protocol custom monitoring allows us to easily monitor and collect the Linux Metrics we want by writing sh command script.

### SSH protocol collection process

【**System directly connected to Linux**】->【**Run shell command script statement**】->【**parse response data: oneRow, multiRow**】->【**Metric data extraction**】

It can be seen from the process that we define a monitoring type of SSH protocol. We need to configure SSH request parameters, configure which Metrics to obtain, and configure query script statements.

### Data parsing method

We can obtain the corresponding Metric data through the data fields queried by the SHELL script and the Metric mapping we need. At present, there are two mapping parsing methods：oneRow and multiRow which can meet the needs of most Metrics.

#### **oneRow**

> Query out a column of data, return the field value (one value per row) of the result set through query and map them to the field.

eg：
Metrics of Linux to be queried hostname-host name，uptime-start time
Host name original query command：`hostname`
Start time original query command：`uptime | awk -F "," '{print $1}'`
Then the query script of the two Metrics in hertzbeat is(Use `;` Connect them together)：
`hostname; uptime | awk -F "," '{print $1}'`
The data responded by the terminal is：

```shell
tombook
14:00:15 up 72 days  
```

At last collected Metric data is mapped one by one as：
hostname is `tombook`
uptime is `14:00:15 up 72 days`

Here the Metric field and the response data can be mapped into a row of collected data one by one

#### **multiRow**

> Query multiple rows of data, return the column names of the result set through the query, and map them to the Metric field of the query.

eg：
Linux memory related Metric fields queried：total-Total memory, used-Used memory,free-Free memory, buff-cache-Cache size, available-Available memory
Memory metrics original query command：`free -m`, Console response：

```shell
              total        used        free      shared  buff/cache   available
Mem:           7962        4065         333           1        3562        3593
Swap:          8191          33        8158
```

In hertzbeat multiRow format parsing requires a one-to-one mapping between the column name of the response data  and the indicaotr value, so the corresponding query SHELL script is:
`free -m | grep Mem | awk 'BEGIN{print "total used free buff_cache available"} {print $2,$3,$4,$6,$7}'`
Console response is：

```shell
total  used  free  buff_cache  available
7962   4066  331   3564        3592
```

Here the Metric field and the response data can be mapped into collected data one by one.

### Custom Steps

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type**

-------

Configuration usages of the monitoring templates yml are detailed below.

### Monitoring Templates YML

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.
>
> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `example_linux` which use the SSH protocol to collect data.

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: os
# Monitoring application type(consistent with the file name) eg: linux windows tomcat mysql aws...
app: example_linux
name:
  zh-CN: 模拟LINUX应用类型
  en-US: LINUX EXAMPLE APP
params:
  - field: host
    name:
      zh-CN: 主机Host
      en-US: Host
    type: host
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 22
    placeholder: 'Please enter the port'
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    limit: 50
    required: true
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: true
# Metric group list
metrics:
  # The first monitoring Metric group basic
  # Note：: the built-in monitoring Metrics have (responseTime - response time)
  - name: basic
    # The smaller Metric group scheduling priority(0-127), the higher the priority. After completion of the high priority Metric group collection,the low priority Metric group will then be scheduled. Metric groups with the same priority  will be scheduled in parallel.
    # Metric group with a priority of 0 is an availability group which will be scheduled first. If the collection succeeds, the  scheduling will continue otherwise interrupt scheduling.
    priority: 0
    # metrics fields list
    fields:
      # Metric information include field: name   type: field type(0-number: number, 1-string: string)   label-if is metrics label   unit: Metric unit
      - field: hostname
        type: 1
        label: true
      - field: version
        type: 1
      - field: uptime
        type: 1
    # protocol for monitoring and collection  eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # Specific collection configuration when the protocol is SSH protocol
    ssh:
      # host: ipv4 ipv6 domain name
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: (uname -r ; hostname ; uptime | awk -F "," '{print $1}' | sed  "s/ //g") | sed ":a;N;s/\n/^/g;ta" | awk -F '^' 'BEGIN{print "version hostname uptime"} {print $1, $2, $3}'
      # parsing method for reponse data：oneRow, multiRow
      parseType: multiRow

  - name: cpu
    priority: 1
    fields:
      # Metric information include field: name   type: field type(0-number: number, 1-string: string)   label-if is metrics label   unit: Metric unit
      - field: info
        type: 1
      - field: cores
        type: 0
        unit: the number of cores
      - field: interrupt
        type: 0
        unit: number
      - field: load
        type: 1
      - field: context_switch
        type: 0
        unit: number
    # protocol for monitoring and collection eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # Specific collection configuration when the protocol is SSH protocol
    ssh:
      # 主机host: ipv4 ipv6 domain name
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: "LANG=C lscpu | awk -F: '/Model name/ {print $2}';awk '/processor/{core++} END{print core}' /proc/cpuinfo;uptime | sed 's/,/ /g' | awk '{for(i=NF-2;i<=NF;i++)print $i }' | xargs;vmstat 1 1 | awk 'NR==3{print $11}';vmstat 1 1 | awk 'NR==3{print $12}'"
      parseType: oneRow

  - name: memory
    priority: 2
    fields:
      # Metric information include field: name   type: field type(0-number: number, 1-string: string)   label-if is metrics label   unit: Metric unit
      - field: total
        type: 0
        unit: Mb
      - field: used
        type: 0
        unit: Mb
      - field: free
        type: 0
        unit: Mb
      - field: buff_cache
        type: 0
        unit: Mb
      - field: available
        type: 0
        unit: Mb
    # protocol for monitoring and collection eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: ssh
    # Specific collection configuration when the protocol is SSH protocol
    ssh:
      # host: ipv4 ipv6 domain name
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      script: free -m | grep Mem | awk 'BEGIN{print "total used free buff_cache available"} {print $2,$3,$4,$6,$7}'
      parseType: multiRow
```
