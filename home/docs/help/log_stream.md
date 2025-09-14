---
id: log_stream
title: Log Stream Query
sidebar_label: Log Stream Query  
keywords: [open source monitoring, log stream, real-time logs, log filtering]
---

> HertzBeat's log stream feature provides real-time log viewing and filtering capabilities, allowing users to monitor system logs in real-time and perform precise filtering based on different conditions to quickly locate issues and analyze system status.

## Feature Overview

In the HertzBeat interface, navigate to "Log" -> "Log Stream" page, where you will see a comprehensive real-time log monitoring interface.

![log_stream](/img/docs/help/log_stream_en.png)

## Real-time Log Viewing

### Log Display

- **Real-time Updates**: New logs automatically appear at the top of the list with highlight animation effects
- **Log Count**: Interface displays the current number of loaded logs (maximum 1000 entries retained)
- **Level Identification**: Following OpenTelemetry specifications, different log levels are identified with different colors:
  - Gray: TRACE (1-4)
  - Blue: DEBUG (5-8)  
  - Green: INFO (9-12)
  - Orange: WARN (13-16)
  - Red: ERROR (17-20)
  - Volcano Red: FATAL (21-24)

### Operation Controls

#### Basic Controls

- **Pause/Resume**: Click the pause button to pause new log display, click again to resume
- **Clear Logs**: Clear all currently displayed log entries
- **Scroll to Top**: Quickly return to the latest log position

#### Auto Scroll

- System automatically scrolls to the latest logs by default
- When users manually scroll to other positions, auto scroll will pause
- Click "Scroll to Top" to re-enable auto scroll

## Log Filtering Features

### Filter Configuration

Click the "Show Filters" button to expand the filter configuration area, supporting the following filter conditions:

#### Severity Number

- **Field Name**: `severityNumber`
- **Data Type**: Number
- **Value Range**: 1-24 (compliant with OpenTelemetry specifications)
- **Usage Example**: Enter `9` to filter INFO level logs

#### Severity Text

- **Field Name**: `severityText`  
- **Data Type**: String
- **Common Values**: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
- **Usage Example**: Enter `ERROR` to filter error level logs

#### Trace ID

- **Field Name**: `traceId`
- **Data Type**: String
- **Purpose**: Track request chains in distributed systems

#### Span ID

- **Field Name**: `spanId`
- **Data Type**: String
- **Purpose**: Identify specific operations within traces

### Filter Operations

#### Combined Filtering

- Supports setting multiple filter conditions simultaneously
- Multiple conditions have an AND relationship (must all be satisfied)
- Empty fields do not participate in filtering

## Log Detail Viewing

Click any log entry to open the detail modal, containing:

![log_entry_details](/img/docs/help/log_stream_log_entry_details.png)

### Basic Information

- **Severity Level**: Display level label and color identification
- **Timestamp**: Formatted readable time
- **Trace ID**: Complete trace identifier (if available)
- **Span ID**: Complete span identifier (if available)

### Complete JSON Data

- Display complete JSON format of the original log entry
- Contains all attributes and metadata information
- Supports copying to clipboard

## Troubleshooting

### Connection Issues

**Symptoms**: Shows "Disconnected" status
**Solutions**:

- Check network connection
- Confirm HertzBeat service is running normally
- Check if browser supports SSE

### No Log Display

**Symptoms**: Connection is normal but no logs are displayed
**Solutions**:

- Check if log data is being sent to HertzBeat
- Verify filter settings are not too restrictive
- Confirm log format meets expectations

For more information about log stream features or technical issues, feel free to communicate with the community through [GitHub Issues](https://github.com/apache/hertzbeat/issues).
