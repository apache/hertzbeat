---
id: oracle  
title: 监控：ORACLE数据库监控      
sidebar_label: ORACLE数据库   
keywords: [开源监控系统, 开源数据库监控, Oracle数据库监控]
---

> 对ORACLE数据库的通用性能指标进行采集监控。

### 注意, 必须添加 ORACLE jdbc 驱动 jar

- 下载 ORACLE jdbc 驱动 jar 包，例如 [ojdbc8.jar](https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.4.0.24.05/ojdbc8-23.4.0.24.05.jar) [oracle-i18n](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar)
- 将 jar 包复制到 `hertzbeat/ext-lib` 目录下。
- 重启 HertzBeat 服务。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 数据库对外提供的端口，默认为1521。                                  |
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

|       指标名称       | 指标单位 | 指标帮助描述  |
|------------------|------|---------|
| database_version | 无    | 数据库版本   |
| database_type    | 无    | 数据库类型   |
| hostname         | 无    | 主机名称    |
| instance_name    | 无    | 数据库实例名称 |
| startup_time     | 无    | 数据库启动时间 |
| status           | 无    | 数据库状态   |

#### 指标集合：tablespace

|      指标名称       | 指标单位 | 指标帮助描述  |
|-----------------|------|---------|
| file_id         | 无    | 文件ID    |
| file_name       | 无    | 文件名称    |
| tablespace_name | 无    | 所属表空间名称 |
| status          | 无    | 状态      |
| bytes           | MB   | 大小      |
| blocks          | 无    | 区块数量    |

#### 指标集合：user_connect

|   指标名称   | 指标单位 | 指标帮助描述 |
|----------|------|--------|
| username | 无    | 用户名    |
| counts   | 个数   | 当前连接数量 |

#### 指标集合：performance

| 指标名称 | 指标单位 |                指标帮助描述                 |
|------|------|---------------------------------------|
| qps  | QPS  | I/O Requests per Second 每秒IO请求数量      |
| tps  | TPS  | User Transaction Per Sec 每秒用户事物处理数量   |
| mbps | MBPS | I/O Megabytes per Second 每秒 I/O 兆字节数量 |
