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

![log_manage](/img/docs/help/log_manage_cn.png)

## Log Query Features

### Filter Conditions

Log management supports the following filter conditions for precise querying:

#### Time Range

- **Function**: Specify the query time interval
- **Format**: Supports date-time picker
- **Example**: 2024-01-01 00:00:00 to 2024-01-02 00:00:00

#### Trace ID

- **Field Name**: `traceId`
- **Data Type**: String
- **Purpose**: Request tracing in distributed systems
- **Example**: `1234567890abcdef`

#### Span ID

- **Field Name**: `spanId`  
- **Data Type**: String
- **Purpose**: Identifier for specific operations in traces
- **Example**: `abcdef1234567890`

#### Severity Number

- **Field Name**: `severityNumber`
- **Data Type**: Number
- **Range**: 1-24 (compliant with OpenTelemetry specification)

#### Severity Text

- **Field Name**: `severityText`
- **Data Type**: String
- **Common Values**: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
- **Example**: Enter `ERROR` to query error-level logs

## Statistical Analysis

### Statistics Overview

![log_manage_chart](/img/docs/help/log_manage_chart_cn.png)

Click the "Show Statistics" button to expand the statistical analysis area, including:

#### Basic Statistics Cards

- **Total Logs**: Display total number of logs matching the criteria
- **FATAL Logs**: FATAL level log statistics
- **ERROR Logs**: ERROR level log statistics  
- **WARN Logs**: WARN level log statistics
- **INFO Logs**: INFO level log statistics
- **DEBUG Logs**: DEBUG level log statistics

### Visualization Charts

#### Severity Distribution Chart

- **Type**: Pie chart
- **Content**: Shows quantity distribution of different log levels
- **Purpose**: Quickly understand log severity distribution

#### Trace Coverage Chart

- **Type**: Pie chart
- **Content**: Shows proportion of logs with trace information
- **Includes Metrics**:
  - Number of logs with Trace ID
  - Number of logs with Span ID
  - Number of logs with both Trace and Span
  - Number of logs without trace information

#### Log Trend Chart

- **Type**: Timeline chart
- **Content**: Hourly statistics of log quantity trends
- **Purpose**: Analyze log generation time patterns and anomaly peaks

## Log Display

### Column Display Configuration

Click the "Column Settings" button to customize table column display:

#### Configurable Columns

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

### View Log Details

Click any log entry in the table to open the details modal:

![log_manage](/img/docs/help/log_manage_log_details_cn.png)

#### Basic Information Section

- **Severity**: Display level label and color identifier
- **Timestamp**: Formatted detailed time display
- **Trace ID**: Complete distributed tracing identifier
- **Span ID**: Complete operation span identifier

#### Complete JSON Data

- **Raw Data**: Display complete JSON format of log entry
- **Copy Function**: Support one-click copy to clipboard
- **Formatted Display**: JSON data is formatted for easy reading

## Batch Delete Feature

### Selection and Deletion

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
