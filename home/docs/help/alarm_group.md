---
id: alarm_group
title: Alarm Grouping
sidebar_label: Alarm Grouping
keywords: [Open source monitoring system, alarm reduce, alarm grouping]
---

> Group convergence supports grouping and convergence of alarms for specified packet labels, deduplication and convergence of the same repeated alarms for the time period. When the threshold rule triggers the alarm or external alarm reporting, it will enter the packet convergence to alarm grouping to deduplicate the alarm to avoid a large number of alarm messages causing alarm storms.

## Grouping Policy Parameter Configuration

- Strategy Name: The name that uniquely identifies the grouping policy
- Group Labels: Alarm grouping tag, support up to 10 tags

 > Tag source: monitoring, threshold rules, tags carried by external alarms

- Wait Time: Waiting time after a new alarm is generated. The same alarms received during this time will be grouped, with a default of 30 seconds.

 > When a new (unable to join an existing group) alarm is generated, the group convergence will wait according to the `wait time`, during which time, the same alarm or the alarm that meets the grouping conditions will be grouped. The alarm after the grouping is sent to the alarm suppression module for subsequent processing until the time interval between the current time and the first alarm generation in the packet exceeds the `wait time`.

- Interval time: The minimum time interval for sending group alarm notifications to avoid excessive alarm notifications, default 5 minutes
- Repeat interval: The minimum notification interval for repeated alarms. For continuously triggered alarms, avoid repeated notifications, default 4 hours

**Note**: Only grouped alarms can be suppressed using suppression rules.
