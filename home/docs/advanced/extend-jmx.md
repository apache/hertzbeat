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

通过配置监控模版YML的指标`field`, `aliasFields`, `jmx` 协议的 `objectName` 来和对端系统暴露的 `Mbean`对象信息映射解析。



### 自定义步骤

**HertzBeat页面** -> **监控模版菜单** -> **新增监控类型** -> **配置自定义监控模版YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![](/img/docs/advanced/extend-point-1.png)

------- 
下面详细介绍下文件的配置用法，请注意看使用注释。

### 监控模版YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。    
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为 example_jvm 的自定义监控类型，其使用SSH协议采集指标数据。


```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: service
# The monitoring type eg: linux windows tomcat mysql aws...
app: example_jvm
# The monitoring i18n name
name:
  zh-CN: 自定义JVM虚拟机
  en-US: CUSTOM JVM
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
    defaultValue: 9999
  # field-param field key
  - field: url
    # name-param field display i18n name
    name:
      zh-CN: JMX URL
      en-US: JMX URL
    # type-param field type(most mapping the html input type)
    type: text
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
    # param field input placeholder
    placeholder: 'service:jmx:rmi:///jndi/rmi://host:port/jmxrmi'
  # field-param field key
  - field: username
    # name-param field display i18n name
    name:
      zh-CN: 用户名
      en-US: Username
    # type-param field type(most mapping the html input type)
    type: text
    # when type is text, use limit to limit string length
    limit: 20
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
  # field-param field key
  - field: password
    # name-param field display i18n name
    name:
      zh-CN: 密码
      en-US: Password
    # type-param field type(most mapping the html input tag)
    type: password
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
# collect metrics config list
metrics:
  # metrics - basic
  - name: basic
    # metrics group scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics group is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), instance-if is metrics group unique identifier
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
    protocol: jmx
    # the config content when protocol is jmx
    jmx:
      # host: ipv4 ipv6 domain
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      # jmx mbean object name
      objectName: java.lang:type=Runtime
      url: ^_^url^_^

  - name: memory_pool
    priority: 1
    fields:
      - field: name
        type: 1
        instance: true
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
    aliasFields:
      - Name
      - Usage->committed
      - Usage->init
      - Usage->max
      - Usage->used
    # mapping and conversion expressions, use these and aliasField above to calculate metrics value
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
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      objectName: java.lang:type=MemoryPool,name=*
      url: ^_^url^_^
```
