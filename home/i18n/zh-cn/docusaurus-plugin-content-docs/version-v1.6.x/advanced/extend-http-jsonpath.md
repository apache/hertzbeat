---
id: extend-http-jsonpath  
title: HTTP协议JsonPath解析方式  
sidebar_label: JsonPath解析方式
---

> HTTP接口调用获取响应数据后，用JsonPath脚本解析的解析方式去解析响应数据。

注意⚠️ 响应数据为JSON格式

**使用JsonPath脚本将响应数据解析成符合 Apache HertzBeat (incubating) 指定的数据结构规则的数据**

#### JsonPath操作符

[JSONPath在线验证](https://www.jsonpath.cn)

|     JSONPATH     |               帮助描述                |
|------------------|-----------------------------------|
| $                | 根对象或元素                            |
| @                | 当前对象或元素                           |
| . or []          | 子元素操作符                            |
| ..               | 递归匹配所有子元素                         |
| *                | 通配符. 匹配所有对象或元素.                   |
| []               | 下标运算符，JsonPath索引从0开始              |
| [,]              | 连接运算符，将多个结果拼成数组返回，JSONPath允许使用别名. |
| [start:end:step] | 数组切片运算符                           |
| ?()              | 过滤器（脚本）表达式.                       |
| ()               | 脚本表达式.                            |

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

**对应的监控模板YML可以配置为如下**

```yaml
category: custom
# 监控应用类型 eg: linux windows tomcat mysql aws...
app: example
name:
  zh-CN: 模拟应用类型
  en-US: EXAMPLE APP
# 监控参数定义. field 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# 强制固定必须参数 - host
params:
  # field-字段名称标识符
  - field: host
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # 是否是必输项 true-必填 false-可选
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    required: true
    # 端口默认值
    defaultValue: 80
    # 参数输入框提示信息
    placeholder: '请输入端口'
# collect metrics config list
# 采集指标配置列表
metrics:
  # metrics - cpu
  # 监控指标 - cpu
  - name: cpu
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # 具体监控指标列表
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: type
        type: 1
        label: true
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
      parseType: jsonPath
      parseScript: '$.number[*]' 
```
