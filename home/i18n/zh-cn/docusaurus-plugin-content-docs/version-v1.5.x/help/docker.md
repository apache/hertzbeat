---
id: docker
title: 监控：Docker 监控      
sidebar_label: Docker 容器监控
keywords: [开源监控系统, 开源容器监控, Docker容器监控]
---

> 对Docker容器的通用性能指标进行采集监控。

## 监控前操作

如果想要监控 `Docker` 中的容器信息，则需要按照一下步骤打开端口，让采集请求获取到对应的信息。

**1、编辑docker.server文件：**

```shell
vi /usr/lib/systemd/system/docker.service
```

找到 **[Service]** 节点，修改 ExecStart 属性，增加 `-H tcp://0.0.0.0:2375`

```shell
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock -H tcp://0.0.0.0:2375
```

这样相当于对外开放的是 **2375** 端口，当然也可以根据自己情况修改成其他的。

**2、重新加载Docker配置生效：**

```shell
systemctl daemon-reload 
systemctl restart docker 
```

**注意：记得在服务器中打开 `2375` 端口号。**

**3、如果上述方法不行则：**

在服务器内部打开 `2375` 端口号。

```shell
firewall-cmd --zone=public --add-port=2375/tcp --permanent
firewall-cmd --reload
```

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 监控Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口     | 数据库对外提供的端口，默认为2375。                                  |
| 查询超时时间 | 设置获取Docker服务器API接口时的超时时间，单位ms毫秒，默认3000毫秒。            |
| 器名称    | 一般是监控所有运行中的容器信息。                                     |
| 用户名    | 连接用户名，可选                                             |
| 密码     | 连接密码，可选                                              |
| URL    | 数据库连接URL，可选，若配置，则URL里面的数据库名称，用户名密码等参数会覆盖上面配置的参数      |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测   | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：system

|        指标名称        | 指标单位 |             指标帮助描述             |
|--------------------|------|--------------------------------|
| Name               | 无    | 服务器名称                          |
| version            | 无    | docker本版号                      |
| os                 | 无    | 服务器版本 例如：linux x86_64          |
| root_dir           | 无    | docker文件夹目录 例如：/var/lib/docker |
| containers         | 无    | 容器总数（在运行+未运行）                  |
| containers_running | 无    | 运行中的容器数目                       |
| containers_paused  | 无    | 暂停中的容器数目                       |
| images             | 无    | 容器景象的总数目。                      |
| ncpu               | 无    | NCPU                           |
| mem_total          | MB   | 占用的内存总大小                       |
| system_time        | 无    | 系统时间                           |

#### 指标集合：containers

|  指标名称   | 指标单位 |     指标帮助描述     |
|---------|------|----------------|
| id      | 无    | Docker中容器的ID   |
| name    | 无    | Docker容器中的容器名称 |
| image   | 无    | Docker容器使用的镜像  |
| command | 无    | Docker中的默认启动命令 |
| state   | 无    | Docker中容器的运行状态 |
| status  | 无    | Docker容器中的更新时间 |

#### 指标集合：stats

|       指标名称       | 指标单位 |       指标帮助描述       |
|------------------|------|--------------------|
| name             | 无    | Docker容器中的名字       |
| available_memory | MB   | Docker容器可以利用的内存大小  |
| used_memory      | MB   | Docker容器已经使用的内存大小  |
| memory_usage     | 无    | Docker容器的内存使用率     |
| cpu_delta        | 无    | Docker容器已经使用的CPU数量 |
| number_cpus      | 无    | Docker容器可以使用的CPU数量 |
| cpu_usage        | 无    | Docker容器CPU使用率     |
