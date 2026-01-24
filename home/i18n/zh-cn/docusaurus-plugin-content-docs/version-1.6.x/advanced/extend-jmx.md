---
id: extend-jmx  
title: JMX协议自定义监控  
sidebar_label: JMX协议自定义监控
---

> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用JMX协议自定义指标监控。
> JMX协议自定义监控可以让我们很方便的通过配置 JMX Mbean Object 就能监控采集到我们想监控的 Mbean 指标

### JMX协议采集流程

【**对端JAVA应用暴露JMX服务**】->【**HertzBeat直连对端JMX服务**】->【**获取配置的 Mbean Object 数据**】->【**指标数据提取**】

由流程可见，我们自定义一个JMX协议的监控类型，需要配置JMX请求参数，配置获取哪些指标，配置查询Object信息。

### 数据解析方式

通过配置监控模板YML的指标`field`, `aliasFields`, `jmx` 协议的 `objectName` 来和对端系统暴露的 `Mbean`对象信息映射解析。

### 自定义步骤

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

下面详细介绍下监控模板的配置用法，请注意看使用注释。

### 监控模板YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为 `example_jvm` 的自定义监控类型，其使用JMX协议采集指标数据。

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: service
# The monitoring type eg: linux windows tomcat mysql aws...
# 监控类型 eg: linux windows tomcat mysql aws...
app: example_jvm
# The monitoring i18n name
# 监控类型国际化名称
name:
  zh-CN: 自定义JVM虚拟机
  en-US: CUSTOM JVM
# Input params define for monitoring(render web ui by the definition)
# 监控所需输入参数定义(根据定义渲染页面UI)
params:
  # field-param field key
  # field-字段名称标识符
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
    # 是否是必输项 true-必填 false-可选
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
    # 端口默认值
    defaultValue: 9999
  # field-param field key
  # field-变量字段标识符
  - field: url
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: JMX URL
      en-US: JMX URL
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: text
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: false
    # hide param-true or false
    # 是否隐藏字段 true or false
    hide: true
    # param field input placeholder
    # 参数输入框提示信息
    placeholder: 'service:jmx:rmi:///jndi/rmi://host:port/jmxrmi'
  # field-param field key
  # field-变量字段标识符
  - field: username
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 用户名
      en-US: Username
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: text
    # when type is text, use limit to limit string length
    # 当type为text时,用limit表示字符串限制大小
    limit: 50
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: false
    # hide param-true or false
    # 是否隐藏字段 true or false
    hide: true
  # field-param field key
  # field-变量字段标识符
  - field: password
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 密码
      en-US: Password
    # type-param field type(most mapping the html input tag)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: password
    # required-true or false
    # required-是否是必输项 true-必填 false-可选
    required: false
    # hide param-true or false
    # 是否隐藏字段 true or false
    hide: true
# collect metrics config list
# 采集指标配置列表
metrics:
  # metrics - basic
  # 监控指标 - basic
  - name: basic
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    # 指标采集调度优先级(0->127)->(优先级高->低) 优先级低的指标会等优先级高的指标采集完成后才会被调度, 相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # collect metrics content
    # 具体监控指标列表
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      # field-指标名称, type-指标类型(0-number数字,1-string字符串), unit-指标单位('%','ms','MB'), label-是否是指标集合唯一标识符字段
      - field: VmName
        type: 1
      - field: VmVendor
        type: 1
      - field: VmVersion
        type: 1
      - field: Uptime
        type: 0
        unit: ms
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    # 用于监控的协议，例: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: jmx
    # the config content when protocol is jmx
    jmx:
      # host: ipv4 ipv6 domain
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # port
      # 端口
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      # jmx mbean object name
      # jmx mbean 对象名称
      objectName: java.lang:type=Runtime
      url: ^_^url^_^

  - name: memory_pool
    priority: 1
    fields:
      - field: name
        type: 1
        label: true
      - field: committed
        type: 0
        unit: MB
      - field: init
        type: 0
        unit: MB
      - field: max
        type: 0
        unit: MB
      - field: used
        type: 0
        unit: MB
    units:
      - committed=B->MB
      - init=B->MB
      - max=B->MB
      - used=B->MB
    # (optional)metrics field alias name, it is used as an alias field to map and convert the collected data and metrics field
    # (可选)监控指标别名, 做为中间字段与采集数据字段和指标字段映射转换
    aliasFields:
      - Name
      - Usage->committed
      - Usage->init
      - Usage->max
      - Usage->used
    # mapping and conversion expressions, use these and aliasField above to calculate metrics value
    # (可选)指标映射转换计算表达式,与上面的别名一起作用,计算出最终需要的指标值
    # eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - name=Name
      - committed=Usage->committed
      - init=Usage->init
      - max=Usage->max
      - used=Usage->used
    protocol: jmx
    jmx:
      # host: ipv4 ipv6 domain
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # port
      # 端口
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      objectName: java.lang:type=MemoryPool,name=*
      url: ^_^url^_^
```
