---
id: extend-snmp
title: SNMP协议自定义监控
sidebar_label: SNMP协议自定义监控    
---
> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用 SNMP 协议自定义指标监控。    
> SNMP 协议自定义监控可以让我们很方便的通过配置 Mib OID信息 就能监控采集到我们想监控的OID指标

### SNMP协议采集流程
【**对端开启SNMP服务**】->【**HertzBeat直连对端SNMP服务**】->【**根据配置抓取对端OID指标信息**】->【**指标数据提取**】

由流程可见，我们自定义一个SNMP协议的监控类型，需要配置SNMP请求参数，配置获取哪些指标，配置查询OID信息。

### 数据解析方式

通过配置监控模版YML的指标`field`, `aliasFields`, `snmp` 协议下的 `oids`来抓取对端指定的数据并解析映射。



### 自定义步骤

**HertzBeat页面** -> **监控模版菜单** -> **新增监控类型** -> **配置自定义监控模版YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![](/img/docs/advanced/extend-point-1.png)

------- 
下面详细介绍下文件的配置用法，请注意看使用注释。

### 监控模版YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。    
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为 example_windows 的自定义监控类型，其使用SSH协议采集指标数据。


```yaml
# The monitoring type category：service-application service monitoring db-database monitoring mid-middleware custom-custom monitoring os-operating system monitoring
category: os
# The monitoring type eg: linux windows tomcat mysql aws...
app: windows
# The monitoring i18n name
name:
  zh-CN: Windows操作系统
  en-US: OS Windows
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
    defaultValue: 161
  # field-param field key
  - field: version
    # name-param field display i18n name
    name:
      zh-CN: SNMP 版本
      en-US: SNMP Version
    # type-param field type(radio mapping the html radio tag)
    type: radio
    # required-true or false
    required: true
    # when type is radio checkbox, use option to show optional values {name1:value1,name2:value2}
    options:
      - label: SNMPv1
        value: 0
      - label: SNMPv2c
        value: 1
  # field-param field key
  - field: community
    # name-param field display i18n name
    name:
      zh-CN: SNMP 团体字
      en-US: SNMP Community
    # type-param field type(most mapping the html input type)
    type: text
    # when type is text, use limit to limit string length
    limit: 100
    # required-true or false
    required: true
    # param field input placeholder
    placeholder: 'Snmp community for v1 v2c'
  # field-param field key
  - field: timeout
    # name-param field display i18n name
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,100000]'
    # required-true or false
    required: false
    # hide-is hide this field and put it in advanced layout
    hide: true
    # default value
    defaultValue: 6000
# collect metrics config list
metrics:
  # metrics - system
  - name: system
    # metrics group scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics group is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), instance-if is metrics group unique identifier
      - field: name
        type: 1
      - field: descr
        type: 1
      - field: uptime
        type: 1
      - field: numUsers
        type: 0
      - field: services
        type: 0
      - field: processes
        type: 0
      - field: responseTime
        type: 0
        unit: ms
      - field: location
        type: 1
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: snmp
    # the config content when protocol is snmp
    snmp:
      # server host: ipv4 ipv6 domain
      host: ^_^host^_^
      # server port
      port: ^_^port^_^
      # snmp connect timeout
      timeout: ^_^timeout^_^
      # snmp community
      community: ^_^community^_^
      # snmp version
      version: ^_^version^_^
      # snmp operation: get, walk
      operation: get
      # metrics oids: metric_name - oid_value
      oids:
        name: 1.3.6.1.2.1.1.5.0
        descr: 1.3.6.1.2.1.1.1.0
        uptime: 1.3.6.1.2.1.25.1.1.0
        numUsers: 1.3.6.1.2.1.25.1.5.0
        services: 1.3.6.1.2.1.1.7.0
        processes: 1.3.6.1.2.1.25.1.6.0
        location: 1.3.6.1.2.1.1.6.0
```
