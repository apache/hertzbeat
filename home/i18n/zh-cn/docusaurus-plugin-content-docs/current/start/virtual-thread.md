---
id: virtual-thread
title: 虚拟线程配置说明
sidebar_label: 虚拟线程
description: 说明 HertzBeat 虚拟线程执行器的默认值、回滚开关和调优方式。
---

HertzBeat 基于 JDK 21 运行，并把适合虚拟线程的阻塞型执行路径切到了虚拟线程模型。所有 `hertzbeat.vthreads` 配置项都是可选的。也就是说，即使升级 HertzBeat 后你没有把新的 YAML 配置块合并到原有 `application.yml`，系统也会使用内置默认值正常启动。

## 1. 到哪里配置

根据你的部署方式修改对应配置文件：

- 安装包部署：`hertzbeat/config/application.yml`
- Docker 单机部署：把本地 `application.yml` 挂载到容器内 `/opt/hertzbeat/config/application.yml`
- Docker Compose 部署：修改 `script/docker-compose/*/conf/application.yml`
- 独立 collector 部署：修改 `hertzbeat-collector/config/application.yml`

## 2. 不配置也可以

你可以完全不写 `hertzbeat.vthreads` 这一段：

```yaml
# 虚拟线程配置可以整体省略。
```

HertzBeat 会自动使用运行时默认值。

## 3. 完整可选配置模板

只有在你需要覆盖默认值时，才需要显式写出下面这段：

```yaml
hertzbeat:
  vthreads:
    enabled: true
    common:
      mode: UNBOUNDED_VT
    collector:
      mode: LIMIT_AND_REJECT
    manager:
      mode: LIMIT_AND_REJECT
      max-concurrent-jobs: 10
    alerter:
      notify:
        mode: LIMIT_AND_REJECT
        max-concurrent-jobs: 64
      periodic-max-concurrent-jobs: 10
      log-worker:
        max-concurrent-jobs: 10
        queue-capacity: 1000
      reduce:
        max-concurrent-jobs: 2
      window-evaluator:
        max-concurrent-jobs: 2
      notify-max-concurrent-per-channel: 4
    warehouse:
      mode: UNBOUNDED_VT
    async:
      enabled: true
      concurrency-limit: 256
      reject-when-limit-reached: true
      task-termination-timeout: 5000
```

## 4. 内置默认值

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `hertzbeat.vthreads.enabled` | `true` | HertzBeat 虚拟线程执行器总开关 |
| `hertzbeat.vthreads.common.mode` | `UNBOUNDED_VT` | 通用短任务执行器 |
| `hertzbeat.vthreads.collector.mode` | `LIMIT_AND_REJECT` | 保持采集入口快速拒绝语义 |
| `hertzbeat.vthreads.collector.max-concurrent-jobs` | `512` | 单机默认采集并发目标值 |
| `hertzbeat.vthreads.manager.mode` | `LIMIT_AND_REJECT` | 保持 manager 入口语义 |
| `hertzbeat.vthreads.manager.max-concurrent-jobs` | `10` | 与原来的限制一致 |
| `hertzbeat.vthreads.alerter.notify.mode` | `LIMIT_AND_REJECT` | 通知执行器入口控制 |
| `hertzbeat.vthreads.alerter.notify.max-concurrent-jobs` | `64` | 通知全局并发 |
| `hertzbeat.vthreads.alerter.notify-max-concurrent-per-channel` | `4` | 单通知通道/类型并发 |
| `hertzbeat.vthreads.alerter.periodic-max-concurrent-jobs` | `10` | 周期告警全局并发 |
| `hertzbeat.vthreads.alerter.log-worker.max-concurrent-jobs` | `10` | 日志告警短任务并发 |
| `hertzbeat.vthreads.alerter.log-worker.queue-capacity` | `1000` | 有界队列，保留 backlog 语义 |
| `hertzbeat.vthreads.alerter.reduce.max-concurrent-jobs` | `2` | 告警 reduce 并发 |
| `hertzbeat.vthreads.alerter.reduce.queue-capacity` | 无界 | 默认不填，保持旧版无界队列语义 |
| `hertzbeat.vthreads.alerter.window-evaluator.max-concurrent-jobs` | `2` | 窗口 evaluator 并发 |
| `hertzbeat.vthreads.alerter.window-evaluator.queue-capacity` | 无界 | 默认不填，保持旧版无界队列语义 |
| `hertzbeat.vthreads.warehouse.mode` | `UNBOUNDED_VT` | 仓储短任务执行；真实资源仍由下游连接池限制 |
| `hertzbeat.vthreads.async.enabled` | `true` | 专用 `@Async` 执行器开关 |
| `hertzbeat.vthreads.async.concurrency-limit` | `256` | `@Async` 并发保护阈值 |
| `hertzbeat.vthreads.async.reject-when-limit-reached` | `true` | 达到上限后拒绝额外 `@Async` 任务 |
| `hertzbeat.vthreads.async.task-termination-timeout` | `5000` | 单位毫秒 |

## 5. 调优建议

- 除非你已经明确知道某个下游资源比较脆弱，否则先使用默认值。
- collector 默认值刻意高于旧版按 CPU 推导的线程池上限，这样单独部署 HertzBeat 主程序时可以承载更多阻塞型采集任务，减少对额外 collector 的依赖。
- 当 collector 连接的是小规格数据库、低容量 HTTP 服务或脆弱网络设备时，再下调 `collector.max-concurrent-jobs`。
- 对于专门部署的 collector 节点，如果你已经清楚下游容量、网络带宽和超时设置，也可以把 `collector.max-concurrent-jobs` 提高到 `512` 以上。
- 只有当通知通道供应商和 HTTP 连接池都能承受更高吞吐时，才上调 `alerter.notify.max-concurrent-jobs` 或 `notify-max-concurrent-per-channel`。
- `warehouse.mode` 建议保持 `UNBOUNDED_VT`，真正的资源限制仍应交给数据库/TSDB 客户端连接池。
- `reduce.queue-capacity` 和 `window-evaluator.queue-capacity` 默认故意不写，这样才能兼容旧版队列语义。

## 6. 回滚方式

如需关闭 HertzBeat 的虚拟线程执行器，可配置：

```yaml
hertzbeat:
  vthreads:
    enabled: false
```

这样相关执行器会回退到原来的平台线程实现。

## 7. 补充说明

- 如果你当前的部署运行稳定，可以继续保持现有 `application.yml` 不变。
- 只有在你希望调节并发阈值，或者显式关闭该能力时，才需要增加 `hertzbeat.vthreads` 配置块。
