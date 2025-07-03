use rmcp::{
    RoleServer, ServerHandler, handler::server::tool::IntoCallToolResult, model::*, schemars,
    serde_json::Value, service::RequestContext, tool,
};
use serde::{Deserialize, Serialize};
use std::{
    borrow::Cow,
    env,
    fs::{self, File},
    io::Write,
    os::unix::fs::PermissionsExt,
    process::Command,
};

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct DefaultExecuteRequest {
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
pub struct DefaultExecuteResponse {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub success: bool,
}

impl IntoCallToolResult for DefaultExecuteResponse {
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
        #[tool(aggr)] request: DefaultExecuteRequest,
    ) -> Result<CallToolResult, ErrorData> {
        let timeout_duration =
            std::time::Duration::from_secs(request.timeout_seconds.unwrap_or(30));

        let mut cmd = if cfg!(target_os = "linux") {
            let mut cmd = Command::new("bash");
            cmd.arg("-c");
            cmd
        } else if cfg!(target_os = "windows") {
            let mut cmd = Command::new("powershell");
            cmd.arg("-c");
            cmd
        } else {
            let mut cmd = Command::new("sh");
            cmd.arg("-c");
            cmd
        };
        cmd.arg(&request.command);

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
        .map_err(|_| ErrorData {
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

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    #[tool(description = "Execute a python script")]
    async fn execute_python(
        &self,
        #[tool(aggr)] request: DefaultExecuteRequest,
    ) -> Result<CallToolResult, ErrorData> {
        let timeout_duration =
            std::time::Duration::from_secs(request.timeout_seconds.unwrap_or(30));

        // Check if /usr/bin/env exists before proceeding
        let env_exists = std::path::Path::new("/usr/bin/env").exists();
        if !env_exists {
            return Err(ErrorData {
                code: ErrorCode::INTERNAL_ERROR,
                message: Cow::Owned(
                    "Python execution failed: /usr/bin/env not found on system".to_string(),
                ),
                data: None,
            });
        }

        let mut cmd = Command::new("/usr/bin/env");
        cmd.arg("python3").arg("-c").arg(&request.command);

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
        .map_err(|_| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned("Python execution timed out".to_string()),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Failed to spawn python execution: {}", e)),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Python execution failed: {}", e)),
            data: None,
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    #[tool(description = "Execute a unix script")]
    async fn execute_unix_script(
        &self,
        #[tool(aggr)] request: DefaultExecuteRequest,
    ) -> Result<CallToolResult, ErrorData> {
        let timeout_duration =
            std::time::Duration::from_secs(request.timeout_seconds.unwrap_or(30));

        // Write the string to a temporary file
        let tmp_dir = env::temp_dir();
        let script_path = tmp_dir.join("temp_script.sh");
        {
            let mut file =
                File::create(&script_path).expect("Can not create temporary script file");
            file.write_all(request.command.as_bytes())
                .expect("Write to script file error");
            // Set execution mode
            let mut perms = file.metadata().unwrap().permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&script_path, perms).expect("Set mode 755 fail");
        }

        let mut cmd = Command::new(&script_path);

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
        .map_err(|_| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned("Unix script execution timed out".to_string()),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Failed to spawn unix script execution: {}", e)),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Unix script execution failed: {}", e)),
            data: None,
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    #[tool(description = "Get system information using bash commands")]
    async fn get_system_info_via_bash(&self) -> Result<CallToolResult, ErrorData> {
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

        self.execute_bash(DefaultExecuteRequest {
            command: command.to_string(),
            working_dir: None,
            env_vars: None,
            timeout_seconds: Some(10),
        })
        .await
    }

    #[tool(description = "Get the available shell in unix-like os")]
    async fn get_unix_available_shell(&self) -> Result<CallToolResult, ErrorData> {
        let shells = [
            "/bin/bash",
            "/bin/sh",
            "/bin/zsh",
            "/usr/bin/fish",
            "/usr/bin/tcsh",
            "/usr/bin/dash",
        ];
        let mut available_shell = vec![];
        for shell in shells {
            if fs::metadata(shell).map(|m| m.is_file()).unwrap_or(false) {
                available_shell.push(Content::text(shell));
            }
        }
        let result = CallToolResult::success(available_shell);
        Ok(result)
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
        SetLevelRequestParam { level }: SetLevelRequestParam,
        context: RequestContext<RoleServer>,
    ) -> Result<(), ErrorData> {
        let params = LoggingMessageNotificationParam {
            level,
            logger: Some("Server".to_string()),
            data: Value::String(format!("logging level is {:?}", level)),
        };
        context
            .peer
            .notify_logging_message(params)
            .await
            .map_err(|e| ErrorData {
                code: ErrorCode::INTERNAL_ERROR,
                message: Cow::Owned(format!("error message: {:?}", e)),
                data: None,
            })
    }
}
