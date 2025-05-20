---
id: extend-point  
title: 自定义监控  
sidebar_label: 自定义监控
---

> HertzBeat拥有自定义监控能力，您只需配置监控模板YML就能适配一款自定义的监控类型。  
> 目前自定义监控支持[HTTP协议](extend-http)，[JDBC协议](extend-jdbc)，[SSH协议](extend-ssh)，[JMX协议](extend-jmx)，[SNMP协议](extend-snmp)，后续会支持更多通用协议。

### 自定义流程

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

### 自定义监控指标刷新时间

现在，HertzBeat支持为每组监控指标设置不同的刷新时间。您可以在监控模板的 `metrics` 部分通过设置 `interval` 字段来实现，单位为秒。若不进行设置，则使用创建监控时设置的默认刷新时间。

-------

### 监控模板YML

**HertzBeat的设计是一个监控模板对应一个监控类型，所有监控类型都是由监控模板来定义的**。

> 监控模板YML定义了 *监控类型的名称(国际化), 配置参数映射, 采集指标信息, 采集协议配置* 等。

下面使用样例详细介绍下这监控模板YML的配置用法。

样例：自定义一个 `app` 名称为 `example2` 的自定义监控类型，其使用HTTP协议采集指标数据。

[监控模板] -> [新增监控类型] -> [右边配置如下监控模板YML] -> [保存并应用]

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
# 监控类型 eg: linux windows tomcat mysql aws...
app: example2
# The monitoring i18n name
# 监控类型国际化名称
name:
  zh-CN: 模拟网站监测
  en-US: EXAMPLE WEBSITE
# The description and help of this monitoring type
help:
  zh-CN: HertzBeat 支持自定义监控，您只需配置监控模板 YML 就能适配一款自定义的监控类型。<br>定义流程如下：HertzBeat 页面 -> 监控模板菜单 -> 新增监控类型 -> 配置自定义监控模板YML -> 点击保存应用 -> 使用新监控类型添加监控。
  en-US: "HertzBeat supports custom monitoring, and you only need to configure the monitoring template YML to adapt to a custom monitoring type. <br>Definition process as follow: HertzBeat Pages -> Main Menu -> Monitor Template -> edit and save -> apply this template."
  zh-TW: HertzBeat支持自定義監控，您只需配寘監控模板YML就能適配一款自定義的監控類型。<br>定義流程如下：HertzBeat頁面->監控模板選單->新增監控類型->配寘自定義監控模板YML ->點擊保存應用->使用新監控類型添加監控。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/advanced/extend-point/
  en-US: https://hertzbeat.apache.org/docs/advanced/extend-point/
# 监控所需输入参数定义(根据定义渲染页面UI)
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  # field-变量字段标识符
  - field: host
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: true
  # field-param field key
  # field-变量字段标识符
  - field: port
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: number
    # when type is number, range is required
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: true
    # default value
    # 默认值
    defaultValue: 80
  # field-param field key
  # field-变量字段标识符
  - field: uri
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 相对路径
      en-US: URI
    # type-param field type(most mapping the html input tag)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: text
    # when type is text, use limit to limit string length
    # 当type为text时,用limit表示字符串限制大小
    limit: 200
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: false
    # 参数输入框提示信息
    # param field input placeholder
    placeholder: 'Website uri path(no ip port) EG:/console'
  # field-param field key
  # field-变量字段标识符
  - field: ssl
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 启用HTTPS
      en-US: HTTPS
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: boolean
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: true
  # field-param field key
  # field-变量字段标识符
  - field: timeout
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    # type-param field type(most mapping the html input tag)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: number
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: false
    # hide param-true or false
    # 是否隐藏字段 true or false
    hide: true
    
metrics:
  # metrics - summary, inner monitoring metrics (responseTime - response time, keyword - number of keywords)
  # 监控指标 - summary, 内置监控指标有 (responseTime - 响应时间, keyword - 关键字数量)
  - name: summary
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    # 指标采集调度优先级(0->127)->(优先级高->低) 优先级低的指标会等优先级高的指标采集完成后才会被调度, 相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # refresh interval for this metrics group
    # 该指标组刷新时间
    interval: 10
    # collect metrics content
    # 具体监控指标列表
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      # field-指标名称, type-指标类型(0-number数字,1-string字符串), unit-指标单位('%','ms','MB'), label-是否是指标集合唯一标识符字段
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
      # http 响应数据解析方式: default-系统规则, jsonPath-jsonPath脚本, website-网站可用性指标监控, prometheus-Prometheus数据规则
      parseType: website

```
