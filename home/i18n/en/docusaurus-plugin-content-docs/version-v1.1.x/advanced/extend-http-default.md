---
id: extend-http-default  
title: HTTP Protocol System Default Parsing Method  
sidebar_label: System Default Parsing Method
---

> After calling the HTTP interface to obtain the response data, use the default parsing method of hertzbeat to parse the response data.    

**The interface response data structure must be consistent with the data structure rules specified by hertzbeat**   

### HertzBeat data format specification      
Note⚠️ The response data is JSON format.  

Single layer format ：key-value
```json
{
  "metricName1": "metricValue",
  "metricName2": "metricValue",
  "metricName3": "metricValue",
  "metricName4": "metricValue"
}
```
Multilayer format：Set key value in the array
```json
[
  {
    "metricName1": "metricValue",
    "metricName2": "metricValue",
    "metricName3": "metricValue",
    "metricName4": "metricValue"
  },
  {
    "metricName1": "metricValue",
    "metricName2": "metricValue",
    "metricName3": "metricValue",
    "metricName4": "metricValue"
  }
]
```
eg：
Query the CPU information of the custom system. The exposed interface is `/metrics/cpu`. We need `hostname,core,useage` Metric. 
If there is only one virtual machine, its single-layer format is : 
```json
{
  "hostname": "linux-1",
  "core": 1,
  "usage": 78.0,
  "allTime": 200,
  "runningTime": 100
}
```
If there are multiple virtual machines, the multilayer format is: : 
```json
[
  {
    "hostname": "linux-1",
    "core": 1,
    "usage": 78.0,
    "allTime": 200,
    "runningTime": 100
  },
  {
    "hostname": "linux-2",
    "core": 3,
    "usage": 78.0,
    "allTime": 566,
    "runningTime": 34
  },
  {
    "hostname": "linux-3",
    "core": 4,
    "usage": 38.0,
    "allTime": 500,
    "runningTime": 20
  }
]
```

**The corresponding monitoring configuration definition file YML can be configured as follows**  

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# Monitoring application type(consistent with the file name) eg: linux windows tomcat mysql aws...
app: example
name:
  zh-CN: 模拟应用类型
  en-US: EXAMPLE APP
params:
  # field-field name identifier
  - field: host
    # name-parameter field display name
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-field type, style(most mappings are input label type attribute)
    type: host
    # required or not  true-required  false-optional
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # When type is number, range is used to represent the range.
    range: '[0,65535]'
    required: true
    # port default
    defaultValue: 80
    # Prompt information of parameter input box
    placeholder: 'Please enter the port'
# Metric group list
metrics:
# The first monitoring Metric group cpu
# Note：the built-in monitoring Metrics have (responseTime - response time)
  - name: cpu
    # The smaller Metric group scheduling priority(0-127), the higher the priority. After completion of the high priority Metric group collection,the low priority Metric group will then be scheduled. Metric groups with the same priority  will be scheduled in parallel.
    # Metric group with a priority of 0 is an availability group which will be scheduled first. If the collection succeeds, the  scheduling will continue otherwise interrupt scheduling.
    priority: 0
    # metrics fields list
    fields:
      # Metric information include   field: name   type: field type(0-number: number, 1-string: string)   label-if is metrics label   unit: Metric unit
      - field: hostname
        type: 1
        instance: true
      - field: usage
        type: 0
        unit: '%'
      - field: core
        type: 0
# protocol for monitoring and collection eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
# Specific collection configuration when the protocol is HTTP protocol
    http:
      # host: ipv4 ipv6 domain name
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      # url request interface path
      url: /metrics/cpu
      # request mode: GET POST PUT DELETE PATCH
      method: GET
      # enable ssl/tls or not, that is to say, HTTP or HTTPS. The default is false
      ssl: false
      # parsing method for reponse data: default-system rules, jsonPath-jsonPath script, website-website availability Metric monitoring
      # Hertzbeat default parsing is used here
      parseType: default
```
