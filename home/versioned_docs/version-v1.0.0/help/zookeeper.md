---
id: zookeeper  
title: 监控：Zookeeper监控      
sidebar_label: Zookeeper监控  
---

> 对Zookeeper的通用性能指标进行采集监控

### 配置参数

| 参数名称      | 参数帮助描述 |
| ----------- | ----------- |
| 监控Host     | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 监控名称     | 标识此监控的名称，名称需要保证唯一性。  |
| 端口        | Zookeeper对外提供的端口，默认为2181。  |
| 查询超时时间 | 设置Zookeeper连接的超时时间，单位ms毫秒，默认3000毫秒。  |
| 用户名      | Zookeeper所在Linux连接用户名 |
| 密码        | Zookeeper所在Linux连接密码 |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒  |
| 是否探测    | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作  |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息  |

### 采集指标

#### 指标集合：conf

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- | ----------- | ----------- |
| clientPort         | 无 | 端口 |
| dataDir            | 无 | 数据快照文件目录，默认10万次操作生成一次快照 |
| dataDirSize         | kb | 数据快照文件大小 |
| dataLogDir | 无 | 事务日志文件目录，生产环境放在独立磁盘上 |
| dataLogSize | kb | 事务日志文件大小 |
| tickTime | ms | 服务器之间或客户端与服务器之间维持心跳的时间间隔 |
| minSessionTimeout | ms| 最小session超时时间 心跳时间x2 指定时间小于该时间默认使用此时间 |
| maxSessionTimeout | ms |最大session超时时间 心跳时间x20 指定时间大于该时间默认使用此时间 |
| serverId | 无 | 服务器编号 |


#### 指标集合：stats

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- | ----------- | ----------- |
| zk_version         | 无 | 服务器版本 |
| zk_server_state            | 无 | 服务器角色 |
| zk_num_alive_connections         | 个 | 连接数 |
| zk_avg_latency | ms | 平均延时 |
| zk_outstanding_requests         | 个 | 堆积请求数 |
| zk_znode_count            | 个 | znode结点数量 |
| zk_packets_sent         | 个 | 发包数 |
| zk_packets_received | 个 | 收包数 |
| zk_watch_count         | 个 | watch数量 |
| zk_max_file_descriptor_count            | 个 | 最大文件描述符数量 |
| zk_approximate_data_size         | kb | 数据大小 |
| zk_open_file_descriptor_count | 个 | 打开的文件描述符数量 |
| zk_max_latency            | ms | 最大延时 |
| zk_ephemerals_count         | 个 | 临时节点数 |
| zk_min_latency | ms | 最小延时 |


# 注意
## zookeeper四字命令
>目前的实现方案使用的是zookeeper提供的四字命令来收集指标
需要用户自己将zookeeper的四字命令加入白名单

加白步骤
> 1.找到我们zookeeper的配置文件，一般是zoo.cfg 
> 
> 2.配置文件中加入以下命令   

```shell
# 将需要的命令添加到白名单中
4lw.commands.whitelist=stat, ruok, conf, isro

# 将所有命令添加到白名单中
4lw.commands.whitelist=*
```

> 3.重启服务   

```shell 
zkServer.sh restart
```

## netcat协议
目前实现方案需要我们部署zookeeper的linux服务器
安装netcat的命令环境

> netcat安装步骤   
```shell
yum install -y nc
```

如果终端显示以下信息则说明安装成功   
```shell
Complete!
```
