---
id: extend-point  
title: 自定义监控  
sidebar_label: 自定义监控    
---
> HertzBeat拥有自定义监控能力，您只需配置监控模版YML就能适配一款自定义的监控类型。  
> 目前自定义监控支持[HTTP协议](extend-http)，[JDBC协议](extend-jdbc)，[SSH协议](extend-ssh)，[JMX协议](extend-jmx)，[SNMP协议](extend-snmp)，后续会支持更多通用协议。        

### 自定义流程  

**HertzBeat页面** -> **监控模版菜单** -> **新增监控类型** -> **配置自定义监控模版YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![](/img/docs/advanced/extend-point-1.png)

-------

### 监控模版YML   

**HertzBeat的设计是一个监控模版对应一个监控类型，所有监控类型都是由监控模版来定义的**。

> 监控模版YML定义了 *监控类型的名称(国际化), 配置参数映射, 采集指标信息, 采集协议配置* 等。  

下面使用样例详细介绍下这监控模版YML的配置用法。   

样例：自定义一个 `app` 名称为 `example2` 的自定义监控类型，其使用HTTP协议采集指标数据。

[监控模版] -> [新增监控类型] -> [右边配置如下监控模版YML] -> [保存并应用]

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
# 监控类型所属类别：service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控 cn-云原生cloud native network-网络监控
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
# 监控类型 eg: linux windows tomcat mysql aws...
app: example2
# The monitoring i18n name
# 监控类型国际化名称
name:
  zh-CN: 模拟网站监测
  en-US: EXAMPLE WEBSITE
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
  # 监控指标组 - summary, 内置监控指标有 (responseTime - 响应时间, keyword - 关键字数量)
  - name: summary
    # 指标组调度优先级(0-127)越小优先级越高,优先级低的指标组会等优先级高的指标组采集完成后才会被调度,相同优先级的指标组会并行调度采集
    # metrics group scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics group is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    # 指标组调度优先级(0->127)->(优先级高->低) 优先级低的指标组会等优先级高的指标组采集完成后才会被调度, 相同优先级的指标组会并行调度采集
    # 优先级为0的指标组为可用性指标组,即它会被首先调度,采集成功才会继续调度其它指标组,采集失败则中断调度
    priority: 0
    # collect metrics content
    # 具体监控指标列表
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), instance-if is metrics group unique identifier
      # field-指标名称, type-指标类型(0-number数字,1-string字符串), unit-指标单位('%','ms','MB'), instance-是否是指标集合唯一标识符字段
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

