/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//! Fixed Linux diagnostics for MCP (Model Context Protocol).
//!
//! There is deliberately no caller-supplied command or script execution API.

use rmcp::model::Content;
use rmcp::{
    RoleServer, ServerHandler,
    handler::server::{router::tool::ToolRouter, tool::IntoCallToolResult},
    model::*,
    serde_json::Value,
    service::RequestContext,
    tool,
};
use rmcp::{serde_json, tool_handler, tool_router};
use serde::{Deserialize, Serialize};
use std::{
    borrow::Cow,
    fs,
    process::{Command, Stdio},
    time::Duration,
};
use tracing::{error, info};

// This enum is private and is not deserializable or exposed as an MCP parameter.
// Adding a diagnostic requires a source change, not client or configuration input.
#[derive(Debug, Clone, Copy)]
enum PresetDiagnostic {
    SystemInfo,
    NicInfo,
    CpuInfo,
    DiskFree,
    TopCpu,
    TopMemory,
}

impl PresetDiagnostic {
    fn script(self) -> &'static str {
        match self {
            Self::SystemInfo => {
                r#"(uname -r ; hostname ; uptime | awk -F "," '{print $1}' | sed "s/ //g") | sed ":a;N;s/\n/^/g;ta" | awk -F "^" 'BEGIN{print "version hostname uptime"} {print $1, $2, $3}'"#
            }
            Self::NicInfo => {
                r#"cat /proc/net/dev | tail -n +3 | awk 'BEGIN{ print "interface_name receive_bytes transmit_bytes"} {print $1,$2,$10}'"#
            }
            Self::CpuInfo => {
                r#"LANG=C lscpu | awk -F: '$1=="Model name" {print $2}';awk '/processor/{core++} END{print core}' /proc/cpuinfo;uptime | sed 's/,/ /g' | awk '{for(i=NF-2;i<=NF;i++)print $i }' | xargs;vmstat 1 1 | awk 'NR==3{print $11}';vmstat 1 1 | awk 'NR==3{print $12}';vmstat 1 2 | awk 'NR==4{print $15}'"#
            }
            Self::DiskFree => {
                r#"df -mP | tail -n +2 | awk 'BEGIN{ print "filesystem used available usage mounted"} {print $1,$3,$4,$5,$6}'"#
            }
            Self::TopCpu => {
                r#"ps aux | sort -k3nr | awk 'BEGIN{ print "pid cpu_usage mem_usage command" } {printf "%s %s %s ", $2, $3, $4; for (i=11; i<=NF; i++) { printf "%s", $i; if (i < NF) printf " "; } print ""}' | head -n 11"#
            }
            Self::TopMemory => {
                r#"ps aux | sort -k4nr | awk 'BEGIN{ print "pid cpu_usage mem_usage command" } {printf "%s %s %s ", $2, $3, $4; for (i=11; i<=NF; i++) { printf "%s", $i; if (i < NF) printf " "; } print ""}' | head -n 11"#
            }
        }
    }

    fn timeout(self) -> Duration {
        Duration::from_secs(match self {
            Self::SystemInfo => 10,
            _ => 5,
        })
    }

    fn command(self) -> Command {
        // These paths must be maintained by the trusted host administrator and
        // must not be writable by the service account. This is not a sandbox.
        let mut command = Command::new("/bin/bash");
        command
            .args(["--noprofile", "--norc", "-c", self.script()])
            .current_dir("/")
            // --noprofile/--norc alone do not suppress inherited BASH_ENV.
            .env_clear()
            .env("PATH", "/usr/bin:/bin")
            .env("LC_ALL", "C")
            .stdin(Stdio::null());
        command
    }
}

/// Fixed-diagnostic server. No configuration can enable arbitrary execution.
#[derive(Debug, Clone)]
pub struct BashServer {
    tool_router: ToolRouter<BashServer>,
}

impl BashServer {
    pub fn new() -> Self {
        Self {
            tool_router: Self::tool_router(),
        }
    }

    // The only process-launching path accepts a closed, internal preset, not a
    // command string, executable path, environment, timeout, or working directory.
    async fn run_preset(
        &self,
        preset: PresetDiagnostic,
    ) -> Result<DefaultExecuteResponse, ErrorData> {
        let mut command = preset.command();
        // Preserve the existing response wait timeout. Dropping this future does
        // not kill the blocking child or its pipeline; this is not a resource cap.
        let output = tokio::time::timeout(preset.timeout(), async {
            tokio::task::spawn_blocking(move || command.output()).await
        })
        .await
        .map_err(|_| ErrorData::internal_error("Diagnostic response timed out", None))?
        .map_err(|e| ErrorData::internal_error(format!("Failed to spawn diagnostic: {e}"), None))?
        .map_err(|e| {
            ErrorData::internal_error(format!("Diagnostic execution failed: {e}"), None)
        })?;

        info!("Executed fixed diagnostic: {preset:?}");
        Ok(DefaultExecuteResponse {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
            success: output.status.success(),
            parsed_data: Value::Null,
        })
    }

    async fn diagnostic(&self, preset: PresetDiagnostic) -> Result<CallToolResult, ErrorData> {
        let response = self.run_preset(preset).await?;
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    // Treat diagnostic output as data only. It is never fed back to a shell.
    fn parse_cpu_info(response: &mut DefaultExecuteResponse) {
        let lines: Vec<&str> = response
            .stdout
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect();
        if lines.len() >= 6 {
            let cpu_model = lines[0];
            let core_count = lines[1].parse::<u32>().unwrap_or(0);
            let load: Vec<f32> = lines[2]
                .split_whitespace()
                .filter_map(|value| value.parse::<f32>().ok())
                .collect();
            let interrupt = lines[3].parse::<u64>().unwrap_or(0);
            let context_switch = lines[4].parse::<u64>().unwrap_or(0);
            let idle = lines[5].parse::<u64>().unwrap_or(0);
            response.parsed_data = serde_json::json!({
                "cpu_model": cpu_model,
                "core_count": core_count,
                "load": load,
                "interrupt": interrupt,
                "context_switch": context_switch,
                "idle": idle
            });
        }
    }
}

#[tool_router]
impl BashServer {
    #[tool(description = "Get fixed Linux kernel, hostname, and uptime information")]
    async fn unix_preset_get_system_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        self.diagnostic(PresetDiagnostic::SystemInfo).await
    }

    /// Only lists existing files; it never executes a path from /etc/shells.
    #[tool(description = "List available shell paths from /etc/shells without executing them")]
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
        Ok(CallToolResult::success(available_shell))
    }

    #[tool(description = "Get fixed Linux network interface counters from /proc/net/dev")]
    async fn unix_preset_get_nic_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        self.diagnostic(PresetDiagnostic::NicInfo).await
    }

    #[tool(description = "Get fixed Linux CPU information using lscpu, /proc/cpuinfo, and vmstat")]
    async fn unix_preset_get_cpu_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        let mut response = self.run_preset(PresetDiagnostic::CpuInfo).await?;
        Self::parse_cpu_info(&mut response);
        Ok(CallToolResult::success(vec![Content::json(response)?]))
    }

    #[tool(description = "Get fixed Linux filesystem usage information")]
    async fn unix_preset_get_disk_free_info_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        self.diagnostic(PresetDiagnostic::DiskFree).await
    }

    #[tool(description = "Get the top 10 Linux processes by CPU usage")]
    async fn unix_preset_get_top10_cpu_processes_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        self.diagnostic(PresetDiagnostic::TopCpu).await
    }

    #[tool(description = "Get the top 10 Linux processes by memory usage")]
    async fn unix_preset_get_top10_mem_processes_via_default_shell(
        &self,
    ) -> Result<CallToolResult, ErrorData> {
        self.diagnostic(PresetDiagnostic::TopMemory).await
    }
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
            content: Some(vec![Content::text(content)]),
            structured_content: None,
            is_error: Some(!self.success),
        })
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
                "A Model Context Protocol server with seven fixed Linux diagnostics. \
                 Tools accept no command, script, Python code, environment, or working directory. \
                 The available-shells tool only lists paths; it never executes them."
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::{collections::BTreeMap, ffi::OsStr, path::Path};

    const PRESETS: [PresetDiagnostic; 6] = [
        PresetDiagnostic::SystemInfo,
        PresetDiagnostic::NicInfo,
        PresetDiagnostic::CpuInfo,
        PresetDiagnostic::DiskFree,
        PresetDiagnostic::TopCpu,
        PresetDiagnostic::TopMemory,
    ];

    // All tests below are metadata, serialization, or inert output parsing.
    // They do not spawn a process or invoke any diagnostic tool.
    fn response(stdout: &str, success: bool) -> DefaultExecuteResponse {
        DefaultExecuteResponse {
            stdout: stdout.to_string(),
            stderr: String::new(),
            exit_code: if success { 0 } else { 1 },
            success,
            parsed_data: Value::Null,
        }
    }

    #[test]
    fn test_only_seven_fixed_tools_registered() {
        let server = BashServer::new();
        let mut names: Vec<String> = server
            .tool_router
            .list_all()
            .iter()
            .map(|tool| tool.name.to_string())
            .collect();
        names.sort();
        assert_eq!(
            names,
            [
                "unix_get_available_shell",
                "unix_preset_get_cpu_info_via_default_shell",
                "unix_preset_get_disk_free_info_via_default_shell",
                "unix_preset_get_nic_info_via_default_shell",
                "unix_preset_get_system_info_via_default_shell",
                "unix_preset_get_top10_cpu_processes_via_default_shell",
                "unix_preset_get_top10_mem_processes_via_default_shell",
            ]
        );
    }

    #[test]
    fn test_generic_execution_routes_are_absent() {
        let server = BashServer::new();
        for removed in [
            "all_execute_via_default_shell",
            "execute_script",
            "execute_python",
        ] {
            assert!(!server.tool_router.has_route(removed));
        }
    }

    #[test]
    fn test_fixed_tools_have_no_input_properties() {
        for tool in BashServer::new().tool_router.list_all() {
            let properties = tool.input_schema.get("properties");
            assert!(
                properties.is_none()
                    || properties
                        .and_then(Value::as_object)
                        .is_some_and(|properties| properties.is_empty())
            );
        }
    }

    #[test]
    fn test_commands_use_fixed_program_and_one_script_argument() {
        for preset in PRESETS {
            let command = preset.command();
            assert_eq!(command.get_program(), OsStr::new("/bin/bash"));
            let args: Vec<&OsStr> = command.get_args().collect();
            assert_eq!(
                args,
                [
                    OsStr::new("--noprofile"),
                    OsStr::new("--norc"),
                    OsStr::new("-c"),
                    OsStr::new(preset.script()),
                ]
            );
            assert_eq!(command.get_current_dir(), Some(Path::new("/")));
        }
    }

    #[test]
    fn test_only_fixed_environment_is_explicitly_set() {
        for preset in PRESETS {
            let command = preset.command();
            let environment: BTreeMap<_, _> = command.get_envs().collect();
            assert_eq!(
                environment,
                BTreeMap::from([
                    (OsStr::new("LC_ALL"), Some(OsStr::new("C"))),
                    (OsStr::new("PATH"), Some(OsStr::new("/usr/bin:/bin"))),
                ])
            );
        }
        // get_envs() does not report inheritance. env_clear() is also required
        // in command(), and is checked in source review without spawning Bash.
    }

    #[test]
    fn test_fixed_response_wait_timeouts() {
        assert_eq!(
            PresetDiagnostic::SystemInfo.timeout(),
            Duration::from_secs(10)
        );
        for preset in &PRESETS[1..] {
            assert_eq!(preset.timeout(), Duration::from_secs(5));
        }
    }

    #[test]
    fn test_fixed_scripts_keep_literal_quoting_and_targets() {
        assert!(
            PresetDiagnostic::SystemInfo
                .script()
                .contains("uname -r ; hostname")
        );
        assert!(PresetDiagnostic::NicInfo.script().contains("/proc/net/dev"));
        assert!(
            PresetDiagnostic::CpuInfo
                .script()
                .contains(r#"'$1=="Model name" {print $2}'"#)
        );
        assert!(PresetDiagnostic::CpuInfo.script().contains("/proc/cpuinfo"));
        assert!(PresetDiagnostic::DiskFree.script().starts_with("df -mP |"));
        assert!(PresetDiagnostic::TopCpu.script().contains("sort -k3nr"));
        assert!(PresetDiagnostic::TopMemory.script().contains("sort -k4nr"));
    }

    #[test]
    fn test_cpu_output_parsing() {
        let mut result = response("Example CPU\n4\n1.0 2.0 3.0\n11\n12\n90\n", true);
        BashServer::parse_cpu_info(&mut result);
        assert_eq!(
            result.parsed_data,
            serde_json::json!({
                "cpu_model": "Example CPU",
                "core_count": 4,
                "load": [1.0, 2.0, 3.0],
                "interrupt": 11,
                "context_switch": 12,
                "idle": 90
            })
        );
    }

    #[test]
    fn test_cpu_short_or_non_numeric_output_remains_data() {
        let mut short = response("Example CPU\n", true);
        BashServer::parse_cpu_info(&mut short);
        assert!(short.parsed_data.is_null());
        let mut invalid = response(
            "Example CPU\nunknown\nunknown\nunknown\nunknown\nunknown",
            true,
        );
        BashServer::parse_cpu_info(&mut invalid);
        assert_eq!(invalid.parsed_data["core_count"], 0);
        assert_eq!(invalid.parsed_data["load"], serde_json::json!([]));
        assert_eq!(invalid.parsed_data["idle"], 0);
    }

    #[test]
    fn test_response_success_and_failure_formatting() {
        for success in [true, false] {
            let result = response("normal output", success)
                .into_call_tool_result()
                .unwrap();
            assert_eq!(result.is_error, Some(!success));
        }
    }

    #[test]
    fn test_response_json_shape_is_preserved() {
        let original = response("normal output", true);
        let encoded = serde_json::to_value(&original).unwrap();
        assert_eq!(encoded.as_object().unwrap().len(), 5);
        let decoded: DefaultExecuteResponse = serde_json::from_value(encoded).unwrap();
        assert_eq!(decoded.stdout, original.stdout);
        assert_eq!(decoded.exit_code, 0);
        assert!(decoded.success);
        assert!(decoded.parsed_data.is_null());
    }

    #[test]
    fn test_server_clone_and_instructions() {
        let server = BashServer::new();
        let cloned = server.clone();
        assert_eq!(cloned.tool_router.list_all().len(), 7);
        let instructions = cloned.get_info().instructions.unwrap();
        assert!(instructions.contains("seven fixed Linux diagnostics"));
        assert!(!instructions.contains("run any"));
    }
}
