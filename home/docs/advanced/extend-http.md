---
id: extend-http  
title: HTTP协议自定义监控  
sidebar_label: HTTP协议自定义监控    
---
> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用HTTP协议自定义指标监控。   

### HTTP协议采集流程    
【**HTTP接口调用**】->【**响应校验**】->【**响应数据解析**】->【**默认方式解析｜JsonPath脚本解析 | XmlPath解析(todo) | Prometheus解析(todo)**】->【**指标数据提取**】

由流程可见，我们自定义一个HTTP协议的监控类型，需要配置HTTP请求参数，配置获取哪些指标，对响应数据配置解析方式和解析脚本。      
HTTP协议支持我们自定义HTTP请求路径，请求header，请求参数，请求方式，请求体等。   

**系统默认解析方式**：http接口返回hertzbeat规定的json数据结构，即可用默认解析方式解析数据提取对应的指标数据，详细介绍见 [**系统默认解析**](extend-http-default)    
**JsonPath脚本解析方式**：用JsonPath脚本对响应的json数据进行解析，返回系统指定的数据结构，然后提供对应的指标数据，详细介绍见 [**JsonPath脚本解析**](extend-http-jsonpath)    
  

### 自定义步骤  

配置自定义监控类型需新增配置两个YML文件
1. 用监控类型命名的监控配置定义文件 - 例如：example.yml 需位于安装目录 /hertzbeat/define/app/ 下
2. 用监控类型命名的监控参数定义文件 - 例如：example.yml 需位于安装目录 /hertzbeat/define/param/ 下
3. 重启hertzbeat系统，我们就适配好了一个新的自定义监控类型。

------- 
下面详细介绍下这俩文件的配置用法，请注意看使用注释。   

### 监控配置定义文件   

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数映射, 指标信息, 采集协议配置信息*等。  

样例：自定义一个名称为example_http的自定义监控类型，其使用HTTP协议采集指标数据。    
文件名称: example_http.yml 位于 /define/app/example_http.yml   

```yaml
# 此监控类型所属类别：service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
category: custom
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_http
name:
  zh-CN: 模拟应用类型
  en-US: EXAMPLE APP
# 参数映射map. 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# type是参数类型: 0-number数字, 1-string明文字符串, 2-secret加密字符串
# 强制固定必须参数 - host
configmap:
  - key: host
    type: 1
  - key: port
    type: 0
  - key: username
    type: 1
  - key: password
    type: 2
# 指标组列表
metrics:
# 第一个监控指标组 cpu
# 注意：内置监控指标有 (responseTime - 响应时间)
  - name: cpu
    # 指标组调度优先级(0-127)越小优先级越高,优先级低的指标组会等优先级高的指标组采集完成后才会被调度,相同优先级的指标组会并行调度采集
    # 优先级为0的指标组为可用性指标组,即它会被首先调度,采集成功才会继续调度其它指标组,采集失败则中断调度
    priority: 0
    # 指标组中的具体监控指标
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
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
# (非必须)监控指标别名，与上面的指标名映射。用于采集接口数据字段不直接是最终指标名称,需要此别名做映射转换
    aliasFields:
      - hostname
      - core1
      - core2
      - usage
      - allTime
      - runningTime
# (非必须)指标计算表达式,与上面的别名一起作用,计算出最终需要的指标值
# eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - hostname=hostname
      - cores=core1+core2
      - usage=usage
      - waitTime=allTime-runningTime
# 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
# 当protocol为http协议时具体的采集配置
    http:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      # url请求接口路径
      url: /metrics/cpu
      # 请求方式 GET POST PUT DELETE PATCH
      method: GET
      # 是否启用ssl/tls,即是http还是https,默认false
      ssl: false
      # 请求头内容
      headers:
        apiVersion: v1
      # 请求参数内容
      params:
        param1: param1
        param2: param2
      # 认证
      authorization:
        # 认证方式: Basic Auth, Digest Auth, Bearer Token
        type: Basic Auth
        basicAuthUsername: ^_^username^_^
        basicAuthPassword: ^_^password^_^
      # 响应数据解析方式: default-系统规则,jsonPath-jsonPath脚本,website-网站可用性指标监控
      # todo xmlPath-xmlPath脚本,prometheus-Prometheus数据规则
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

### 监控参数定义文件  

> 监控参数定义文件用于定义 *需要的输入参数字段结构定义(前端页面根据结构渲染输入参数框)*。   

样例：自定义一个名称为example_http的自定义监控类型，其使用HTTP协议采集指标数据。    
文件名称: example_http.yml 位于 //define/param/example_http.yml   

```yaml
# 监控应用类型名称(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_http
# 强制固定必须参数 - host(ipv4,ipv6,域名)
param:
    # field-字段名称标识符
  - field: host
    # name-参数字段显示名称
    name: 主机Host
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # 是否是必输项 true-必填 false-可选
    required: true
  - field: port
    name: 端口
    type: number
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    required: true
    # 端口默认值
    defaultValue: 80
    # 参数输入框提示信息
    placeholder: '请输入端口'
  - field: username
    name: 用户名
    type: text
    # 当type为text时,用limit表示字符串限制大小
    limit: 20
    required: false
  - field: password
    name: 密码
    type: password
    required: false
  - field: ssl
    name: 启动SSL
    # 当type为boolean时,前端用switch展示开关
    type: boolean
    required: false
  - field: method
    name: 请求方式
    type: radio
    required: true
    # 当type为radio单选框,checkbox复选框时,option表示可选项值列表 {name1:value1,name2:value2}
    options:
      - label: GET请求
        value: GET
      - label: POST请求
        value: POST
      - label: PUT请求
        value: PUT
      - label: DELETE请求
        value: DELETE
```
