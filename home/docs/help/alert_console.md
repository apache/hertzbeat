---
id: alert_console
title: Custom console address in alarm template     
sidebar_label: Console address in alarm template
---

> After the threshold is triggered, send the alarm information. When you notify through DingDing / enterprise Wechat / FeiShu robot or email, the alarm content has a detailed link to log in to the console.

### Custom settings

In our startup configuration file application.yml, find the following configuration

```yml
alerter:
  console-url: #Here is our custom console address
```

The default value is the official console address of HertzBeat.
