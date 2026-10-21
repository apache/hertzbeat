---
id: 1.7.0-update  
title: How to update to 1.7.0     
sidebar_label: Update to 1.7.0 guide
---

## HertzBeat 1.7.0 Upgrade Guide

:::note
This guide is applicable for upgrading from 1.6.x to version 1.7.0.  
If you are using an older version, it is recommended to reinstall using the export function, or upgrade to 1.6.0 and then follow this guide to 1.7.0.
:::

Follow the [HertzBeat New Version Upgrade](upgrade)

## Installation Upgrade

### Upgrade Database

In 1.7.0, we use the `label` instead of `tag`, in some environment, we need drop or delete the table `hzb_tag_monitor_bind` in database.

```sql
DELETE FROM hzb_tag_monitor_bind;
```

### Upgrade Alarm Threshold

In 1.7.0, we redesign the new alarm threshold, include the Real-Time Threshold and Scheduled Threshold.  
We need reconfigure the alarm threshold, alarm group by manual.  

:::tip
There are no default built-in threshold rules, such as the previous availability threshold.  
So if you find that there is no alarm after the monitoring is down, you need to configure the corresponding availability threshold yourself.
:::

## Upgrade via Export and Import

If you do not want to go through the tedious script upgrade method mentioned above, you can directly export and import the monitoring tasks and threshold information from the old environment.

- Deploy a new environment with the latest version.
- Export the monitoring tasks and threshold information from the old environment on the page
