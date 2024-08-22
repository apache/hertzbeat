---
id: extend-http-jsonpath  
title: HTTP Protocol JsonPath Parsing Method  
sidebar_label: JsonPath Parsing Method
---

> After calling the HTTP api to obtain the response data, use JsonPath script parsing method to parse the response data.

Note⚠️ The response data is JSON format.

**Use the JsonPath script to parse the response data into data that conforms to the data structure rules specified by HertzBeat**

#### JsonPath Operator

[JSONPath online verification](https://www.jsonpath.cn)

|     JSONPATH     |                                    Help description                                    |
|------------------|----------------------------------------------------------------------------------------|
| $                | Root object or element                                                                 |
| @                | Current object or element                                                              |
| . or []          | Child element operator                                                                 |
| ..               | Recursively match all child elements                                                   |
| *                | Wildcard.  Match all objects or elements                                               |
| []               | Subscript operator, jsonpath index starts from 0                                       |
| [,]              | Join operator, return multiple results as an array. Jsonpath allows the use of aliases |
| [start:end:step] | Array slice operator                                                                   |
| ?()              | Filter (script) expression                                                             |
| ()               | Script Expression                                                                      |

#### HertzBeat data format specification

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

#### Example

Query the value information of the custom system, and its exposed interface is  `/metrics/person`. We need `type,num` Metric.
The raw data returned by the interface is as follows：

```json
{
  "firstName": "John",
  "lastName" : "doe",
  "age"      : 26,
  "address"  : {
    "streetAddress": "naist street",
    "city"         : "Nara",
    "postalCode"   : "630-0192"
  },
  "number": [
    {
      "type": "core",
      "num": 3343
    },
    {
      "type": "home",
      "num": 4543
    }
  ]
}
```

We use the jsonpath script to parse, and the corresponding script is: `$.number[*]`，The parsed data structure is as follows：

```json
[
  {
    "type": "core",
    "num": 3343
  },
  {
    "type": "home",
    "num": 4543
  }
]
```

This data structure conforms to the data format specification of HertzBeat, and the Metric `type,num` is successfully extracted.

**The corresponding monitoring template yml can be configured as follows**

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
# The first monitoring Metric group person
# Note：the built-in monitoring Metrics have (responseTime - response time)
  - name: cpu
    # The smaller Metric group scheduling priority(0-127), the higher the priority. After completion of the high priority Metric group collection,the low priority Metric group will then be scheduled. Metric groups with the same priority  will be scheduled in parallel.
    # Metric group with a priority of 0 is an availability group which will be scheduled first. If the collection succeeds, the  scheduling will continue otherwise interrupt scheduling.
    priority: 0
    # metrics fields list
    fields:
      # Metric information include   field: name   type: field type(0-number: number, 1-string: string)   label-if is metrics label   unit: Metric unit
      - field: type
        type: 1
        label: true
      - field: num
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
      url: /metrics/person
      # request mode GET POST PUT DELETE PATCH
      method: GET
      # enable ssl/tls or not, that is to say, HTTP or HTTPS. The default is false
      ssl: false
      # parsing method for response data: default-system rules, jsonPath-jsonPath script, website-website availability Metric monitoring
      # jsonPath parsing is used here
      parseType: jsonPath
      parseScript: '$.number[*]' 
```
