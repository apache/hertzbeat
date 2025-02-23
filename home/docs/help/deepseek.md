---
id: deepseek
title: Monitoring Deepseek Account Status
sidebar_label: Deepseek Account Status
keywords: [Open Source Monitoring System, Open Source Network Monitoring, Deepseek Account Monitoring]
---

### Preparation

#### Obtain Session Key

Log in to the Deepseek backend and visit the `https://platform.deepseek.com/api_keys` page to obtain the session key.

### Configuration Parameters

| Parameter Name | Parameter Description |
| ------------- | --------------------- |
| Monitoring Host | Enter `api.deepseek.com` here. |
| Task Name | The name that identifies this monitoring task, which must be unique. |
| Session Key | The session key obtained in the preparation step. |
| Collector | Configure which collector is used to schedule data collection for this monitoring. |
| Monitoring Interval | The interval for periodically collecting data, in seconds. The minimum interval that can be set is 30 seconds. |
| Bound Tags | Tags for categorizing and managing monitoring resources. |
| Description/Remarks | Additional remarks to identify and describe this monitoring. Users can add notes here. |

### Collection Metrics

#### Metric Set: Billing

| Metric Name | Metric Unit | Metric Description |
| ---------- | ---------- | ----------------- |
| Currency | None | Currency, either RMB or USD. |
| Available Balance | RMB/USD | Total available balance, including bonus and recharge balance. |
| Unexpired Bonus Balance | RMB/USD | Unexpired bonus balance. |
| Recharge Balance | RMB/USD | Recharge balance. |
