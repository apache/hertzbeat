---
id: ai_agent_chat
title: AI Agent Chat User Guide
sidebar_label: AI Agent Chat
keywords: [AI, Chat, Agent, Monitoring, AI Agent, OpenAI]
---

> HertzBeat AI Agent Chat is an intelligent monitoring AI Agent that helps you manage monitors, configure alerts, and optimize your infrastructure monitoring through natural language conversation.

## Overview

The AI Agent Chat feature provides an interactive chat interface where you can:

**Monitor Management:**

- 🔍 Query and filter existing monitors by status, type, host, and labels
- ➕ Add new monitors for websites, APIs, databases, and services
- 📊 Get detailed information about available monitor types and their parameters
- ⚡ Check monitor status and troubleshoot monitoring issues

**Alert Management:**

- 🚨 Query active alerts with comprehensive filtering (type, status, search)
- 📈 Get alert summary statistics and distribution
- 🔔 View both single and grouped alerts
- 📋 Analyze alert patterns and trends

**Metrics Analysis:**

- 📊 Retrieve real-time metrics data for any monitor
- 📈 Access historical metrics with customizable time ranges
- 💾 Check warehouse storage system status
- 🔍 Query specific metric fields and labels

**Alert Rule Management:**

- ⚙️ Configure alert rules and thresholds
- 📝 Manage alert definitions for different monitor types
- 🎯 Set up custom alerting criteria

## Prerequisites

Before using the AI Agent Chat, ensure:

1 **OpenAI Configuration**: Valid OpenAI API key must be configured. Optionally, you can change the model in `application.yml` under `spring.ai.openai.chat.options.model` (default is `gpt-4.1-nano`).
2 **Database Connection**: HertzBeat database must be accessible for monitor operations

## Configuration

### OpenAI API Key Setup

The AI Agent Chat uses OpenAI's GPT models. You need to configure an OpenAI API key in one of two ways:

#### Method 1: Database Configuration via UI (Recommended)

1. Navigate to the AI Agent Chat interface
2. If no API key is configured, you'll see a configuration dialog
3. Enter your OpenAI API key
4. Click **Save Configuration**

#### Method 2: YAML Configuration

Add to your `application.yml`:

```yaml
spring:
  ai:
    openai:
      api-key: sk-your-openai-api-key-here
```

### Configuration Priority

- **Database configuration** takes priority over YAML configuration
- Configuration changes are applied immediately without restart
- Invalid API keys are automatically validated before saving

## Using the AI Agent Chat

### Accessing the Chat Interface

1. Navigate to the **AI Agent Chat** section in HertzBeat web interface
2. You'll see the HertzBeat Monitoring AI Agent welcome screen
3. Start typing your questions in the chat input field

### Sample Conversations

#### Adding a New Monitor

```text
You: Add a new HTTP monitor for my website https://example.com
AI Agent: I'll help you add an HTTP monitor for https://example.com. 
Let me create that monitor with the following configuration:
- Name: example.com Website Monitor
- Type: HTTP
- Host: example.com
- Port: 443 (HTTPS)
- Path: /
- Interval: 60 seconds

Monitor created successfully with ID: 12345
```

#### Listing Existing Monitors

```text
You: Show me all my current monitors
AI Agent: Here are your current monitors:

1. **Linux Server** (ID: 1001)
   - Status: ✅ Online
   - Host: 192.168.1.100
   - Last Check: 2 minutes ago

2. **MySQL Database** (ID: 1002) 
   - Status: ⚠️ Warning
   - Host: db.example.com
   - Last Check: 30 seconds ago

3. **Website Monitor** (ID: 1003)
   - Status: ✅ Online
   - Host: https://example.com
   - Last Check: 1 minute ago

Would you like details on any specific monitor?
```

#### Getting Monitor Type Information

```text
You: What parameters do I need to monitor a PostgreSQL database?
AI Agent: To monitor a PostgreSQL database, you'll need these parameters:

**Required Parameters:**
- **Host**: Database server IP/hostname
- **Port**: PostgreSQL port (default: 5432)
- **Database**: Database name to connect to
- **Username**: Database username
- **Password**: Database password

**Optional Parameters:**
- **Timeout**: Connection timeout (default: 6000ms)
- **Query Timeout**: SQL query timeout (default: 3000ms)
- **SSL**: Enable SSL connection (default: false)

Would you like me to help you add a PostgreSQL monitor?
```

#### Alert Management

```text
You: Show me all critical alerts from the last 24 hours
AI Agent: Here are the critical alerts from the last 24 hours:

🚨 **Active Alerts (3 firing)**
1. **High CPU Usage** - Linux Server (ID: 1001)
   - Status: 🔥 Firing
   - Triggered: 2 hours ago
   - Severity: Critical
   - Message: CPU usage 95% > threshold 90%

2. **Database Connection Failed** - MySQL Database (ID: 1002)
   - Status: 🔥 Firing  
   - Triggered: 45 minutes ago
   - Severity: Critical
   - Message: Connection timeout after 10 seconds

3. **Website Response Time** - Website Monitor (ID: 1003)
   - Status: ⚠️ Warning
   - Triggered: 15 minutes ago
   - Severity: Warning
   - Message: Response time 5.2s > threshold 3s

**Alert Summary:**
- Total alerts: 12
- Firing: 3 (2 critical, 1 warning)
- Resolved: 9

Would you like me to help you investigate any specific alert?
```

#### Metrics Analysis

```text
You: Show me the CPU usage for my Linux server over the last 6 hours
AI Agent: Here's the CPU usage data for your Linux server (Monitor ID: 1001) over the last 6 hours:

📊 **CPU Usage Metrics - Last 6 Hours**
```

Time          | Usage (%) | Load Avg | Processes
14:00-15:00   | 45.2%     | 1.2      | 156
15:00-16:00   | 67.8%     | 2.1      | 178
16:00-17:00   | 89.4%     | 3.8      | 195
17:00-18:00   | 92.1%     | 4.2      | 203
18:00-19:00   | 94.7%     | 4.8      | 210
19:00-20:00   | 88.3%     | 3.5      | 188

``` text

**Analysis:**
- Peak usage: 94.7% at 19:00
- Average usage: 79.6%
- Trend: High usage sustained for 3+ hours
- Current status: Decreasing (88.3%)

**Real-time metrics:**
- Current CPU: 76.2%
- Memory usage: 82.1%
- Disk I/O: Normal

Would you like me to check historical data for comparison or investigate the high usage cause?
```

#### Alert Rule Configuration

```text
You: Set up an alert rule for when my website response time exceeds 5 seconds
AI Agent: I'll help you create an alert rule for website response time monitoring.

**Alert Rule Configuration:**
- **Monitor Type**: HTTP/Website
- **Metric**: Response Time
- **Condition**: Greater than 5 seconds
- **Severity**: Warning
- **Evaluation**: Check every 60 seconds
- **Notification**: Email + Dashboard

**Proposed Rule:**
```yaml
name: "Website Response Time Alert"
condition: "response_time > 5000ms"
severity: "warning"
description: "Alert when website response time exceeds 5 seconds"
evaluation_interval: 60s
for: 2m  # Alert after condition persists for 2 minutes
```

This rule will:

1. Monitor response time every minute
2. Trigger alert if response time > 5s for 2+ minutes
3. Send notifications via configured channels
4. Show in dashboard with warning status

Would you like me to apply this configuration or modify any settings?

``` text

### Chat Features

#### Message History

- All conversations are automatically saved
- Access previous conversations from the sidebar
- Search through conversation history
- Export conversation logs

#### Real-time Responses

- Streaming responses for immediate feedback
- Typing indicators show when the AI Agent is processing
- Cancel ongoing requests if needed

#### Conversation Management

- Create new conversations for different topics
- Rename conversations for better organization
- Delete old conversations to keep things clean
Note: Conversations are not saved in the database

## Troubleshooting

### Common Issues

#### Chat Interface Not Loading

**Symptoms**: Chat interface shows loading spinner indefinitely
**Solutions**:

1. Check browser console for JavaScript errors
2. Ensure network connectivity to HertzBeat server

#### "Service Unavailable" Message

**Symptoms**: Chat shows "HertzBeat AI monitoring service unavailable"
**Solutions**:
1.Verify OpenAI API key configuration
2.Check application logs for errors
3.Ensure database connectivity

#### Invalid API Key Error

**Symptoms**: Configuration dialog shows "Invalid API key" error
**Solutions**:

1. Verify your OpenAI API key starts with `sk-`
2. Check API key has sufficient credits/quota
3. Test API key directly with OpenAI API
4. Ensure no extra spaces in the API key

#### Monitor Creation Failures  

**Symptoms**: AI suggests monitor configuration but creation fails
**Solutions**:

1. Verify you have permissions to create monitors
2. Check if monitor with same name already exists
3. Ensure target host/service is accessible
4. Review monitor parameter validation errors

### Debug Mode

Enable debug logging by setting log level to DEBUG for:

```yaml
logging:
  level:
    org.apache.hertzbeat.ai.agent: DEBUG
```

## Best Practices

### Effective Chat Usage

1. **Be Specific**: "Add HTTP monitor for api.example.com port 8080" vs "add a monitor"
2. **Provide Context**: Mention if you want production vs test monitors
3. **Ask Follow-ups**: Request configuration details if needed
4. **Use Natural Language**: The AI understands conversational requests

### Monitor Management

1. **Naming Convention**: Use descriptive monitor names
2. **Documentation**: Ask the AI to document complex configurations

### Security Considerations

1. **API Key Security**: Store OpenAI API keys securely
2. **Access Control**: Limit AI chat access to authorized users
3. **Data Privacy**: Be mindful of sensitive information in chat logs
4. **Network Security**: Ensure secure connections to OpenAI API

## Advanced Features

### Bulk Operations

```text
You: Add HTTP monitors for all services in my staging environment:
- api-staging.example.com:8080
- web-staging.example.com:80  
- admin-staging.example.com:3000
```

## Limitations

- Requires active internet connection for OpenAI API
- OpenAI API usage incurs costs based on token consumption
- Complex multi-step operations may require multiple interactions
- Some advanced configurations may need manual setup
- Rate limiting may apply based on OpenAI plan

## Support

For issues with AI Agent Chat:

1. Check this documentation first
2. Review application logs for errors
3. Test OpenAI API connectivity independently  
4. Contact HertzBeat support with specific error messages

---
