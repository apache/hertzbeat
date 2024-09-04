---
id: extend-push 
title: Push Style Custom Monitoring  
sidebar_label: Push Style Custom Monitoring
---

> Push style curstom monitor is a type of monitor which allow user to configure metrics format and push metrics to hertzbeat with their own service.
> Here we will introduce how to use this feature.

### Push style custom monitor collection process

【Peer Server Start Pushing Metrics】 -> 【HertzBeat Push Module Stage Metrics】-> 【HertzBeat Collect Module collect Metrics Periodically】

### Data parsing method

HertzBeat will parsing metrics with the format configured by user while adding new monitor.

### Create Monitor Steps

HertzBeat DashBoard -> Service Monitor -> Push Style Monitor -> New Push Style Monitor -> set Push Module Host (hertzbeat server ip, usually 127.0.0.1/localhost) -> set Push Module Port (hertzbeat server port, usually 1157) -> configure metrics field (unit: string, type: 0 number / 1 string) -> end

---

### Monitor Configuration Example

![HertzBeat](/img/docs/advanced/extend-push-example-1.png)
