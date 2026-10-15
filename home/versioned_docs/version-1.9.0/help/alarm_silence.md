---
id: alarm_silence
title: Alarm Silence
sidebar_label: Alarm Silence
keywords: [ Open Source Monitoring System, Alert Silence ]
---

> The alert silence management allows you to configure silence policies to suppress alert notifications during specified time periods, such as during system maintenance or when you don’t want to be disturbed by alerts at night or on weekends. Alert silence rules support both one-time and periodic time periods, and can match specific alerts using labels and alert levels.

## One-Time Time Period Silence Configuration

- Silence Strategy Name: A unique name to identify the silence policy;
- Match All: Whether to enable this silence policy for all alerts;
- Label Match: When "Apply to All" is disabled, you can match alerts to be silenced based on specified labels;
- Silence Type: Select "One Time Silence";
- Silence Period: After selecting "One Time Silence", the silence period configuration is shown in the following image, which can be configured as needed
  ![alarm_silence](/img/docs/help/alert-silence-1-en.png)
- Enable: Enable or disable the silence policy.

## Periodic Time Period Silence Configuration

- Silence Strategy Name: A unique name to identify the silence policy;
- Match All: Whether to enable this silence policy for all alerts;
- Label Match: When "Apply to All" is disabled, you can match alerts to be silenced based on specified labels;
- Silence Type: Select "Periodic Silence";
- Choose Date: After selecting "Periodic Silence", you can configure the dates when alerts should be silenced;
- Silence Period: After selecting "Periodic Silence", the silence period configuration is shown in the following image, which can be configured as needed (e.g., silencing alerts during weekends)
  ![alarm_silence](/img/docs/help/alert-silence-2-en.png)
- Enable: Enable or disable the silence policy.
