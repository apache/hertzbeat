---
id: extend-ngql
title: NQGL自定义监控
sidebar_label: NGQL自定义监控
---

> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用NGQL自定义指标监控。
> NGQL自定义监控可以让我们很方便的使用NGQL或者OpenCypher从NebulaGraph图数据库中查询指标数据,支持NebulaGraph 3.X版本。

### 数据解析方式

NGQL查询回来的数据字段和我们需要的指标映射，就能获取对应的指标数据，目前映射解析方式有四种： filterCount, oneRow, multiRow, columns

#### **filterCount**

> 对查询返回的结果按照指定字段进行过滤后，统计数量，通常用于 `SHOW ...` 语句中，如果可以使用NGQL语句直接返回数量的，建议使用NGQL语句统计数量。  
> commands字段语法格式: aliasField#NGQL#filterName#filterValue  
> `aliasField`: 对应监控模板中的`aliasFields`中的值  
> `NGQL`: 查询语句  
> `filterName`: 过滤属性名称（可选）  
> `filterValue`: 过滤属性值（可选）

例如：

- online_meta_count#SHOW HOSTS META#Status#ONLINE  
对 `SHOW HOSTS META` 返回的结果中统计滤Status==ONLINE的数量
- online_meta_count#SHOW HOSTS META##  
统计 `SHOW HOSTS META` 返回的行数

#### **oneRow**

> 查询一行数据, 通过查询返回结果集的列名称，和查询的字段映射

例如：

- 查询的指标字段为：a,b
- 查询NGQL：match (v:metrics) return v.metrics.a as a,v.metrics.b as b;

这里指标字段就能和响应数据一一映射为一行采集数据。

注意事项：

- 使用 `oneRow` 方式时单条查询语句返回多行结果时只会使用第一行结果映射到指标字段；
- 当 `commands` 字段包含两条及两条以上查询语句时，如果多条查询语句返回的字段相同时，后一条语句返回的字段会覆盖前一条；
- 定义 `commands` 时建议使用 limit 语句限制返回结果集的行数；

#### **multiRow**

> 查询多行数据, 通过查询返回结果集的列名称，和查询的字段映射

例如：

- 查询的指标字段为：a,b  
- 查询NGQL：match (v:metrics) return v.metrics.a as a,v.metrics.b as b;
这里指标字段就能和响应数据一一映射为多行采集数据。

注意事项：

- 使用 `multiRow` 方式时，`commands` 字段只能包含一条查询语句

#### **columns**

> 采集一行指标数据, 通过查询的两列数据(key-value)，key和查询的字段匹配，value为查询字段的值

注意事项：

- 使用 `columns` 方式时，会默认使用结果集的前两列映射采集数据，第一列数据对应指标名称，第二列对应指标值；
- 当 `commands` 字段包含两条及两条以上查询语句时，如果多条查询语句返回的第一列数据有重复，会使用保留最后一条的结果；

### 自定义步骤

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

下面详细介绍下文件的配置用法，请注意看使用注释。

### 监控模板YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为example_ngql的自定义监控类型，其使用NGQL采集指标数据。

```yaml
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: db
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_ngql
name:
  zh-CN: NGQL自定义监控应用
  en-US: NGQL Custom APP
# 监控参数定义. field 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# 这个部分通常不用修改
params:
  # field-param field key
  - field: host
    name:
      zh-CN: 目标Host
      en-US: Target Host
    type: host
    required: true
  - field: graphPort
    name:
      zh-CN: graph端口
      en-US: graphPort
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 9669
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    required: true
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: true
  - field: spaceName
    name:
      zh-CN: 图空间
      en-US: Space Name
    type: text
    required: false
  - field: timeout
    name:
      zh-CN: 连接超时时间(ms)
      en-US: Connect Timeout(ms)
    type: number
    unit: ms
    range: '[0,100000]'
    required: true
    defaultValue: 6000
# 采集指标配置列表
metrics:
  - name: base_info
    i18n:
      zh-CN: 节点统计
      en-US: Vertex statistics
    priority: 0
    fields:
      - field: tag1
        type: 1
        i18n:
          zh-CN: tag1
          en-US: tag1
      - field: tag1
        type: 1
        i18n:
          zh-CN: tag2
          en-US: tag2
    aliasFields:
      - tag1
      - tag2
    protocol: ngql
    ngql:
      host: ^_^host^_^
      username: ^_^username^_^
      password: ^_^password^_^
      port: ^_^graphPort^_^
      spaceName: ^_^spaceName^_^
      parseType: columns
      # 定义采集数据使用的查询语句
      commands:
        - match (v:tag1) return "tag1" as name ,count(v) as cnt 
        - match (v:tag2) return "tag2" as name ,count(v) as cnt
      timeout: ^_^timeout^_^
```
