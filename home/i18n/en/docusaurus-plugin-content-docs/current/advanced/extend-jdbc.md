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

| key      | value |
| ----------- | ----------- |
| one    | 243 |
| two    | 435 |
| three  | 332 |
| four   | 643 |

这里指标字段就能和响应数据的key映射,获取对应的value为其采集监控数据。     

### 自定义步骤  

配置自定义监控类型需新增配置两个YML文件
1. 用监控类型命名的监控配置定义文件 - 例如：example_sql.yml 需位于安装目录 /hertzbeat/define/app/ 下
2. 用监控类型命名的监控参数定义文件 - 例如：example_sql.yml 需位于安装目录 /hertzbeat/define/param/ 下
3. 重启hertzbeat系统，我们就适配好了一个新的自定义监控类型。

------- 
下面详细介绍下这俩文件的配置用法，请注意看使用注释。   

### 监控配置定义文件   

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数映射, 指标信息, 采集协议配置信息*等。  

样例：自定义一个名称为example_sql的自定义监控类型，其使用JDBC协议采集指标数据。    
文件名称: example_sql.yml 位于 /define/app/example_sql.yml   

```yaml
# 此监控类型所属类别：service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
category: db
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: example_sql
name:
  zh-CN: 模拟MYSQL应用类型
  en-US: MYSQL EXAMPLE APP
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
  - key: database
    type: 1
  - key: url
    type: 1
# 指标组列表
metrics:
  - name: basic
    # 指标组调度优先级(0-127)越小优先级越高,优先级低的指标组会等优先级高的指标组采集完成后才会被调度,相同优先级的指标组会并行调度采集
    # 优先级为0的指标组为可用性指标组,即它会被首先调度,采集成功才会继续调度其它指标组,采集失败则中断调度
    priority: 0
    # 指标组中的具体监控指标
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
      - field: version
        type: 1
        instance: true
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
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
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
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   instance是否为实例主键   unit:指标单位
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

### 监控参数定义文件

> 监控参数定义文件用于定义 *需要的输入参数字段结构定义(前端页面根据结构渲染输入参数框)*。

样例：自定义一个名称为example_sql的自定义监控类型，其使用JDBC协议采集指标数据。    
文件名称: example_sql.yml 位于 /define/param/example_sql.yml   

```yaml
app: example_sql
param:
  - field: host
    name: 主机Host
    type: host
    required: true
  - field: port
    name: 端口
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 80
    placeholder: '请输入端口'
  - field: database
    name: 数据库名称
    type: text
    required: false
  - field: username
    name: 用户名
    type: text
    limit: 20
    required: false
  - field: password
    name: 密码
    type: password
    required: false
  - field: url
    name: URL
    type: text
    required: false
```
