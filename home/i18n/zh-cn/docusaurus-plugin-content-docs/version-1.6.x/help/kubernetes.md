---
id: kubernetes
title: 监控：Kubernetes 监控      
sidebar_label: Kubernetes 监控
keywords: [开源监控系统, 开源Kubernetes监控]
---

> 对kubernetes的通用性能指标进行采集监控。

## 监控前操作

如果想要监控 `Kubernetes` 中的信息，则需要获取到可访问Api Server的授权TOKEN，让采集请求获取到对应的信息。

参考获取token步骤

### 方式一

1. 创建service account并绑定默认cluster-admin管理员集群角色

    ```kubectl create serviceaccount dashboard-admin -n kube-system```

2. 用户授权

    ```shell
    kubectl create clusterrolebinding dashboard-admin --clusterrole=cluster-admin --serviceaccount=kube-system:dashboard-admin
    kubectl -n kube-system get secret | grep dashboard-admin | awk '{print $1}'
    kubectl describe secret {secret} -n kube-system
    ```

### 方式二

```shell
kubectl create serviceaccount cluster-admin

kubectl create clusterrolebinding cluster-admin-manual --clusterrole=cluster-admin --serviceaccount=default:cluster-admin

kubectl create token --duration=1000h cluster-admin

```

### 配置参数

|    参数名称     |                        参数帮助描述                        |
|-------------|------------------------------------------------------|
| 监控Host      | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称        | 标识此监控的名称，名称需要保证唯一性。                                  |
| APiServer端口 | K8s APiServer端口，默认6443                               |
| token       | 授权Access Token                                       |
| URL         | 数据库连接URL，可选，若配置，则URL里面的数据库名称，用户名密码等参数会覆盖上面配置的参数      |
| 采集间隔        | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测        | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注        | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：nodes

|        指标名称        | 指标单位 | 指标帮助描述 |
|--------------------|------|--------|
| node_name          | 无    | 节点名称   |
| is_ready           | 无    | 节点状态   |
| capacity_cpu       | 无    | CPU容量  |
| allocatable_cpu    | 无    | 已分配CPU |
| capacity_memory    | 无    | 内存容量   |
| allocatable_memory | 无    | 已分配内存  |
| creation_time      | 无    | 节点创建时间 |

#### 指标集合：namespaces

|     指标名称      | 指标单位 |   指标帮助描述    |
|---------------|------|-------------|
| namespace     | 无    | namespace名称 |
| status        | 无    | 状态          |
| creation_time | 无    | 创建时间        |

#### 指标集合：pods

|     指标名称      | 指标单位 |     指标帮助描述     |
|---------------|------|----------------|
| pod           | 无    | pod名称          |
| namespace     | 无    | pod所属namespace |
| status        | 无    | pod状态          |
| restart       | 无    | 重启次数           |
| host_ip       | 无    | 所在主机IP         |
| pod_ip        | 无    | pod ip         |
| creation_time | 无    | pod创建时间        |
| start_time    | 无    | pod启动时间        |

#### 指标集合：services

|     指标名称      | 指标单位 |                         指标帮助描述                         |
|---------------|------|--------------------------------------------------------|
| service       | 无    | service名称                                              |
| namespace     | 无    | service所属namespace                                     |
| type          | 无    | service类型 ClusterIP NodePort LoadBalancer ExternalName |
| cluster_ip    | 无    | cluster ip                                             |
| selector      | 无    | tag selector匹配                                         |
| creation_time | 无    | 创建时间                                                   |
