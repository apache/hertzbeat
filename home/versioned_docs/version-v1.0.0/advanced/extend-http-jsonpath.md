---
id: extend-http-jsonpath  
title: HTTP协议JsonPath解析方式  
sidebar_label: JsonPath解析方式
---
> HTTP接口调用获取响应数据后，用JsonPath脚本解析的解析方式去解析响应数据。

注意⚠️ 响应数据为JSON格式

**使用JsonPath脚本将响应数据解析成符合HertzBeat指定的数据结构规则的数据**  

#### JsonPath操作符   
[JSONPath在线验证](https://www.jsonpath.cn)     

| JSONPATH      | 帮助描述 |
| ----------- | ----------- |
| $     | 根对象或元素 |
| @     | 当前对象或元素 |
| . or [] | 子元素操作符 |
| ..    | 递归匹配所有子元素 |
| *     | 通配符. 匹配所有对象或元素. |
| []     | 下标运算符，JsonPath索引从0开始 |
| [,]     | 连接运算符，将多个结果拼成数组返回，JSONPath允许使用别名. |
| [start:end:step]     | 数组切片运算符 |
| ?()     | 过滤器（脚本）表达式. |
| ()     | 脚本表达式. |

#### HertzBeat数据格式规范    
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

#### 样例   

查询自定义系统的数值信息，其暴露接口为 `/metrics/person`，我们需要其中的`type,num`指标      
接口返回的原始数据如下：  
```json
{
  "firstName": "John",
  "lastName" : "doe",
  "age"      : 26,
  "address"  : {
    "streetAddress": "naist street",
    "city"         : "Nara",
    "postalCode"   : "630-0192"
  },
  "number": [
    {
      "type": "core",
      "num": 3343
    },
    {
      "type": "home",
      "num": 4543
    }
  ]
}
```

我们使用JsonPath脚本解析，对应的脚本为: `$.number[*]` ，解析后的数据结构如下：  
```json
[
  {
    "type": "core",
    "num": 3343
  },
  {
    "type": "home",
    "num": 4543
  }
]
```
此数据结构符合HertzBeat的数据格式规范，成功提取指标`type,num`值。   

**对应的监控配置定义文件YML可以配置为如下**   

```yaml
# 此监控类型所属类别：service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
category: custom
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example
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
# 指标组列表
metrics:
# 第一个监控指标组 person
# 注意：内置监控指标有 (responseTime - 响应时间)
  - name: cpu
    # 指标组调度优先级(0-127)越小优先级越高,优先级低的指标组会等优先级高的指标组采集完成后才会被调度,相同优先级的指标组会并行调度采集
    # 优先级为0的指标组为可用性指标组,即它会被首先调度,采集成功才会继续调度其它指标组,采集失败则中断调度
    priority: 0
    # 指标组中的具体监控指标
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
      - field: type
        type: 1
        instance: true
      - field: num
        type: 0
# 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
# 当protocol为http协议时具体的采集配置
    http:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      # url请求接口路径
      url: /metrics/person
      # 请求方式 GET POST PUT DELETE PATCH
      method: GET
      # 是否启用ssl/tls,即是http还是https,默认false
      ssl: false
      # 响应数据解析方式: default-系统规则,jsonPath-jsonPath脚本,website-网站可用性指标监控
      # 这里使用jsonPath解析
      parseType: $.number[*] 
```
