---
id: virtual-thread
title: Virtual Thread Configuration
sidebar_label: Virtual Threads
description: Configure HertzBeat virtual-thread executors, defaults, rollback switches, and tuning guidance.
---

HertzBeat runs on JDK 25 and uses virtual threads for the blocking execution paths that benefit from them. All `hertzbeat.vthreads` keys are optional. If you upgrade HertzBeat but do not merge the new YAML block into your existing `application.yml`, HertzBeat still starts with built-in defaults.

## 1. Where to Configure It

Choose the config file that matches your deployment mode:

- Package deployment: `hertzbeat/config/application.yml`
- Docker single-node deployment: mount your local `application.yml` to `/opt/hertzbeat/config/application.yml`
- Docker Compose deployment: edit `script/docker-compose/*/conf/application.yml`
- Standalone collector deployment: edit `hertzbeat-collector/config/application.yml`

## 2. No Configuration Required

You can leave out the entire `hertzbeat.vthreads` block.

```yaml
# No virtual-thread override is required.
```

HertzBeat will apply runtime defaults automatically.

## 3. Full Optional Configuration Template

Use this only when you want to override the defaults:

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

## 4. Built-In Defaults

| Key | Default | Notes |
| --- | --- | --- |
| `hertzbeat.vthreads.enabled` | `true` | Global switch for the HertzBeat virtual-thread executors |
| `hertzbeat.vthreads.common.mode` | `UNBOUNDED_VT` | Common short-running tasks |
| `hertzbeat.vthreads.collector.mode` | `LIMIT_AND_REJECT` | Keeps collector fast-fail admission |
| `hertzbeat.vthreads.collector.max-concurrent-jobs` | `512` | Balanced default for mixed HTTP and JDBC collection workloads on a single node |
| `hertzbeat.vthreads.manager.mode` | `LIMIT_AND_REJECT` | Keeps manager admission behavior |
| `hertzbeat.vthreads.manager.max-concurrent-jobs` | `10` | Same as the legacy limit |
| `hertzbeat.vthreads.alerter.notify.mode` | `LIMIT_AND_REJECT` | Notification executor admission |
| `hertzbeat.vthreads.alerter.notify.max-concurrent-jobs` | `64` | Global notify concurrency |
| `hertzbeat.vthreads.alerter.notify-max-concurrent-per-channel` | `4` | Per notification channel/type |
| `hertzbeat.vthreads.alerter.periodic-max-concurrent-jobs` | `10` | Global periodic alert concurrency |
| `hertzbeat.vthreads.alerter.log-worker.max-concurrent-jobs` | `10` | Log alert short-task concurrency |
| `hertzbeat.vthreads.alerter.log-worker.queue-capacity` | `1000` | Bounded queue to preserve backlog semantics |
| `hertzbeat.vthreads.alerter.reduce.max-concurrent-jobs` | `2` | Alarm reduce concurrency |
| `hertzbeat.vthreads.alerter.reduce.queue-capacity` | unbounded | Leave unset to keep the legacy unbounded queue behavior |
| `hertzbeat.vthreads.alerter.window-evaluator.max-concurrent-jobs` | `2` | Window evaluator concurrency |
| `hertzbeat.vthreads.alerter.window-evaluator.queue-capacity` | unbounded | Leave unset to keep the legacy unbounded queue behavior |
| `hertzbeat.vthreads.warehouse.mode` | `UNBOUNDED_VT` | Storage short tasks; downstream pools still limit real resources |
| `hertzbeat.vthreads.async.enabled` | `true` | Dedicated `@Async` executor switch |
| `hertzbeat.vthreads.async.concurrency-limit` | `256` | `@Async` concurrency guard |
| `hertzbeat.vthreads.async.reject-when-limit-reached` | `true` | Reject extra `@Async` tasks at the limit |
| `hertzbeat.vthreads.async.task-termination-timeout` | `5000` | Milliseconds |

## 5. Tuning Guidance

- Start with the defaults unless you already know a downstream dependency is weak.
- The collector default is intentionally higher than the legacy CPU-based pool size so a single HertzBeat node can carry more blocking collection work before you need extra collectors.
- `512` is the default because it is a good mixed-workload starting point. In local verification, HTTP-heavy collection continued scaling beyond `512`, while JDBC-style collection peaked around `512` and dropped when concurrency was pushed higher.
- Virtual threads remove platform-thread pressure, but they do not remove database limits, HTTP connection limits, network bandwidth limits, file descriptor limits, or downstream rate limits. Raising concurrency too far just moves the bottleneck.
- If most of your workload is HTTP collection across many different targets, try `768` first and then `1024` if timeouts, error rates, and connection usage remain stable.
- If most of your workload is JDBC or other database-backed collection, keep `collector.max-concurrent-jobs` around `256` to `512`. In this type of workload, raising concurrency above `512` can reduce total throughput instead of improving it.
- If you are not sure about the workload mix, keep `512` as the starting point. It is a safer default than `768+` for mixed environments.
- Lower `collector.max-concurrent-jobs` when the collector talks to a small database, a low-capacity HTTP endpoint, or fragile network devices.
- Raise `alerter.notify.max-concurrent-jobs` or `notify-max-concurrent-per-channel` only if your notification providers and HTTP connection pools can absorb the increase.
- Keep `warehouse.mode` unbounded unless you have a clear bottleneck model. Database and TSDB client pools should remain the main limiters.
- `reduce.queue-capacity` and `window-evaluator.queue-capacity` are intentionally left unset by default so existing queueing semantics remain compatible.
- Change concurrency in steps and observe timeout rate, downstream `429` or `5xx`, database pool wait time, and memory or file descriptor usage before raising it again.

## 6. Rollback

Disable HertzBeat virtual-thread executors with:

```yaml
hertzbeat:
  vthreads:
    enabled: false
```

This rolls the affected executors back to their legacy platform-thread implementations.

## 7. Notes

- If your current deployment is stable, you can keep your existing `application.yml` unchanged.
- Add the `hertzbeat.vthreads` block only when you want to tune concurrency limits or explicitly disable the feature.
