---
id: custom-config  
title: Advanced Params Config           
sidebar_label: Advanced Params Config
---

Here it describes how to configure custom parameters for alerts, etc.

**Configuration file `application.yml` of `hertzbeat`**

Configuring the HertzBeat configuration file:

- Modify the configuration file located at `hertzbeat/config/application.yml`
- **Docker Deployment:** ⚠️ When using a Docker container, the `application.yml` file must be mounted to the host machine
- **Installation Package Deployment:** Extract the package and modify the configuration file located at `hertzbeat/config/application.yml`

## 1. Configuring Custom Alert Parameters

```yaml
alerter:
  # Custom console URL
  console-url: https://console.tancloud.io
```

## 2. Using an External Redis Instead of In-Memory Storage for Real-Time Metric Data

> By default, real-time metric data is stored in memory. You can configure Redis as a replacement using the settings below.

⚠️ Note: Set `memory.enabled: false, redis.enabled: true`

```yaml
warehouse:
  store:
    memory:
      enabled: false
      init-size: 1024
    redis:
      enabled: true
      host: 127.0.0.1
      port: 6379
      password: 123456
```
