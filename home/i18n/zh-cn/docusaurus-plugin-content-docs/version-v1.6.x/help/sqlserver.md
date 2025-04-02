---
id: sqlserver  
title: 监控：SqlServer数据库监控      
sidebar_label: SqlServer数据库   
keywords: [开源监控系统, 开源数据库监控, SqlServer数据库监控]
---

> 对SqlServer数据库的通用性能指标进行采集监控。支持SqlServer 2017+。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 数据库对外提供的端口，默认为1433。                                  |
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

|     指标名称     | 指标单位 |                      指标帮助描述                      |
|--------------|------|--------------------------------------------------|
| machine_name | 无    | 运行服务器实例的 Windows 计算机名称                           |
| server_name  | 无    | 与Windows实例关联的服务器和实例信息SQL Server                  |
| version      | 无    | 实例的版本，SQL Server，格式为"major.minor.build.revision" |
| edition      | 无    | 已安装的 实例的产品SQL Server版本                           |
| start_time   | 无    | 数据库启动时间                                          |

#### 指标集合：performance_counters

|          指标名称          | 指标单位 |                                       指标帮助描述                                        |
|------------------------|------|-------------------------------------------------------------------------------------|
| database_pages         | 无    | Database pages, 已获得的页面数(缓冲池)                                                        |
| target_pages           | 无    | Target pages, 缓冲池必须的理想页面数                                                           |
| page_life_expectancy   | s,秒  | Page life expectancy, 数据页在缓冲池中驻留的时间，这个时间一般会大于 300                                   |
| buffer_cache_hit_ratio | %    | Buffer cache hit ratio, 数据库缓冲池高速缓冲命中率，被请求的数据在缓冲池中被找到的概率，一般会大于 80% 才算正常，否则可能是缓冲池容量太小 |
| checkpoint_pages_sec   | 无    | Checkpoint pages/sec, 检查点每秒写入磁盘的脏页个数，如果数据过高，证明缺少内存容量                                |
| page_reads_sec         | 无    | Page reads/sec, 缓存池中每秒读的页数                                                          |
| page_writes_sec        | 无    | Page writes/sec, 缓存池中每秒写的页数                                                         |

#### 指标集合：connection

|      指标名称       | 指标单位 | 指标帮助描述  |
|-----------------|------|---------|
| user_connection | 无    | 已连接的会话数 |

### 常见问题

1. SSL连接问题修复

jdk版本：jdk11
问题描述：SQL Server2019使用SA用户连接报错
错误信息：

```text
The driver could not establish a secure connection to SQL Server by using Secure Sockets Layer (SSL) encryption. Error: "PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target". ClientConnectionId:xxxxxxxxxxxxxxxxx
```

问题截图：
![issue](https://user-images.githubusercontent.com/38679717/206621658-c0741d48-673d-45ff-9a3b-47d113064c12.png)

解决方案：  
添加`SqlServer`监控时使用高级设置，自定义JDBC URL，拼接的jdbc url后面加上参数配置，```;encrypt=true;trustServerCertificate=true;```这个参数true表示无条件信任server端返回的任何根证书。

样例：```jdbc:sqlserver://127.0.0.1:1433;DatabaseName=demo;encrypt=true;trustServerCertificate=true;```

参考文档：[microsoft pkix-path-building-failed-unable-to-find-valid-certification](https://techcommunity.microsoft.com/t5/azure-database-support-blog/pkix-path-building-failed-unable-to-find-valid-certification/ba-p/2591304)
