use serde::{Deserialize, Serialize};
use std::{borrow::Cow, process::Command};
use rmcp::{
    handler::server::tool::IntoCallToolResult, model::*, schemars, 
    serde_json::Value, service::RequestContext, tool, RoleServer, ServerHandler
};

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct BashExecuteRequest {
    #[schemars(description = "The bash command or script to execute")]
    pub command: String,
    #[schemars(description = "Working directory for the command (optional)")]
    pub working_dir: Option<String>,
    #[schemars(description = "Environment variables (optional)")]
    pub env_vars: Option<std::collections::HashMap<String, String>>,
    #[schemars(description = "Timeout in seconds (default: 30)")]
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BashExecuteResponse {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

impl IntoCallToolResult for BashExecuteResponse {
    fn into_call_tool_result(self) -> Result<CallToolResult, ErrorData> {
        let content = if self.success {
            format!(
                "Command executed successfully (exit code: {})\n\nSTDOUT:\n{}\n\nSTDERR:\n{}",
                self.exit_code, self.stdout, self.stderr
            )
        } else {
            format!(
                "Command failed (exit code: {})\n\nSTDOUT:\n{}\n\nSTDERR:\n{}",
                self.exit_code, self.stdout, self.stderr
            )
        };

        Ok(CallToolResult {
            content: vec![Content::text(content)],
            is_error: Some(!self.success),
        })
    }
}

#[derive(Debug, Clone)]
pub struct BashServer;

#[tool(tool_box)]
impl BashServer {
    pub fn new() -> Self {
        BashServer
    }

    #[tool(description = "Execute a bash command or script")]
    async fn execute_bash(
        &self,
        #[tool(aggr)] request: BashExecuteRequest,
    ) -> Result<CallToolResult, ErrorData> {
        let timeout_duration = std::time::Duration::from_secs(request.timeout_seconds.unwrap_or(30));

        let mut cmd = Command::new("bash");
        cmd.arg("-c").arg(&request.command);

        // Set working directory if provided
        if let Some(working_dir) = &request.working_dir {
            cmd.current_dir(working_dir);
        }

        // Set environment variables if provided
        if let Some(env_vars) = &request.env_vars {
            for (key, value) in env_vars {
                cmd.env(key, value);
            }
        }

        // Execute command with timeout
        let output = tokio::time::timeout(timeout_duration, async {
            tokio::task::spawn_blocking(move || cmd.output()).await
        })
        .await
        .map_err(|_| ErrorData{
            code: ErrorCode::INTERNAL_ERROR, 
            message: Cow::Owned("Command execution timed out".to_string()), 
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Failed to spawn command: {}", e)),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Command execution failed: {}", e)),
            data: None,
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = BashExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
        };
        Ok(CallToolResult::success(vec![
            Content::json(response)?
        ]))
    }

    #[tool(description = "Get system information using bash commands")]
    async fn get_system_info(&self) -> Result<CallToolResult, ErrorData> {
        let command = r#"
echo "=== System Information ==="
echo "Hostname: $(hostname)"
echo "OS: $(uname -s)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Uptime: $(uptime)"
echo "Current User: $(whoami)"
echo "Current Directory: $(pwd)"
echo "Date: $(date)"
echo "Memory Usage:"
free -h 2>/dev/null || echo "free command not available"
echo "Disk Usage:"
df -h / 2>/dev/null || echo "df command not available"
        "#;

        self.execute_bash(BashExecuteRequest {
            command: command.to_string(),
            working_dir: None,
            env_vars: None,
            timeout_seconds: Some(10),
        })
        .await
    }
}

#[tool(tool_box)]
impl ServerHandler for BashServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::LATEST,
            capabilities: ServerCapabilities::builder()
                .enable_prompts()
                .enable_tools()
                .enable_resources()
                .enable_logging()
                .build(),
            instructions: Some(
                "A Model Context Protocol server that can execute bash commands and scripts. \
                 Use the execute_bash tool to run any bash command or script. \
                 Use get_system_info to get basic system information."
                    .to_string(),
            ),
            ..Default::default()
        }
    }

    async fn set_level(
        &self,
        SetLevelRequestParam { level } : SetLevelRequestParam,
        context: RequestContext<RoleServer>,
    ) -> Result<(), ErrorData> {
        let params = LoggingMessageNotificationParam {
                level, 
                logger: Some("Server".to_string()), 
                data: Value::String(format!("logging level is {:?}", level))
            };
        context.peer.notify_logging_message(params).await.map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("error message: {:?}", e)),
            data: None
        })
    }
}
