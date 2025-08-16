---
id: ai_agent_chat
title: AI Agent Chat User Guide
sidebar_label: AI Agent Chat
keywords: [AI, Chat, Agent, Monitoring, Assistant, OpenAI]
---

> HertzBeat AI Agent Chat is an intelligent monitoring assistant that helps you manage monitors, configure alerts, and optimize your infrastructure monitoring through natural language conversation.

## Overview

The AI Agent Chat feature provides an interactive chat interface where you can:

- 🔍 List and manage your existing monitors
- ➕ Add new monitors for websites, APIs, databases, and services
- 🗑️ Delete existing monitors
- 📊 Get detailed information about available monitor types and their parameters-
- ⚡ Check monitor status and troubleshoot monitoring issues

## Prerequisites

Before using the AI Agent Chat, ensure:

1 **OpenAI Configuration**: Valid OpenAI API key must be configured
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
2. You'll see the HertzBeat Monitoring Assistant welcome screen
3. Start typing your questions in the chat input field

### Sample Conversations

#### Adding a New Monitor

```text
You: Add a new HTTP monitor for my website https://example.com
Assistant: I'll help you add an HTTP monitor for https://example.com. 
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
Assistant: Here are your current monitors:

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
Assistant: To monitor a PostgreSQL database, you'll need these parameters:

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

### Chat Features

#### Message History

- All conversations are automatically saved
- Access previous conversations from the sidebar
- Search through conversation history
- Export conversation logs

#### Real-time Responses

- Streaming responses for immediate feedback
- Typing indicators show when the assistant is processing
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

### Integration Suggestions

```text
You: What's the best way to monitor a microservices architecture with 20+ services?
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
