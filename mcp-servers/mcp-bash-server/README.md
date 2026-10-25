# mcp-bash-server

A HertzBeat MCP server exposing seven fixed, parameterless system diagnostic tools.

General shell command, script, and Python execution has been removed. The tools
`all_execute_via_default_shell`, `execute_script`, and `execute_python` are no
longer registered. This is not a default-off feature or a configurable switch:
configuration changes cannot restore them.

## Dependencies

### Linux diagnostic tools

The diagnostics are designed for Linux. Network and CPU diagnostics require
`/proc/net/dev`, `/proc/cpuinfo`, and Linux utilities such as `lscpu` and `vmstat`;
the `unix_` tool-name prefix does not imply support for every Unix-like system.
The shell-list tool reads `/etc/shells`.

Process-based diagnostics require the trusted executable `/bin/bash`. Their
fixed scripts use `uname`, `hostname`, `uptime`, `awk`, `sed`, `lscpu`, `vmstat`,
`xargs`, `cat`, `tail`, `df`, `ps`, `sort`, and `head`, resolved only through
`/usr/bin:/bin`. Ensure these tools are present in the deployment image or host.
They commonly come from coreutils, procps, util-linux, findutils, an awk
implementation, sed, and hostname packages; package names vary by distribution.
Missing tools or unsupported platforms can make a diagnostic fail. There is no
fallback to a caller-specified executable or shell.

Keep `/bin/bash`, `/usr/bin`, and `/bin` administrator-managed and non-writable
by the server account. The server still trusts the host operating system and
installed diagnostic binaries.

### Rust

If you need to deploy this MCP Server locally, you will need a Rust runtime environment.

Visit [rust-lang.org](https://www.rust-lang.org/tools/install) to learn how to install the Rust runtime environment.

Version `1.88.0` can absolutely work, and we recommend using the latest version of Rust.

## Deployment

### Local Deployment

If you want to run this MCP server locally using the default settings provided by the project, simply run the following command in the project root directory:

```shell
export MCP_OAUTH_APPROVAL_SECRET="<at-least-32-random-characters>"
export MCP_OAUTH_PUBLIC_BASE_URL="https://mcp.example.com"
cargo run
```

This MCP server will be deployed at `http://127.0.0.1:4000/mcp`, and you can use the `modelcontextprotocol/inspector` tool to connect to and use this MCP server.

Production mode requires `MCP_OAUTH_APPROVAL_SECRET`. The operator enters this
secret on the OAuth approval page; it is separate from dynamically registered
client credentials. Production also requires an explicit HTTPS
`MCP_OAUTH_PUBLIC_BASE_URL`; OAuth metadata never derives public endpoints from
the request `Host` header. Development mode generates a temporary approval
secret and may derive a loopback HTTP URL from the local bind address.

Dynamic registration supports public clients (`token_endpoint_auth_method:
none`) and confidential clients (`client_secret_post`). Authorization requests
must use PKCE S256. Authorization transactions and codes are one-time and
short-lived; access tokens expire after one hour, and refresh tokens expire
after one day and rotate on every use. A client that holds a refresh token
remains registered for at least that token's full lifetime. Open client
registration is limited to 16 successful registrations per minute for each
TCP peer, so one source cannot consume every caller's admission window. The
rate-limit source table is bounded. Deployments behind a reverse proxy can set
`MCP_OAUTH_TRUSTED_PROXY_CIDRS` to a comma-separated list of the exact proxy
networks. Only connections from those networks may supply `X-Forwarded-For`;
untrusted peers cannot spoof the limiter identity, and `/0` networks are
rejected. The proxy must overwrite or safely append that header. An unused
registered client expires after one hour; expired clients are removed before
the 1,024-client capacity check.
When anonymous registrations fill the remaining capacity, the oldest client
that has never received a refresh token is reclaimed; clients with live
refresh credentials are not evicted. A client that receives `invalid_client`
after an unused registration expires must dynamically register again. OAuth
form and JSON bodies are limited to 16 KiB.

For information on how to use the modelcontextprotocol/inspector tool, refer to the [inspector documentation](https://github.com/modelcontextprotocol/inspector).

If you encounter any issues while using Inspector, it is recommended to use version `v0.16.2`. Other versions may also work.

### Container Deployment

Container deployment runs diagnostics against the container's view of the system.
It does not automatically expose host diagnostics, and mounting host resources
can expose additional information. See the execution boundaries below.

Refer to the `Dockerfile` in the code repository and create your own Dockerfile. After creating it, run the following build command:

```shell
docker build -t apache/hertzbeat-mcp-bash-server:latest .
```

You can use the proxy in docker build

```shell
docker build --build-arg HTTPS_PROXY=<your https_proxy> --build-arg HTTP_PROXY=<your http_proxy> -t apache/hertzbeat-mcp-bash-server:latest .
```

After building, use the following command to run it:

```shell
docker run -d --name mcp-bash-server -p 127.0.0.1:4000:4000 \
  -e MCP_OAUTH_APPROVAL_SECRET="<at-least-32-random-characters>" \
  -e MCP_OAUTH_PUBLIC_BASE_URL="https://mcp.example.com" \
  --restart unless-stopped apache/hertzbeat-mcp-bash-server:latest
```

The MCP Server inside the container runs on 0.0.0.0:4000, while the example
publishes it only on the host loopback interface. On the host machine, use the
inspector with URL `http://localhost:4000/mcp` to connect to the MCP Server
inside the container. Remote deployments must terminate TLS before forwarding
OAuth endpoints to the container.

#### Use custom config in container

Container's workdir is `/app` and it will run the `/app/mcp-bash-server` when it start, this program will read the `config.toml` at the same directory, so you can put the `config.toml` in the `/app` directory to cover the default config in image. Use the command below to do it.

```shell
docker run -d --name mcp-bash-server -p 127.0.0.1:4000:4000 \
  -e MCP_OAUTH_APPROVAL_SECRET="<at-least-32-random-characters>" \
  -e MCP_OAUTH_PUBLIC_BASE_URL="https://mcp.example.com" \
  -v `pwd`/config.toml:/app/config.toml \
  --restart unless-stopped apache/hertzbeat-mcp-bash-server:latest
```

If you are using SELinux, you may need to run the command instead to let the container access the file in host.

```shell
docker run -d --name mcp-bash-server -p 127.0.0.1:4000:4000 \
  -e MCP_OAUTH_APPROVAL_SECRET="<at-least-32-random-characters>" \
  -e MCP_OAUTH_PUBLIC_BASE_URL="https://mcp.example.com" \
  -v `pwd`/config.toml:/app/config.toml:Z \
  --restart unless-stopped apache/hertzbeat-mcp-bash-server:latest
```

To check if the config.toml is used, do this

```shell
docker logs mcp-bash-server
```

or check the config.toml in container

```shell
docker exec mcp-bash-server ls /app
docker exec mcp-bash-server cat /app/config.toml
```

## Use it by Agents

### Vscode Copilot

Start the MCP Server in daemon mode, then add the settings to your Vscode Copilot mcp config. Note that you can use modelcontextprotocol/inspector to finish the OAuth flow and get the access token, put it in config and restart server, then Copilot can connect to the server and use the tools.

```json
{
   "servers": {
      "bash-server": {
         "url": "http://localhost:4000/mcp",
         "headers": {
            "Authorization": "Bearer <your-token>"
         }
      }
   }
}
```

OAuth-capable MCP clients can discover the authorization metadata, dynamically
register a public client, and complete the PKCE flow. A manually configured
bearer token remains available for clients that do not implement MCP OAuth.

## Configuration

The `config.toml` file contains the settings for this MCP server. The configuration items currently supported by the configuration file are as follows:

```toml
# This is the configuration file for mcp-bash-server

[settings]
# Port for MCP Server deployment
port = 4000
# IP for MCP Server deployment
host = "127.0.0.1"
# Usage environment for MCP Server, can be either development or production environment.
# Set env to "development" or "production"; production uses OAuth 2.0.
env = "production"
```

Only server settings are configurable. Legacy `[whitelist]` and `[blacklist]`
sections are ignored when reading an existing configuration. They cannot
re-enable removed tools or alter the fixed diagnostic commands.

## Testing

### Unit Tests

Run `cargo test` to execute all unit tests.

#### Configuration Tests (`config.rs`)

- **Config Parsing**: Tests parsing a settings-only TOML configuration
- **Legacy Configuration Compatibility**: Tests that old whitelist and blacklist
  sections are ignored and are not written back when configuration is serialized
- **Invalid File Handling**: Tests error handling for non-existent configuration files
- **Invalid TOML Handling**: Tests error handling for malformed TOML syntax
- **Optional Environment**: Tests settings without an explicit environment value
- **Settings Creation**: Tests creation of server settings with port, host, and environment configurations

#### Diagnostic Boundary Checks

When changing the server, verify that the tool list contains exactly the seven
tools below, that they accept no caller-controlled parameters, and that the
removed tool names are unavailable. Verify the fixed command definitions,
executable, environment, working directory, and wait timeouts without restoring
a generic execution helper. Configuration compatibility is not permission to
restore general execution.

### Manual Testing with Inspector

Use the official MCP debugging tool modelcontextprotocol/inspector. For usage instructions, refer to the [inspector documentation](https://github.com/modelcontextprotocol/inspector).

If you deploy the MCP Server locally using the default method, run the inspector debugging tool after the server starts.

```shell
npx @modelcontextprotocol/inspector
```

Then set the connection method to `Streamable HTTP` and set the URL to `http://127.0.0.1:4000/mcp`.

### Using OAuth in Inspector (Optional)

If your running mode is `development`, you don't need to go through `Open Auth Settings` and can directly click Connect to connect to the MCP Server. If your running mode is `production`, you need to complete the `Open Auth Settings` verification.

The method for using OAuth verification and connection is as follows:

1. Click `Open Auth Settings`
2. Click `Quick OAuth Flow`
3. Enter the server operator's `MCP_OAUTH_APPROVAL_SECRET`, then click `Approve`
   on the pop-up webpage
4. Return to the MCP inspector, click on the Access Tokens under `Authentication Complete` in `OAuth Flow Progress`. Copy the `access_token` from there
5. Click `Authentication`, paste the previously copied token into the `Bearer Token` field, then click Connect

After connecting, you can test the various tools provided by the MCP Server in the inspector.

## Tools

The MCP server provides exactly the following seven tools. All are parameterless:
clients cannot supply commands, scripts, executable paths, arguments, environment
variables, working directories, or timeout values.

### System Information Tools

1. **unix_preset_get_system_info_via_default_shell**
   - Description: Get formatted system information in a structured format
   - Parameters: None
   - Returns: Kernel version, hostname, and uptime in a single line format

2. **unix_get_available_shell**
   - Description: Get the available shells on Unix-like operating systems
   - Parameters: None
   - Returns: Paths listed in `/etc/shells` that refer to files. These paths are
     inspected with file metadata and are never executed.

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

## Execution Boundaries and Limitations

- The six process-based diagnostics select only fixed scripts defined in the
  server source. Each starts `/bin/bash` with `--noprofile`, `--norc`, and a
  separate `-c` argument containing the selected script. Tool output is returned
  as data, not evaluated as a new command.
- The child environment is cleared with `env_clear` before launch. Only the
  fixed `PATH=/usr/bin:/bin` and `LC_ALL=C` are set; inherited startup variables
  such as `BASH_ENV` and exported shell functions are not copied. The working
  directory is fixed to `/`.
- The system-information diagnostic has a fixed 10-second wait timeout; the
  other five process-based diagnostics have fixed 5-second wait timeouts.
  These timeouts stop waiting for a result but do **not** terminate a still
  running subprocess or its descendants. A slow diagnostic can continue after
  the request reports a timeout.
- This change does not introduce output-size limits or concurrency limits.
  Commands may block on host resources or return substantial output. The
  parameterless interface is not a sandbox or complete resource isolation.
- The server still runs with its service account's operating-system privileges
  and can return sensitive system information, including process command lines.
  Keep production authentication enabled and grant access only to trusted
  clients.
- Legacy whitelist and blacklist settings have no effect. There is no
  configuration switch to restore general shell, script, or Python execution.
