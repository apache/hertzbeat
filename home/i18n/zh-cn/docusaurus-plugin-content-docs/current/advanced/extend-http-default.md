---
id: extend-http-default  
title: HTTP协议系统默认解析方式  
sidebar_label: 系统默认解析方式
---

> HTTP接口调用获取响应数据后，用 Apache HertzBeat (incubating) 默认的解析方式去解析响应数据。

**此需接口响应数据结构符合HertzBeat指定的数据结构规则**

### HertzBeat数据格式规范

注意⚠️ 响应数据为JSON

单层格式：key-value

```json
{
  "metricName1": "metricValue",
  "metricName2": "metricValue",
  "metricName3": "metricValue",
  "metricName4": "metricValue"
}
```

多层格式：数组里面套key-value

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

样例：
查询自定义系统的CPU信息，其暴露接口为 `/metrics/cpu`，我们需要其中的`hostname,core,useage`指标
若只有一台虚拟机，其单层格式为:

```json
{
  "hostname": "linux-1",
  "core": 1,
  "usage": 78.0,
  "allTime": 200,
  "runningTime": 100
}
```

若有多台虚拟机，其多层格式为:

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

**对应的监控模板YML可以配置为如下**

```yaml
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
```
