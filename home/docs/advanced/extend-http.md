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
>
> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `example_http` which use the HTTP protocol to collect data.

**Monitoring Templates** -> **Config New Monitoring Template Yml** -> **Save and Apply**

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: a_example
# The monitoring i18n name
name:
  zh-CN: 模拟应用
  en-US: EXAMPLE APP
# The description and help of this monitoring type
help:
  zh-CN: HertzBeat 支持自定义监控，您只需配置监控模板 YML 就能适配一款自定义的监控类型。<br>定义流程如下：HertzBeat 页面 -> 监控模板菜单 -> 新增监控类型 -> 配置自定义监控模板YML -> 点击保存应用 -> 使用新监控类型添加监控。
  en-US: "HertzBeat supports custom monitoring, and you only need to configure the monitoring template YML to adapt to a custom monitoring type. <br>Definition process as follow: HertzBeat Pages -> Main Menu -> Monitor Template -> edit and save -> apply this template."
  zh-TW: HertzBeat支持自定義監控，您只需配寘監控模板YML就能適配一款自定義的監控類型。<br>定義流程如下：HertzBeat頁面->監控模板選單->新增監控類型->配寘自定義監控模板YML ->點擊保存應用->使用新監控類型添加監控。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/advanced/extend-point/
  en-US: https://hertzbeat.apache.org/docs/advanced/extend-point/
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 目标Host
      en-US: Target Host
    # type-param field type(most mapping the html input type)
    type: host
    # required-true or false
    required: true
  # field-param field key
  - field: port
    # name-param field display i18n name
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    # required-true or false
    required: true
    # default value
    defaultValue: 80
    # param field input placeholder
    placeholder: 'Please Input Port'
  # field-param field key
  - field: username
    # name-param field display i18n name
    name:
      zh-CN: 用户名
      en-US: Username
    # type-param field type(most mapping the html input type)
    type: text
    # when type is text, use limit to limit string length
    limit: 50
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
  # field-param field key
  - field: password
    # name-param field display i18n name
    name:
      zh-CN: 用户密码
      en-US: Password
    # type-param field type(most mapping the html input tag)
    type: password
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
  # field-param field key
  - field: ssl
    # name-param field display i18n name
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # type-param field type(boolean mapping the html switch tag)
    type: boolean
    # required-true or false
    required: false
  # field-param field key
  - field: method
    # name-param field display i18n name
    name:
      zh-CN: 请求方式
      en-US: Method
    # type-param field type(radio mapping the html radio tag)
    type: radio
    # required-true or false
    required: true
    # when type is radio checkbox, use option to show optional values {name1:value1,name2:value2}
    options:
      - label: GET
        value: GET
      - label: POST
        value: POST
      - label: PUT
        value: PUT
      - label: DELETE
        value: DELETE
  # field-param field key
  - field: headers
    # name-param field display i18n name
    name:
      zh-CN: 请求Headers
      en-US: Headers
    # type-param field type(key-value mapping the html key-value input tags)
    type: key-value
    # required-true or false
    required: false
    # when type is key-value, use keyAlias to config key alias name
    keyAlias: Header Name
    # when type is key-value, use valueAlias to config value alias name
    valueAlias: Header Value
# collect metrics config list
metrics:
  # metrics - cpu
  - name: cpu
    # metrics name i18n label
    i18n:
      zh-CN: CPU 信息
      en-US: CPU Info
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, i18n-metric name i18n label, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-whether it is a metrics label field
      - field: hostname
        type: 1
        label: true
        i18n:
          zh-CN: 主机名称
          en-US: Host Name
      - field: usage
        type: 0
        unit: '%'
        i18n:
          zh-CN: 使用率
          en-US: Usage
      - field: cores
        type: 0
        i18n:
          zh-CN: 核数
          en-US: Cores
      - field: waitTime
        type: 0
        unit: s
        i18n:
          zh-CN: 主机名称
          en-US: Host Name
    # (optional)metrics field alias name, it is used as an alias field to map and convert the collected data and metrics field
    aliasFields:
      - hostname
      - core1
      - core2
      - usage
      - allTime
      - runningTime
    # mapping and conversion expressions, use these and aliasField above to calculate metrics value
    # eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - hostname=hostname
      - cores=core1+core2
      - usage=usage
      - waitTime=allTime-runningTime
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # the config content when protocol is http
    http:
      # http host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url
      url: /metrics/cpu
      # http method: GET POST PUT DELETE PATCH
      method: GET
      # if enabled https
      ssl: false
      # http request header content
      headers:
        ^_^headers^_^: ^_^headers^_^
      # http request params
      params:
        param1: param1
        param2: param2
      # http auth
      authorization:
        # http auth type: Basic Auth, Digest Auth, Bearer Token
        type: Basic Auth
        basicAuthUsername: ^_^username^_^
        basicAuthPassword: ^_^password^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, prometheus-prometheus exporter rule
      parseType: jsonPath
      parseScript: '$'

  - name: memory
    i18n:
      zh-CN: 内存信息
      en-US: Memory Info
    priority: 1
    fields:
      - field: hostname
        type: 1
        label: true
        i18n:
          zh-CN: 主机名称
          en-US: Hostname
      - field: total
        type: 0
        unit: kb
        i18n:
          zh-CN: 总量
          en-US: Total
      - field: usage
        type: 0
        unit: '%'
        i18n:
          zh-CN: 使用率
          en-US: Usage
      - field: speed
        type: 0
        i18n:
          zh-CN: 速率
          en-US: Speed
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
