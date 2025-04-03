---
id: memcached
title: 监控 Memcached
sidebar_label: Memcached
keywords: [ 开源监控工具, 开源 Memcached 监控工具, 监控 memcached 指标 ]
---

> 收集并监控 Memcached 的一般性能指标。

**协议使用：Memcached**

```text
默认的 YML 配置适用于 Memcached 的版本为 1.4.15。
您需要使用 stats 命令查看您的 Memcached 可以监控的参数。
```

**1、通过 stats、stats setting、stats settings 等命令获取可用的参数指标。**

```shell
# telnet ip port
[root@server ~]# telnet localhost 11211
Trying ::1...
Connected to localhost.
Escape character is '^]'.
stats
STAT pid 15168
STAT uptime 11691
STAT time 1702569246
STAT version 1.4.15
...
```

**帮助文档: <https://www.runoob.com/memcached/memcached-stats.html>**

### 配置参数

| 参数名称 |                      参数帮助描述                       |
|------|---------------------------------------------------|
| 监控主机 | 被监控的 IPV4、IPV6 或域名。注意⚠️不带协议头（例如：https://，http://） |
| 监控名称 | 标识此监控的名称。名称需要唯一                                   |
| 端口   | Memcached 提供的端口                                   |
| 采集间隔 | 监控周期性数据采集的间隔时间，单位：秒，最小可设置间隔为 30 秒                 |
| 是否检测 | 添加监控前是否检测并检查可用性。仅在检测成功后才会继续添加和修改操作                |
| 描述备注 | 有关标识和描述此监控的更多信息，用户可以在此备注信息                        |

### 采集指标

#### 指标集：server_info

|       指标名称       | 指标单位 |      指标帮助描述       |
|------------------|------|-------------------|
| pid              | 无    | Memcache 服务器进程 ID |
| uptime           | s    | 服务器已运行的秒数         |
| version          | 无    | Memcache 版本       |
| curr_connections | 无    | 当前连接数             |
| auth_errors      | 无    | 认证失败次数            |
| threads          | 无    | 当前线程数             |
| item_size        | byte | 条目大小              |
| item_count       | 无    | 条目数量              |
| curr_items       | 无    | 当前存储的数据总数         |
| total_items      | 无    | 自启动以来存储的数据总数      |
| bytes            | byte | 当前存储占用的字节数        |
| cmd_get          | 无    | Get 命令请求数         |
| cmd_set          | 无    | Set 命令请求数         |
| cmd_flush        | 无    | Flush 命令请求数       |
| get_misses       | 无    | Get 命令未命中次数       |
| delete_misses    | 无    | Delete 命令未命中次数    |
