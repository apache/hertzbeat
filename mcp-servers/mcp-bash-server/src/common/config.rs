use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub settings: Settings,
    pub blacklist: Blacklist,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Blacklist {
    pub commands: Vec<String>,
    pub operations: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Settings {
    pub port: u16,
    pub host: String,
    pub env: Option<String>, // "development" or "production"
}

impl Config {
    pub fn read_config(file: &str) -> Result<Config> {
        let toml_str = fs::read_to_string(file)?;
        let config: Config = toml::from_str(&toml_str)?;
        Ok(config)
    }
}
