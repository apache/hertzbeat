---
id: extend-point  
title: Custom Monitoring  
sidebar_label: Custom Monitoring
---

> HertzBeat has custom monitoring ability. You only need to configure monitoring template yml to fit a custom monitoring type.  
> Custom monitoring currently supports [HTTP protocol](extend-http)，[JDBC protocol](extend-jdbc), [SSH protocol](extend-ssh), [JMX protocol](extend-jmx), [SNMP protocol](extend-snmp). And it will support more general protocols in the future.

### Custom Monitoring Steps

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type**

### Custom Monitoring Metrics Refresh Interval

HertzBeat now supports setting different refresh intervals for various groups of monitoring metrics. This can be configured in the monitoring template under the `metrics` section by setting the `interval` field, with the unit being seconds. If not set, the default refresh interval specified during the creation of the monitoring will be used.

-------

Configuration usages of the monitoring templates yml are detailed below.

### Monitoring Templates YML

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.
>
> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `example2` which use the HTTP protocol to collect data.

**Monitoring Templates** -> **Config New Monitoring Template Yml** -> **Save and Apply**

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: example2
# The monitoring i18n name
name:
  zh-CN: 模拟网站监测
  en-US: EXAMPLE WEBSITE
# The description and help of this monitoring type
help:
  zh-CN: HertzBeat 支持自定义监控，您只需配置监控模版 YML 就能适配一款自定义的监控类型。<br>定义流程如下：HertzBeat 页面 -> 监控模版菜单 -> 新增监控类型 -> 配置自定义监控模版YML -> 点击保存应用 -> 使用新监控类型添加监控。
  en-US: "HertzBeat supports custom monitoring, and you only need to configure the monitoring template YML to adapt to a custom monitoring type. <br>Definition process as follow: HertzBeat Pages -> Main Menu -> Monitor Template -> edit and save -> apply this template."
  zh-TW: HertzBeat支持自定義監控，您只需配寘監控模版YML就能適配一款自定義的監控類型。<br>定義流程如下：HertzBeat頁面->監控模版選單->新增監控類型->配寘自定義監控模版YML ->點擊保存應用->使用新監控類型添加監控。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/advanced/extend-point/
  en-US: https://hertzbeat.apache.org/docs/advanced/extend-point/
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 主机Host
      en-US: Host
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
  # field-param field key
  - field: uri
    # name-param field display i18n name
    name:
      zh-CN: 相对路径
      en-US: URI
    # type-param field type(most mapping the html input tag)
    type: text
    # when type is text, use limit to limit string length
    limit: 200
    # required-true or false
    required: false
    # param field input placeholder
    placeholder: 'Website uri path(no ip port) EG:/console'
  # field-param field key
  - field: ssl
    # name-param field display i18n name
    name:
      zh-CN: 启用HTTPS
      en-US: HTTPS
    # type-param field type(most mapping the html input type)
    type: boolean
    # required-true or false
    required: true
  # field-param field key
  - field: timeout
    # name-param field display i18n name
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    # type-param field type(most mapping the html input tag)
    type: number
    # required-true or false
    required: false
    # hide param-true or false
    hide: true

metrics:
  # metrics - summary, inner monitoring metrics (responseTime - response time, keyword - number of keywords)
  - name: summary
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # refresh interval for this metrics group
    interval: 600
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      - field: responseTime
        type: 0
        unit: ms
      - field: keyword
        type: 0
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # the config content when protocol is http
    http:
      # http host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url
      url: ^_^uri^_^
      timeout: ^_^timeout^_^
      # http method: GET POST PUT DELETE PATCH
      method: GET
      # if enabled https
      ssl: ^_^ssl^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, prometheus-prometheus exporter rule
      parseType: website

```
