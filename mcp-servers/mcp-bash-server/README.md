# mcp-bash-server

A hertzbeat MCP server for running scripts with security command blacklist and logging capabilities

## Dependencies

### Rust

If you need to deploy this MCP Server locally, you will need a Rust runtime environment.

Visit [rust-lang.org](https://www.rust-lang.org/tools/install) to learn how to download the Rust runtime environment.

We recommend choosing the latest version of Rust.

## Deployment

### Local Deployment

If you want to run this MCP server locally using the default settings provided by the project, simply run the following command in the project root directory:

```Rust
cargo run
```

This MCP server will be deployed at `http://127.0.0.1:4000/mcp`, and you can use the `modelcontextprotocol/inspector` tool to connect to and use this MCP server.

For information on how to use the modelcontextprotocol/inspector tool, refer to [inspector](https://github.com/modelcontextprotocol/inspector)

### Container Deployment

TODO

## config

`config.toml` contains the settings for this MCP server. The configuration items currently supported by the configuration file are as follows:

```toml
# This is the configuration file for mcp-bash-server

[settings]
# Port for MCP Server deployment
port = 4000
# IP for MCP Server deployment
host = "127.0.0.1"
# Usage environment for MCP Server, can be development or production environment.
# Set env to "development" or "production", production uses oauth2.0.
env = "development"

[whitelist]
# Whitelist of allowed commands (exact match), a string list.
# Only commands where the complete command string exactly matches an item in this list will be allowed
commands = [
    "echo hello",
    "ls -la", 
    "pwd",
    # Add your allowed commands here
]
# Whitelist of allowed command regex patterns, a regex expression string list
# Commands where the complete command string matches any of these regex patterns will be allowed
regex = [
    '^echo [a-zA-Z0-9 ]+$',
    '^ls [a-zA-Z0-9 /-]*$',
    # Add your whitelist regex patterns here
]

[blacklist]
# Blacklist of forbidden commands (exact match), a string list
# Blacklist has higher priority than whitelist. If the complete command string exactly matches an item in this list, the entire command will be blocked, even if it would be allowed by the whitelist
# Note: Only exact matches are blocked. For example, if "rm" is blacklisted, only the exact command "rm" is blocked, not commands like "rm -rf /tmp/test"
commands = [
    # Dangerous file operations
    "rm -rf /",
    "shutdown",
    # Add your forbidden commands here
]
# Blacklist of forbidden command regex patterns, a regex expression string list  
# Blacklist has higher priority than whitelist. If the complete command string matches any of these regex patterns, it will be blocked, even if it would be allowed by the whitelist
regex = [
    # Block any command with dangerous operators
    '.*[|&;`$()><].*',
    # Block commands that try to write to system directories
    '.*/etc/.*',
    '.*/root/.*',
    # Block commands with sudo or su
    '^sudo .*',
    '^su .*',
    # Add your blacklist regex patterns here
]
```

## Testing

### Unit Tests

Run `cargo test` to execute all unit tests.

The unit tests include:

#### Configuration Tests (`config.rs`)

- **Config Parsing**: Tests parsing of TOML configuration files with various settings
- **Invalid File Handling**: Tests error handling for non-existent configuration files
- **Invalid TOML Handling**: Tests error handling for malformed TOML syntax
- **Whitelist Creation**: Tests creation and validation of command whitelists
- **Blacklist Creation**: Tests creation and validation of command blacklists
- **Settings Creation**: Tests creation of server settings with port, host, and environment configurations

#### Validator Tests (`validator.rs`)

- **Validator Creation**: Tests creation of command validators with blacklist and whitelist rules (both commands and regex)
- **Whitelisted Command Validation**: Tests allowing commands that exactly match whitelist entries
- **Whitelisted Regex Validation**: Tests allowing commands that match whitelist regex patterns
- **Blacklisted Command Blocking**: Tests blocking of commands that exactly match blacklist entries (complete command string)
- **Blacklisted Regex Blocking**: Tests blocking of commands matching blacklist regex patterns  
- **Priority Testing**: Tests that blacklist has higher priority than whitelist
- **Exact vs Partial Match Testing**: Tests that blacklist only blocks exact command matches, not partial matches
- **Default Deny Behavior**: Tests that commands not in whitelist are denied by default
- **Empty Command Handling**: Tests that empty commands are denied by default
- **Case Sensitivity Testing**: Tests case-sensitive command matching behavior
- **Invalid Regex Handling**: Tests error handling for invalid regex patterns
- **Complex Command Testing**: Tests validation of multi-argument commands
- **Nested Shell Command Testing**: Tests validation of commands within shell invocations

#### Bash Server Tests (`bash_server.rs`)

- **Response Success/Failure**: Tests command execution response handling for both successful and failed commands
- **Command Stringification**: Tests conversion of Command objects to readable string representations
- **Command Execution with Timeout**: Tests command execution with timeout protection
- **Server Creation**: Tests BashServer instantiation with and without configuration
- **Request/Response Serialization**: Tests JSON serialization and deserialization of command requests and responses
- **Environment Variable Handling**: Tests setting and using environment variables in commands
- **Working Directory Handling**: Tests command execution in specific working directories
- **Debug and Clone Traits**: Tests that BashServer properly implements Debug and Clone traits
- **Timeout Behavior**: Tests that commands properly timeout when exceeding time limits

### Use inspector to test manually

Use the official MCP debugging tool modelcontextprotocol/inspector. For usage instructions, refer to: [inspector](https://github.com/modelcontextprotocol/inspector)

If you deploy the MCP Server locally using the default method, run the inspector debugging tool after the server starts.

```shell
npx @modelcontextprotocol/inspector
```

Then set the connection method to `Streamable HTTP` and set the URL to `http://127.0.0.1:4000/mcp`

### Use OAuth in inspector (Optional)

If your running mode is `development`, you don't need to go through `Open Auth Settings` and can directly click Connect to connect to the MCP Server. If your running mode is `production`, you need to complete `Open Auth Settings` verification.

The method to use `OAuth` verification and connection is as follows:

1. Click `Open Auth Settings`
2. Click `Quick OAuth Flow`
3. Click `Approve` on the pop-up webpage
4. Return to the MCP inspector, click the Access Tokens under `Authentication Complete` in `OAuth Flow Progress`. Copy the `access_token` from there
5. Click `Authentication`, paste the previously copied token into the `Bearer Token` field, then click connect

After connecting, you can test the various tools provided by the MCP Server in the inspector.

## Tools

The MCP Server currently provides the following tools:

### Command Execution Tools

1. **all_execute_via_default_shell**
   - Description: Execute commands using default shell in all kinds of OS
   - Parameters:
     - `command`: The bash command or script to execute
     - `working_dir`: Working directory for the command (optional)
     - `env_vars`: Environment variables (optional)
     - `timeout_seconds`: Timeout in seconds (default: 30)
   - Returns: Execution result with stdout, stderr, exit code, and success status

2. **unix_execute_python**
   - Description: Execute a Python script
   - Parameters: Same as above, but command should be Python code
   - Returns: Python script execution result

3. **unix_execute_script**
   - Description: Execute a Unix script by writing it to a temporary file
   - Parameters: Same as above, command should be shell script content
   - Returns: Script execution result

### System Information Tools

1. **unix_get_system_info_via_default_shell**
   - Description: Get comprehensive system information including OS, kernel, memory, and disk usage
   - Parameters: None
   - Returns: Detailed system information including hostname, OS, kernel, architecture, uptime, memory usage, and disk usage

2. **unix_preset_get_system_info_via_default_shell**
   - Description: Get formatted system information in a structured format
   - Parameters: None
   - Returns: Version, hostname, and uptime in a single line format

3. **unix_get_available_shell**
   - Description: Get the available shells in Unix-like OS
   - Parameters: None
   - Returns: List of available shells from /etc/shells

### Performance Monitoring Tools

1. **unix_preset_get_nic_info_via_default_shell**
   - Description: Get network interface statistics including receive and transmit bytes
   - Parameters: None
   - Returns: Interface names and traffic data in tabular format

2. **unix_preset_get_cpu_info_via_default_shell**
   - Description: Get detailed CPU information including model, core count, load averages, and performance metrics
   - Parameters: None
   - Returns: CPU model, core count, load averages, idle percentage, and other performance metrics

3. **unix_preset_get_disk_free_info_via_default_shell**
   - Description: Get disk usage information for all mounted filesystems
   - Parameters: None
   - Returns: Filesystem usage data with columns for filesystem, used, available, usage percentage, and mount point

4. **unix_preset_get_top10_cpu_processes_via_default_shell**
   - Description: Get top 10 processes consuming the most CPU
   - Parameters: None
   - Returns: Process information sorted by CPU usage in descending order

5. **unix_preset_get_top10_mem_processes_via_default_shell**
   - Description: Get top 10 processes consuming the most memory
   - Parameters: None
   - Returns: Process information sorted by memory usage in descending order

### Security Features

All command execution tools support comprehensive security validation:

- **Default Deny Policy**: All commands are denied by default unless explicitly allowed
- **Blacklist Priority**: Blacklist rules have higher priority than whitelist rules
- **Dual Validation Modes**: Both exact string matching and regex pattern matching for blacklist and whitelist
- **Command Validation Logic**:
  1. Empty commands are denied by default
  2. If the **complete command string** exactly matches any blacklist command entry, deny immediately
  3. If the **complete command string** matches any blacklist regex pattern, deny immediately
  4. If command doesn't match blacklist and the **complete command string** exactly matches any whitelist command entry, allow
  5. If command doesn't match blacklist and the **complete command string** matches any whitelist regex pattern, allow
  6. Otherwise, deny by default
- **Important**: Blacklist validation checks the **entire command string**, not individual arguments. For example, if `"rm"` is blacklisted, only the exact command `"rm"` is blocked, not commands like `"rm -rf /tmp/test"` (which would be evaluated separately against the whitelist)
- **Timeout Protection**: Commands have configurable timeout limits to prevent hanging
- **Environment Isolation**: Optional working directory and environment variable settings
- **Logging**: All command executions and validation results are logged for audit purposes
- **Nested Shell Protection**: Validates commands within shell invocations (e.g., `bash -c "command"`)

### Tool Categories

- **General Execution**: Tools 1-3 for executing arbitrary commands, Python scripts, and shell scripts
- **System Monitoring**: Tools 1-3 for gathering basic system information
- **Performance Analysis**: Tools 1-5 for detailed performance monitoring and process analysis
