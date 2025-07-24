//! Configuration management for the MCP Bash Server
//!
//! This module handles reading and parsing configuration from TOML files,
//! including server settings and security blacklists for command validation.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub settings: Settings,
    pub blacklist: Blacklist,
    pub whitelist: Whitelist,
}

/// Security whitelist configuration for command validation
/// Contains lists of allowed commands and operations
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Whitelist {
    /// List of command names that are allowed to be executed
    pub commands: Vec<String>,
    /// List of regular expressions for commands that are allowed
    /// These patterns are matched against the full command line
    pub regex: Vec<String>,
}

/// Security blacklist configuration for command validation
/// Contains lists of forbidden commands and operations
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Blacklist {
    /// List of command names that are not allowed to be executed
    pub commands: Vec<String>,
    /// List of operations/symbols that are not allowed in commands
    pub operations: Vec<String>,
}

/// Server runtime settings including network configuration
#[derive(Debug, Deserialize, Serialize)]
pub struct Settings {
    pub port: u16,
    pub host: String,
    pub env: Option<String>, // "development" or "production"
}

impl Config {
    /// Read and parse configuration from a TOML file
    /// Returns parsed Config structure or error if file cannot be read/parsed
    pub fn read_config(file: &str) -> Result<Config> {
        let toml_str = fs::read_to_string(file)?;
        let config: Config = toml::from_str(&toml_str)?;
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_config_parsing() {
        let config_content = r#"
[settings]
port = 4000
host = "127.0.0.1"
env = "development"

[whitelist]
commands = ["echo hello", "ls -la"]
regex = ["echo.*", "ls.*"]

[blacklist]
commands = ["rm", "dd"]
operations = ["|", "&"]
"#;

        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "{}", config_content).unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let config = Config::read_config(temp_path).unwrap();

        assert_eq!(config.settings.port, 4000);
        assert_eq!(config.settings.host, "127.0.0.1");
        assert_eq!(config.settings.env, Some("development".to_string()));

        assert_eq!(config.whitelist.commands.len(), 2);
        assert!(
            config
                .whitelist
                .commands
                .contains(&"echo hello".to_string())
        );
        assert!(config.whitelist.commands.contains(&"ls -la".to_string()));

        assert_eq!(config.whitelist.regex.len(), 2);
        assert!(config.whitelist.regex.contains(&"echo.*".to_string()));
        assert!(config.whitelist.regex.contains(&"ls.*".to_string()));

        assert_eq!(config.blacklist.commands.len(), 2);
        assert!(config.blacklist.commands.contains(&"rm".to_string()));
        assert!(config.blacklist.commands.contains(&"dd".to_string()));

        assert_eq!(config.blacklist.operations.len(), 2);
        assert!(config.blacklist.operations.contains(&"|".to_string()));
        assert!(config.blacklist.operations.contains(&"&".to_string()));
    }

    #[test]
    fn test_config_invalid_file() {
        let result = Config::read_config("non_existent_file.toml");
        assert!(result.is_err());
    }

    #[test]
    fn test_config_invalid_toml() {
        let invalid_config = r#"
[settings
port = 4000
"#;

        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "{}", invalid_config).unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let result = Config::read_config(temp_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_whitelist_creation() {
        let commands = vec!["echo".to_string(), "ls".to_string()];
        let regex = vec!["test.*".to_string()];

        let whitelist = Whitelist {
            commands: commands.clone(),
            regex: regex.clone(),
        };

        assert_eq!(whitelist.commands, commands);
        assert_eq!(whitelist.regex, regex);
    }

    #[test]
    fn test_blacklist_creation() {
        let commands = vec!["rm".to_string(), "dd".to_string()];
        let operations = vec!["|".to_string(), "&".to_string()];

        let blacklist = Blacklist {
            commands: commands.clone(),
            operations: operations.clone(),
        };

        assert_eq!(blacklist.commands, commands);
        assert_eq!(blacklist.operations, operations);
    }

    #[test]
    fn test_settings_creation() {
        let settings = Settings {
            port: 8080,
            host: "localhost".to_string(),
            env: Some("production".to_string()),
        };

        assert_eq!(settings.port, 8080);
        assert_eq!(settings.host, "localhost");
        assert_eq!(settings.env, Some("production".to_string()));
    }
}
