---
id: extend-http  
title: HTTP Protocol Custom Monitoring  
sidebar_label: HTTP Protocol Custom Monitoring    
---

> From [Custom Monitoring](extend-point), you are familiar with how to customize types, Metrics, protocols, etc. Here we will introduce in detail how to use HTTP protocol to customize Metric monitoring   

### HTTP protocol collection process     

【**Call HTTP API**】->【**Response Verification**】->【**Parse Response Data**】->【**Default method parsing｜JsonPath script parsing | XmlPath parsing(todo) | Prometheus parsing**】->【**Metric data extraction**】

It can be seen from the process that we define a monitoring type of HTTP protocol. We need to configure HTTP request parameters, configure which Metrics to obtain, and configure the parsing method and parsing script for response data.
HTTP protocol supports us to customize HTTP request path, request header, request parameters, request method, request body, etc.   

**System default parsing method**：HTTP interface returns the JSON data structure specified by hertzbeat, that is, the default parsing method can be used to parse the data and extract the corresponding Metric data. For details, refer to [**System Default Parsing**](extend-http-default)    
**JsonPath script parsing method**：Use JsonPath script to parse the response JSON data, return the data structure specified by the system, and then provide the corresponding Metric data. For details, refer to [**JsonPath Script Parsing**](extend-http-jsonpath)    
  

### Custom Steps  

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type**

------- 

Configuration usages of the monitoring templates yml are detailed below. Please pay attention to usage annotation.   

### Monitoring Templates YML

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.


> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `example_http` which use the HTTP protocol to collect data.

**Monitoring Templates** -> **Config New Monitoring Template Yml** -> **Save and Apply**

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# Monitoring application type(consistent with the file name) eg: linux windows tomcat mysql aws...
app: example_http
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
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    # When type is text, use limit to indicate the string limit size
    limit: 20
    required: false
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: false
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: Enable SSL
    # When type is boolean, front end uses switch to show the switch
    type: boolean
    required: false
  - field: method
    name:
      zh-CN: 请求方式
      en-US: Method
    type: radio
    required: true
    # When type is radio or checkbox, option indicates the list of selectable values {name1:value1,name2:value2}
    options:
      - label: GET request
        value: GET
      - label: POST request
        value: POST
      - label: PUT request
        value: PUT
      - label: DELETE request
        value: DELETE
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
      - field: cores
        type: 0
      - field: waitTime
        type: 0
        unit: s
# (optional)Monitoring Metric alias mapping to the Metric name above. The field used to collect interface data is not the final Metric name directly. This alias is required for mapping conversion.
    aliasFields:
      - hostname
      - core1
      - core2
      - usage
      - allTime
      - runningTime
# (optional)The Metric calculation expression works with the above alias to calculate the final required Metric value.
# eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - hostname=hostname
      - cores=core1+core2
      - usage=usage
      - waitTime=allTime-runningTime
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
      # request header content
      headers:
        apiVersion: v1
      # request parameter content
      params:
        param1: param1
        param2: param2
      # authorization
      authorization:
        # authorization method: Basic Auth, Digest Auth, Bearer Token
        type: Basic Auth
        basicAuthUsername: ^_^username^_^
        basicAuthPassword: ^_^password^_^
      # parsing method for reponse data: default-system rules, jsonPath-jsonPath script, website-website availability Metric monitoring
      # todo xmlPath-xmlPath script, prometheus-Prometheus data rules
      parseType: jsonPath
      parseScript: '$'

  - name: memory
    priority: 1
    fields:
      - field: hostname
        type: 1
        instance: true
      - field: total
        type: 0
        unit: kb
      - field: usage
        type: 0
        unit: '%'
      - field: speed
        type: 0
    protocol: http
    http:
      host: ^_^host^_^
      port: ^_^port^_^
      url: /metrics/memory
      method: GET
      headers:
        apiVersion: v1
      params:
        param1: param1
        param2: param2
      authorization:
        type: Basic Auth
        basicAuthUsername: ^_^username^_^
        basicAuthPassword: ^_^password^_^
      parseType: default
```
