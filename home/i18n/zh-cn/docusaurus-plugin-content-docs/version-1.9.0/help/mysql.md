---
id: mysql  
title: 监控：MYSQL数据库监控      
sidebar_label: MYSQL数据库   
keywords: [开源监控系统, 开源数据库监控, Mysql数据库监控]
---

> 对MYSQL数据库的通用性能指标进行采集监控。支持MYSQL5+。

## 驱动选择说明

HertzBeat 现在支持两条 MySQL 查询链路：

- 如果在 `ext-lib` 中放入了 `mysql-connector-j`，JVM 采集器或主程序内置采集器会自动优先走 JDBC。
- 如果没有放入 `mysql-connector-j`，HertzBeat 会自动切换到内置 MySQL 查询引擎，不需要额外复制 JAR。
- 每次增删 `ext-lib` 里的驱动后，都需要重启 HertzBeat 或独立 JVM 采集器。
- 自动分流只检查 `ext-lib`。如果你想显式指定链路，可以配置 `hertzbeat.collector.mysql.query-engine=jdbc`、`r2dbc` 或 `auto`。

:::important 采集器包选择
MySQL 监控现在既支持 JVM 部署，也支持 Native 部署。

- 主程序内置采集器或 JVM 采集器安装包：当 `ext-lib` 中存在 `mysql-connector-j` 时会自动优先走 JDBC
- Native 采集器安装包：在不依赖 `ext-lib` 时可直接使用内置 MySQL 查询引擎
- 如果你明确需要运行时 `ext-lib` JDBC 加载能力，请选择 JVM 采集器安装包
:::

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 数据库对外提供的端口，默认为3306。                                  |
| 查询超时时间 | 设置SQL查询未响应数据时的超时时间，单位ms毫秒，默认3000毫秒。                  |
| 数据库名称  | 数据库实例名称，可选。                                          |
| 用户名    | 数据库连接用户名，可选                                          |
| 密码     | 数据库连接密码，可选                                           |
| URL    | 数据库连接URL，可选，若配置，则URL里面的数据库名称，用户名密码等参数会覆盖上面配置的参数      |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：basic

|      指标名称       | 指标单位 |   指标帮助描述   |
|-----------------|------|------------|
| version         | 无    | 数据库版本      |
| port            | 无    | 数据库暴露服务端口  |
| datadir         | 无    | 数据库存储数据盘地址 |
| max_connections | 无    | 数据库最大连接数   |

#### 指标集合：status

|       指标名称        | 指标单位 |     指标帮助描述     |
|-------------------|------|----------------|
| threads_created   | 无    | MySql已经创建的总连接数 |
| threads_connected | 无    | MySql已经连接的连接数  |
| threads_cached    | 无    | MySql当前缓存的连接数  |
| threads_running   | 无    | MySql当前活跃的连接数  |

#### 指标集合：innodb

|        指标名称         | 指标单位 |         指标帮助描述          |
|---------------------|------|-------------------------|
| innodb_data_reads   | 无    | innodb平均每秒从文件中读取的次数     |
| innodb_data_writes  | 无    | innodb平均每秒从文件中写入的次数     |
| innodb_data_read    | KB   | innodb平均每秒钟读取的数据量，单位为KB |
| innodb_data_written | KB   | innodb平均每秒钟写入的数据量，单位为KB |
