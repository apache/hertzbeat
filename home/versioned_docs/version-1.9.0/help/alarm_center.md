---
id: alarm_center
title: Alarm Center
sidebar_label: Alarm Center
keywords:
  [open-source monitoring system, alarm center, alarm management, alarm display]
---

> The Alarm Center serves as a comprehensive visualization platform that displays all alarms after undergoing grouping, consolidation, suppression, and silencing processes. It encompasses both internally triggered threshold-based alarms and integrated third-party notifications.

## Alarm Sources

The HertzBeat Alarm Center manages notifications from two primary sources:

1. Internal Threshold-Triggered Alarms
   - Generated when monitoring metrics exceed predefined thresholds
   - Directly correlated with monitoring tasks and threshold rules configured within the system
   - Manageable through adjustment of monitoring parameters and threshold configurations
2. Third-Party Integrated Alarms
   - Received through API interfaces from external systems
   - Compatible with various monitoring systems and alarm platforms
   - Processed through identical workflow as internal alarms

## Alarm Processing Mechanism

Before appearing in the Alarm Center, all notifications undergo several processing stages:

1. Grouping
   - Categorizes related alarms based on source, type, severity, and other attributes (labels)
   - Facilitates efficient management of high-volume alarms
   - Supports customizable grouping rules for diverse scenarios
2. Consolidation
   - Mitigates notification fatigue from multiple similar alarms within short intervals
   - Presents consolidated alarms in a streamlined format, eliminating redundancy
3. Suppression
   - Manages alarm dependencies
   - Suppresses secondary alarms when primary alarms are triggered
   - Supports configurable suppression rules based on alarm dependencies
4. Silencing
   - Temporarily mutes specific alarms during designated periods
   - Ideal for system maintenance windows and known issue handling
   - Enables time-based silence rule configuration

## Alarm Center Interface

![alarm_center](/img/docs/help/alarm-center-1.png)

The Alarm Center provides a comprehensive view of all system alarms:

1. Alarm Display
   - Lists all alarms with crucial information including status, source, labels, and timestamps
   - Offers detailed view functionality for comprehensive alarm information and context
2. Search Functionality
   - Enables rapid alarm identification
   - Supports multiple search criteria (labels, annotations, alarm status)
3. Alarm Management
   - Alarm Deletion: Removes alarms no longer requiring attention
