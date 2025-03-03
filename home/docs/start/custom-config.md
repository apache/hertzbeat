---
id: custom-config  
title: Advanced Params Config           
sidebar_label: Advanced Params Config
---

This describes how to configure the SMS server, the number of built-in availability alarm triggers, etc.

**Configuration file `application.yml` of `hertzbeat`**

Configuring the HertzBeat configuration file:

- Modify the configuration file located at `hertzbeat/config/application.yml`
- **Docker Deployment:** ⚠️ When using a Docker container, the `application.yml` file must be mounted to the host machine
- **Installation Package Deployment:** Extract the package and modify the configuration file located at `hertzbeat/config/application.yml`

## 1. Configuring the SMS Sending Service

Only when you successfully configure your own SMS service will the alert SMS triggered within the monitoring system be sent correctly.  
HertzBeat provides two ways to configure the SMS service: modifying the `application.yml` configuration file directly or configuring it through the HertzBeat frontend interface (Settings > Message Server Setting).

> ⚠️ Note: Only one method can be effective at a time. If both methods are configured and enabled, HertzBeat will prioritize the SMS service configured in the frontend interface.

### 1.1 Tencent Cloud SMS Configuration

Add the following Tencent Cloud SMS server configuration to `application.yml` (replace parameters with your own SMS server configuration):

```yaml
alerter:
  sms:
    enable: true     # Whether to enable
    type: tencent    # SMS provider type, supports "tencent"
    tencent:         # Tencent Cloud SMS configuration
      secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY
      secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA
      app-id: 1435441637
      sign-name: HertzBeat
      template-id: 1343434
```

1. Create a signature (sign-name) in Tencent Cloud SMS  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/3a4c287d-b23d-4398-8562-4894296af485)

2. Create a message template (template-id) in Tencent Cloud SMS

   ```text
   Monitor: {1}, Alert Level: {2}. Content: {3}
   ```

   ![image](https://github.com/apache/hertzbeat/assets/40455946/face71a6-46d5-452c-bed3-59d2a975afeb)

3. Create an application (app-id) in Tencent Cloud SMS  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/2732d710-37fa-4455-af64-48bba273c2f8)

4. Obtain Tencent Cloud Access Management credentials (secret-id, secret-key)  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/36f056f0-94e7-43db-8f07-82893c98024e)

## 2. Configuring Custom Alert Parameters

```yaml
alerter:
  # Custom console URL
  console-url: https://console.tancloud.io
```

## 3. Using an External Redis Instead of In-Memory Storage for Real-Time Metric Data

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
