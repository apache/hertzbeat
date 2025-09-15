---
id: log_manage
title: Log Management
sidebar_label: Log Management
keywords: [open source monitoring, log management, log query, log statistics, log deletion]
---

> HertzBeat's log management feature provides comprehensive log data management capabilities, including log querying, statistical analysis, and batch deletion operations. Users can precisely search logs through various filter conditions, view detailed statistical charts, and clean up unnecessary log data.

## Prerequisites

**Before using the log management feature, you must first configure a database that supports log storage.**

## Feature Overview

In the HertzBeat interface, navigate to "Logs" -> "Log Management" page, where you'll see a comprehensive log management interface.

![log_manage](/img/docs/help/log_manage_en.png)

## Log Query Features

### Filter Conditions

Log management supports the following filter conditions for precise querying:

| Filter Condition | Field Name | Data Type | Purpose | Example Value | Use Case |
|------------------|------------|-----------|---------|---------------|----------|
| **Time Range** | `timestamp` | DateTime | Specify query time window | `2024-01-01 00:00:00` to `2024-01-02 00:00:00` | Issue time period location, performance analysis |
| **Trace ID** | `traceId` | String | Request tracing in distributed systems | `1234567890abcdef` | Link tracing, request flow analysis |
| **Span ID** | `spanId` | String | Identifier for specific operations in traces | `abcdef1234567890` | Microservice call analysis |
| **Severity Number** | `severityNumber` | Number | OpenTelemetry standard level | `1-24` | Filter by numeric level |
| **Severity Text** | `severityText` | String | Human-readable log level | `ERROR`, `WARN`, `INFO` | Quick filtering by level |

### Visualization Analysis Charts

Visualization analysis charts include basic statistical indicator charts and aggregated statistical charts. Click the "Show Statistics" button to expand and view them.

![log_manage_chart](/img/docs/help/log_manage_chart_en.png)

#### Basic Statistical Indicators

| Statistical Indicator | Description | Application Value | Anomaly Threshold Reference |
|----------------------|-------------|-------------------|----------------------------|
| **Total Logs** | Total number of logs matching query criteria | Evaluate system activity and data scale | Sudden increase/decrease over 50% needs attention |
| **FATAL Logs** | Fatal error level log statistics | Identify system critical failures | Any FATAL logs need immediate handling |
| **ERROR Logs** | Error level log statistics | Monitor system anomalies | Over 5% of total logs needs attention |
| **WARN Logs** | Warning level log statistics | Discover potential issues and performance bottlenecks | Continuous growth trend needs analysis |
| **INFO Logs** | Information level log statistics | Understand normal system operation status | Should be the main body of logs |
| **DEBUG Logs** | Debug level log statistics | Development debugging and issue troubleshooting | Should control quantity in production environment |

#### Aggregated Statistical Charts

| Chart Name | Chart Type | Display Content | Main Purpose | Included Metrics/Levels |
|------------|------------|-----------------|--------------|-------------------------|
| **Severity Distribution Chart** | Pie chart | Quantity distribution of different log levels | Quickly understand log severity distribution | FATAL, ERROR, WARN, INFO, DEBUG |
| **Trace Coverage Chart** | Pie chart | Proportion of logs with trace information | Analyze system trace coverage | Number of logs with Trace ID<br/>Number of logs with Span ID<br/>Number of logs with both Trace and Span<br/>Number of logs without trace information |
| **Log Trend Chart** | Timeline chart | Hourly statistics of log quantity trends | Analyze log generation time patterns and anomaly peaks | Time granularity: Hourly statistics<br/>Analysis dimension: Time pattern recognition, anomaly peak detection |

### Column Display Configuration

Click the "Column Settings" button to customize table column display:

- **Time**: Log generation timestamp
- **Observed Time**: Time when log was observed
- **Severity**: Log level label
- **Log Content**: Main message content
- **Attributes**: Log additional attribute information
- **Resource**: Resource-related information
- **Trace ID**: Distributed tracing identifier
- **Span ID**: Operation span identifier
- **Trace Flags**: Trace flag information
- **Instrumentation Scope Info**: Instrumentation scope information
- **Dropped Count**: Number of dropped attributes

## Log Details View

Click any log entry in the table to open the details modal:

![log_manage](/img/docs/help/log_manage_log_details_en.png)

### Basic Information Section

- **Severity**: Display level label and color identifier
- **Timestamp**: Formatted detailed time display
- **Trace ID**: Complete distributed tracing identifier
- **Span ID**: Complete operation span identifier

### Complete JSON Data

- **Raw Data**: Display complete JSON format of log entry
- **Copy Function**: Support one-click copy to clipboard
- **Formatted Display**: JSON data is formatted for easy reading

## Batch Delete Feature

1. **Select Logs**: Use checkboxes on the left side of the table to select logs for deletion
2. **Select All**: Use the checkbox in the table header to select all logs on the current page
3. **Batch Delete**: Click the "Batch Delete" button to delete selected logs
4. **Delete Count**: Button shows the number of currently selected logs

## Troubleshooting

### Unable to View Logs

**Symptoms**: Page shows "No Data" or loading failure
**Solutions**:

1. Check if time-series database is properly configured
2. Confirm database service is running normally
3. Verify database connection configuration is correct
4. Check if log data is being written to the database

For more information about log management features or technical issues, feel free to engage with the community through [GitHub Issues](https://github.com/apache/hertzbeat/issues).
