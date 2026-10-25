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

//! Configuration management for the MCP Bash Server
//!
//! This module handles reading and parsing configuration from TOML files,
//! including network settings and the OAuth deployment mode.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub settings: Settings,
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
    ///
    /// Legacy whitelist and blacklist sections are ignored. General command,
    /// script, and Python execution has been removed and cannot be re-enabled
    /// through configuration.
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
"#;

        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "{config_content}").unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let config = Config::read_config(temp_path).unwrap();

        assert_eq!(config.settings.port, 4000);
        assert_eq!(config.settings.host, "127.0.0.1");
        assert_eq!(config.settings.env, Some("development".to_string()));
    }

    #[test]
    fn test_legacy_command_policy_sections_are_ignored() {
        let config_content = r#"
[settings]
port = 4000
host = "127.0.0.1"
env = "production"

[whitelist]
commands = ["echo hello", "ls -la"]
regex = [".*"]

[blacklist]
commands = ["rm", "dd"]
regex = [".*[|&].*", "^sudo .*"]
"#;

        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "{config_content}").unwrap();

        let config = Config::read_config(temp_file.path().to_str().unwrap()).unwrap();

        assert_eq!(config.settings.port, 4000);
        assert_eq!(config.settings.host, "127.0.0.1");
        assert_eq!(config.settings.env, Some("production".to_string()));

        let serialized = toml::to_string(&config).unwrap();
        let serialized_config: toml::Value = toml::from_str(&serialized).unwrap();
        let table = serialized_config.as_table().unwrap();
        assert_eq!(table.len(), 1);
        assert!(table.contains_key("settings"));
        assert!(!table.contains_key("whitelist"));
        assert!(!table.contains_key("blacklist"));
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
        write!(temp_file, "{invalid_config}").unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let result = Config::read_config(temp_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_settings_env_is_optional() {
        let config: Config = toml::from_str(
            r#"
[settings]
port = 4000
host = "127.0.0.1"
"#,
        )
        .unwrap();

        assert_eq!(config.settings.env, None);
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
