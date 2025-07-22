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
