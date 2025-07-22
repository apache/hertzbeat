//! Bash Server Implementation for MCP (Model Context Protocol)
//!
//! This module provides a bash command execution server that can run shell commands
//! safely with validation and timeout controls. It supports multiple operating systems
//! and provides various execution methods for different use cases.

use rmcp::model::Content;
use rmcp::{
    RoleServer, ServerHandler,
    handler::server::{
        router::tool::ToolRouter,
        tool::{IntoCallToolResult, Parameters},
    },
    model::*,
    schemars,
    serde_json::Value,
    service::RequestContext,
    tool,
};
use rmcp::{serde_json, tool_handler, tool_router};
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::process::Output;
use std::{
    borrow::Cow,
    env,
    fs::{self, File},
    io::Write,
    os::unix::fs::PermissionsExt,
    process::Command,
};
use tracing::error;
use tracing::info;
use uuid::Uuid;

use crate::common::config::Config;
use crate::common::validator::Validator;

/// Request structure for executing bash commands
/// Contains all necessary parameters for command execution including
/// working directory, environment variables, and timeout settings
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

/// Response structure for command execution results
/// Contains stdout, stderr, exit code, success status and any parsed data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultExecuteResponse {
    /// Standard output from the executed command
    pub stdout: String,
    /// Standard error output from the executed command  
    pub stderr: String,
    /// Exit code returned by the command (0 for success, non-zero for failure)
    pub exit_code: i32,
    /// Whether the command executed successfully (exit code 0)
    pub success: bool,
    /// Additional parsed data from command output (JSON format)
    pub parsed_data: serde_json::Value,
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

/// Main bash server implementation that handles command execution
/// with optional validation and timeout controls
#[derive(Debug, Clone)]
pub struct BashServer {
    validator: Option<Validator>,
    tool_router: ToolRouter<BashServer>,
}

/// Trait for command execution utilities
/// Provides common functionality for command formatting and execution
pub trait CommandRunner {
    /// Convert a Command instance to a readable string representation
    /// Handles proper quoting of arguments containing spaces
    fn stringify_command(cmd: &Command) -> String {
        let program = cmd.get_program().to_string_lossy();
        let args = cmd
            .get_args()
            .map(|arg| {
                let s = arg.to_string_lossy();
                if s.contains(' ') || s.contains('"') {
                    format!("{s:?}")
                } else {
                    s.to_string()
                }
            })
            .collect::<Vec<String>>()
            .join(" ");

        format!("{program} {args}")
    }

    /// Execute a command with timeout protection
    /// Returns command output or timeout error
    async fn execute_command_with_timeout(
        timeout: std::time::Duration,
        mut cmd: Command,
    ) -> Result<Output, ErrorData> {
        let cmd_str = Self::stringify_command(&cmd);
        // Execute command with timeout
        let output = tokio::time::timeout(timeout, async {
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
            message: Cow::Owned(format!("Failed to spawn command: {e}")),
            data: None,
        })?
        .map_err(|e| ErrorData {
            code: ErrorCode::INTERNAL_ERROR,
            message: Cow::Owned(format!("Command execution failed: {e}")),
            data: None,
        })?;

        // log execution of command
        info!("Execute command: {cmd_str}");
        Ok(output)
    }
}

impl CommandRunner for BashServer {}

#[tool_router]
impl BashServer {
    /// Create a new BashServer instance
    /// Attempts to load configuration from config.toml, creates validator if successful
    pub fn new() -> Self {
        let tool_router = Self::tool_router();
        if let Ok(config) = Config::read_config("config.toml")
            .inspect_err(|e| eprintln!("read config.toml fail, error: {e}"))
        {
            let blacklist = config.blacklist;
            BashServer {
                validator: Some(Validator::new(blacklist)),
                tool_router,
            }
        } else {
            Self {
                validator: None,
                tool_router,
            }
        }
    }

    /// Internal method for executing commands via default shell
    /// Supports validation toggle and handles cross-platform shell differences
    async fn _all_execute_via_default_shell(
        &self,
        need_validate: bool,
        request: DefaultExecuteRequest,
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

        // Validate the commands
        if let Some(validator) = &self.validator
            && need_validate
        {
            let program = cmd.get_program();
            let mut full_args: Vec<&OsStr> = vec![program];
            let args: Vec<&OsStr> = cmd.get_args().collect();
            full_args.extend(args);
            validator.is_unsafe_command(full_args)?;
        }

        let output: Output = Self::execute_command_with_timeout(timeout_duration, cmd).await?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
            parsed_data: Value::Null,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    #[tool(description = "Execute commands using default shell in all kinds of os")]
    async fn all_execute_via_default_shell(
        &self,
        Parameters(request): Parameters<DefaultExecuteRequest>,
    ) -> Result<CallToolResult, ErrorData> {
        self._all_execute_via_default_shell(true, request).await
    }

    #[tool(description = "Execute a python script")]
    async fn unix_execute_python(
        &self,
        Parameters(request): Parameters<DefaultExecuteRequest>,
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

        let output: Output = Self::execute_command_with_timeout(timeout_duration, cmd).await?;

        // log the execution of python
        info!("Execute python script: {}", &request.command);

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
            parsed_data: Value::Null,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    /// Execute a Unix script by writing it to a temporary file
    /// Creates a temporary shell script file with proper permissions and executes it
    #[tool(description = "Execute a unix script")]
    async fn unix_execute_script(
        &self,
        Parameters(request): Parameters<DefaultExecuteRequest>,
    ) -> Result<CallToolResult, ErrorData> {
        let timeout_duration =
            std::time::Duration::from_secs(request.timeout_seconds.unwrap_or(30));

        // Write the string to a temporary file
        let tmp_dir = env::temp_dir();
        // Generate a random script name
        let tmp_name = Uuid::new_v4().to_string();
        let script_path = tmp_dir.join(format!("{tmp_name}.sh"));
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

        let output: Output = Self::execute_command_with_timeout(timeout_duration, cmd).await?;
        info!("Execute script:\n{}", request.command);
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);
        let success = output.status.success();

        let response = DefaultExecuteResponse {
            stdout,
            stderr,
            exit_code,
            success,
            parsed_data: Value::Null,
        };
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    /// Get comprehensive system information including OS, kernel, memory, and disk usage
    /// Uses a multi-line shell command to gather various system details
    #[tool(description = "Get system information using bash commands")]
    async fn unix_get_system_info_via_default_shell(&self) -> Result<CallToolResult, ErrorData> {
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

        self._all_execute_via_default_shell(
            false,
            DefaultExecuteRequest {
                command: command.to_string(),
                working_dir: None,
                env_vars: None,
                timeout_seconds: Some(10),
            },
        )
        .await
    }

    /// Get formatted system information in a structured format
    /// Returns version, hostname, and uptime in a single line format
    #[tool(description = "Get system information using bash commands")]
    async fn unix_preset_get_system_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"(uname -r ; hostname ; uptime | awk -F "," '{print $1}' | sed  "s/ //g") | sed ":a;N;s/\n/^/g;ta" | awk -F '^' 'BEGIN{print "version hostname uptime"} {print $1, $2, $3}'"#;

        self._all_execute_via_default_shell(
            false,
            DefaultExecuteRequest {
                command: command.to_string(),
                working_dir: None,
                env_vars: None,
                timeout_seconds: Some(10),
            },
        )
        .await
    }

    /// Get list of available shells from /etc/shells
    /// Filters out comments and validates shell executable existence
    #[tool(description = "Get the available shell in unix-like os")]
    async fn unix_get_available_shell(&self) -> Result<CallToolResult, ErrorData> {
        let mut available_shell = vec![];
        let shells_file = "/etc/shells";
        match fs::read_to_string(shells_file) {
            Ok(content) => {
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') {
                        continue;
                    }
                    // Return the available shells
                    if fs::metadata(line).map(|m| m.is_file()).unwrap_or(false) {
                        available_shell.push(Content::text(line));
                    }
                }
                info!("Read file /etc/shells");
            }
            Err(e) => {
                error!("Failed to read {shells_file}: {e}");
                return Err(ErrorData {
                    code: ErrorCode::INTERNAL_ERROR,
                    message: Cow::Owned(format!("Failed to read {shells_file}: {e}")),
                    data: None,
                });
            }
        }
        let result = CallToolResult::success(available_shell);
        Ok(result)
    }

    /// Get network interface statistics including receive and transmit bytes
    /// Parses /proc/net/dev to extract interface names and traffic data
    #[tool(description = "Get the nic info through the default shell")]
    async fn unix_preset_get_nic_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"cat /proc/net/dev | tail -n +3 | awk 'BEGIN{ print "interface_name receive_bytes transmit_bytes"} {print $1,$2,$10}'"#;
        let result = self
            ._all_execute_via_default_shell(
                false,
                DefaultExecuteRequest {
                    command: command.to_string(),
                    working_dir: None,
                    env_vars: None,
                    timeout_seconds: Some(5),
                },
            )
            .await?;

        Ok(result)
    }

    /// Get detailed CPU information including model, core count, load averages, and performance metrics
    /// Combines data from lscpu, /proc/cpuinfo, uptime, and vmstat commands
    /// Parses the output to provide structured CPU performance data
    #[tool(description = "Get the cpu info through the default shell")]
    async fn unix_preset_get_cpu_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"LANG=C lscpu | awk -F: '$1=="Model name" {print $2}';awk '/processor/{core++} END{print core}' /proc/cpuinfo;uptime | sed 's/,/ /g' | awk '{for(i=NF-2;i<=NF;i++)print $i }' | xargs;vmstat 1 1 | awk 'NR==3{print $11}';vmstat 1 1 | awk 'NR==3{print $12}';vmstat 1 2 | awk 'NR==4{print $15}'"#;
        let mut result = self
            ._all_execute_via_default_shell(
                false,
                DefaultExecuteRequest {
                    command: command.to_string(),
                    working_dir: None,
                    env_vars: None,
                    timeout_seconds: Some(5),
                },
            )
            .await?;
        let raw_content = &mut result.content.get_mut(0).unwrap().raw;
        if let RawContent::Text(RawTextContent { text }) = raw_content {
            if let Ok(mut response) = serde_json::from_str::<DefaultExecuteResponse>(&text.clone())
            {
                // parse response.stdout
                // output e.g.:
                //                               Intel(R) Core(TM) i7-10875H CPU @ 2.30GHz
                // 16
                // 1.05 0.74 0.72
                // 1261
                // 5
                // 92
                let lines: Vec<&str> = response
                    .stdout
                    .lines()
                    .map(|l| l.trim())
                    .filter(|l| !l.is_empty())
                    .collect();
                if lines.len() >= 6 {
                    let cpu_model = lines[0];
                    let core_count = lines[1].parse::<u32>().unwrap_or(0);
                    let load: Vec<f32> = lines[2]
                        .split_whitespace()
                        .filter_map(|s| s.parse::<f32>().ok())
                        .collect();
                    let interrupt = lines[3].parse::<u64>().unwrap_or(0);
                    let context_switch = lines[4].parse::<u64>().unwrap_or(0);
                    let idle = lines[5].parse::<u64>().unwrap_or(0);

                    let parsed = serde_json::json!({
                        "cpu_model": cpu_model,
                        "core_count": core_count,
                        "load": load,
                        "interrupt": interrupt,
                        "context_switch": context_switch,
                        "idle": idle
                    });
                    response.parsed_data = parsed;
                    *text = serde_json::to_string(&response).unwrap();
                }
            }
        }

        Ok(result)
    }

    /// Get disk usage information for all mounted filesystems
    /// Returns filesystem usage data in tabular format with columns for filesystem, used, available, usage percentage, and mount point
    #[tool(description = "Get the disk free info through the default shell")]
    async fn unix_preset_get_disk_free_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"df -mP | tail -n +2 | awk 'BEGIN{ print "filesystem used available usage mounted"} {print $1,$3,$4,$5,$6}'"#;
        let result = self
            ._all_execute_via_default_shell(
                false,
                DefaultExecuteRequest {
                    command: command.to_string(),
                    working_dir: None,
                    env_vars: None,
                    timeout_seconds: Some(5),
                },
            )
            .await?;
        Ok(result)
    }

    /// Get top 10 processes consuming the most CPU
    /// Returns process information sorted by CPU usage in descending order
    #[tool(description = "Get the top 10 cpu processes through the default shell")]
    async fn unix_preset_get_top10_cpu_processes_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"ps aux | sort -k3nr | awk 'BEGIN{ print "pid cpu_usage mem_usage command" } {printf "%s %s %s ", $2, $3, $4; for (i=11; i<=NF; i++) { printf "%s", $i; if (i < NF) printf " "; } print ""}' | head -n 11"#;
        let result = self
            ._all_execute_via_default_shell(
                false,
                DefaultExecuteRequest {
                    command: command.to_string(),
                    working_dir: None,
                    env_vars: None,
                    timeout_seconds: Some(5),
                },
            )
            .await?;
        Ok(result)
    }

    /// Get top 10 processes consuming the most memory
    /// Returns process information sorted by memory usage in descending order
    #[tool(description = "Get the top 10 mem processes through the default shell")]
    async fn unix_preset_get_top10_mem_processes_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let command = r#"ps aux | sort -k4nr | awk 'BEGIN{ print "pid cpu_usage mem_usage command" } {printf "%s %s %s ", $2, $3, $4; for (i=11; i<=NF; i++) { printf "%s", $i; if (i < NF) printf " "; } print ""}' | head -n 11"#;
        let result = self
            ._all_execute_via_default_shell(
                false,
                DefaultExecuteRequest {
                    command: command.to_string(),
                    working_dir: None,
                    env_vars: None,
                    timeout_seconds: Some(5),
                },
            )
            .await?;
        Ok(result)
    }
}

#[tool_handler]
impl ServerHandler for BashServer {
    /// Returns server information including protocol version, capabilities, and usage instructions
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
                r#"A Model Context Protocol server that can execute shell commands and scripts in the machine server deployed at.
                 Use the `execute_via_default_shell` tool to run any shell command.
                 Use `execute_unix_script` to run any scripts in unix-like os.
                 Use `execute_python` to run any python scripts.
                 Use `get_system_info` to get basic system information."#
                    .to_string(),
            ),
            ..Default::default()
        }
    }

    /// Set the logging level for the server
    /// Sends a logging message notification to the connected peer
    async fn set_level(
        &self,
        SetLevelRequestParam { level }: SetLevelRequestParam,
        context: RequestContext<RoleServer>,
    ) -> Result<(), ErrorData> {
        let params = LoggingMessageNotificationParam {
            level,
            logger: Some("Server".to_string()),
            data: Value::String(format!("logging level is {level:?}")),
        };
        context
            .peer
            .notify_logging_message(params)
            .await
            .map_err(|e| ErrorData {
                code: ErrorCode::INTERNAL_ERROR,
                message: Cow::Owned(format!("error message: {e:?}")),
                data: None,
            })
    }
}
