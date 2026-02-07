---
id: jenkins
title: 监控：Jenkins
sidebar_label: Jenkins
keywords: [ 开源监控系统, CI/CD, DevOps, Jenkins监控 ]
---

> 通过调用 Jenkins Prometheus Plugin 对 Jenkins 的通用指标进行采集监控。

### 前置条件

1. 按照[部署文档](https://www.jenkins.io/doc/book/installing/)搭建好Jenkins相关服务。
2. 需要安装[插件](https://www.jenkins.io/doc/book/managing/plugins/)
   已用来访问暴露的指标信息，可参考[prometheus-plugin](https://plugins.jenkins.io/prometheus/)。
3. 对外暴露指标的地址是```<jenkin_url>/prometheus```，查看是否能访问到metrics数据。

## 配置参数

| 参数名称   | 参数帮助描述                                               |
|--------|------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 端口     | Jenkins Port值，默认为8080。                               |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 查询超时时间 | 设置连接的超时时间，单位ms毫秒，默认3000毫秒。                           |
| 监控周期   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 绑定标签   | 用于对监控资源进行分类管理                                        |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：系统信息指标

| 指标名称                         | 指标单位 | 指标帮助描述         |
|------------------------------|------|----------------|
| default_jenkins_uptime       | 毫秒   | Jenkins 运行时间   |
| default_jenkins_up           | 无    | Jenkins 是否存活   |
| default_jenkins_version_info | 无    | Jenkins 版本信息   |
| jenkins_health_check_score   | 无    | Jenkins 健康检查分值 |

#### 指标集合：jvm

| 指标名称                   | 指标单位 | 指标帮助描述        |
|------------------------|------|---------------|
| vm_uptime_milliseconds | 毫秒   | JVM 运行时间      |
| system_cpu_load        | 无    | 系统负载          |
| vm_count               | 无    | JVM 线程总数      |
| vm_memory_heap_max     | MB   | JVM可使用的最大内存限制 |
| vm_memory_heap_used    | MB   | JVM 当前使用的内存大小 |

#### 指标集合：基础信息指标

| 指标名称                                | 指标单位 | 指标帮助描述      |
|-------------------------------------|------|-------------|
| jenkins_project_count_value         | 无    | 项目数量        |
| jenkins_project_enabled_count_value | 无    | 已启用的项目数量    |
| jenkins_queue_size_value            | 无    | 构建队列中的任务数量  |
| jenkins_node_online_value           | 无    | 当前在线的构建节点数量 |

#### 指标集合：执行器信息指标

| 指标名称                                 | 指标单位 | 指标帮助描述     |
|--------------------------------------|------|------------|
| default_jenkins_executors_available  | 无    | 可用的执行器数量   |
| default_jenkins_executors_busy       | 无    | 忙碌的执行器数量   |
| default_jenkins_executors_connecting | 无    | 正在连接的执行器数量 |

#### 指标集合：任务信息指标

| 指标名称                                                     | 指标单位                        | 指标帮助描述          |
|----------------------------------------------------------|-----------------------------|-----------------|
| jenkins_job_count_value                                  | 无                           | 作业数量            |
| default_jenkins_builds_duration_milliseconds_summary_sum | 毫秒                          | 任务构建时长汇总        |
| default_jenkins_builds_last_build_duration_milliseconds  | 毫秒                          | 最近一次构建的构建时间     |
| default_jenkins_builds_success_build_count_total         | 无                           | 构建成功次数          |
| default_jenkins_builds_failed_build_count_total          | 无                           | 构建失败次数          |
| default_jenkins_builds_unstable_build_count_total        | 无                           | 不稳定构建次数         |
| default_jenkins_builds_total_build_count_total           | 无                           | 总构建次数（不包括未构建状态） |
| default_jenkins_builds_last_build_result_ordinal         | 0=成功，1=不稳定，2=失败，3=未构建，4=已中止 | 任务构建状态（最近一次构建）  |
