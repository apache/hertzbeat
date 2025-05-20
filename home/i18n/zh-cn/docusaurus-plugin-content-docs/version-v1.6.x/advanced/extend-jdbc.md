---
id: extend-jdbc  
title: JDBC协议自定义监控  
sidebar_label: JDBC协议自定义监控
---

> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用JDBC(目前支持mysql,mariadb,postgresql,sqlserver)自定义指标监控。
> JDBC协议自定义监控可以让我们很方便的通过写SQL查询语句就能监控到我们想监控的指标

### JDBC协议采集流程

【**系统直连MYSQL**】->【**运行SQL查询语句**】->【**响应数据解析:oneRow, multiRow, columns**】->【**指标数据提取**】

由流程可见，我们自定义一个JDBC协议的监控类型，需要配置JDBC请求参数，配置获取哪些指标，配置查询SQL语句。

### 数据解析方式

SQL查询回来的数据字段和我们需要的指标映射，就能获取对应的指标数据，目前映射解析方式有三种：oneRow, multiRow, columns

#### **oneRow**

> 查询一行数据, 通过查询返回结果集的列名称，和查询的字段映射

例如：
查询的指标字段为：one tow three four
查询SQL：select one, tow, three, four from book limit 1;
这里指标字段就能和响应数据一一映射为一行采集数据。

#### **multiRow**

> 查询多行数据, 通过查询返回结果集的列名称，和查询的字段映射

例如：
查询的指标字段为：one tow three four
查询SQL：select one, tow, three, four from book;
这里指标字段就能和响应数据一一映射为多行采集数据。

#### **columns**

> 采集一行指标数据, 通过查询的两列数据(key-value)，key和查询的字段匹配，value为查询字段的值

例如：
查询字段：one tow three four
查询SQL：select key, value from book;
SQL响应数据：

|  key  | value |
|-------|-------|
| one   | 243   |
| two   | 435   |
| three | 332   |
| four  | 643   |

这里指标字段就能和响应数据的key映射,获取对应的value为其采集监控数据。

### 自定义步骤

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

下面详细介绍下文件的配置用法，请注意看使用注释。

### 监控模板YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为example_sql的自定义监控类型，其使用JDBC协议采集指标数据。

```yaml
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: db
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_sql
name:
  zh-CN: 模拟MYSQL应用类型
  en-US: MYSQL EXAMPLE APP
# 监控参数定义. field 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# 强制固定必须参数 - host
params:
  - field: host
    name:
      zh-CN: 主机Host
      en-US: Host
    type: host
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 80
    placeholder: '请输入端口'
  - field: database
    name:
      zh-CN: 数据库名称
      en-US: Database
    type: text
    required: false
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    limit: 50
    required: false
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: false
  - field: url
    name:
      zh-CN: Url
      en-US: Url
    type: text
    required: false
# 采集指标配置列表
metrics:
  - name: basic
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # 具体监控指标列表
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: version
        type: 1
        label: true
      - field: port
        type: 1
      - field: datadir
        type: 1
      - field: max_connections
        type: 0
    # (非必须)监控指标别名，与上面的指标名映射。用于采集接口数据字段不直接是最终指标名称,需要此别名做映射转换
    aliasFields:
      - version
      - version_compile_os
      - version_compile_machine
      - port
      - datadir
      - max_connections
    # (非必须)指标计算表达式,与上面的别名一起作用,计算出最终需要的指标值
    # eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - port=port
      - datadir=datadir
      - max_connections=max_connections
      - version=version+"_"+version_compile_os+"_"+version_compile_machine
    protocol: jdbc
    jdbc:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      platform: mysql
      username: ^_^username^_^
      password: ^_^password^_^
      database: ^_^database^_^
      # SQL查询方式： oneRow, multiRow, columns
      queryType: columns
      # sql
      sql: show global variables where Variable_name like 'version%' or Variable_name = 'max_connections' or Variable_name = 'datadir' or Variable_name = 'port';
      url: ^_^url^_^

  - name: status
    priority: 1
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: threads_created
        type: 0
      - field: threads_connected
        type: 0
      - field: threads_cached
        type: 0
      - field: threads_running
        type: 0
    # (非必须)监控指标别名，与上面的指标名映射。用于采集接口数据字段不直接是最终指标名称,需要此别名做映射转换
    aliasFields:
      - threads_created
      - threads_connected
      - threads_cached
      - threads_running
    # (非必须)指标计算表达式,与上面的别名一起作用,计算出最终需要的指标值
    # eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - threads_created=threads_created
      - threads_connected=threads_connected
      - threads_cached=threads_cached
      - threads_running=threads_running
    protocol: jdbc
    jdbc:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      platform: mysql
      username: ^_^username^_^
      password: ^_^password^_^
      database: ^_^database^_^
      # SQL查询方式： oneRow, multiRow, columns
      queryType: columns
      # sql
      sql: show global status where Variable_name like 'thread%' or Variable_name = 'com_commit' or Variable_name = 'com_rollback' or Variable_name = 'questions' or Variable_name = 'uptime';
      url: ^_^url^_^

  - name: innodb
    priority: 2
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: innodb_data_reads
        type: 0
        unit: 次数
      - field: innodb_data_writes
        type: 0
        unit: 次数
      - field: innodb_data_read
        type: 0
        unit: kb
      - field: innodb_data_written
        type: 0
        unit: kb
    protocol: jdbc
    jdbc:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      platform: mysql
      username: ^_^username^_^
      password: ^_^password^_^
      database: ^_^database^_^
      # SQL查询方式： oneRow, multiRow, columns
      queryType: columns
      # sql
      sql: show global status where Variable_name like 'innodb%';
      url: ^_^url^_^
```
