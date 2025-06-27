use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub settings: Settings,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Settings {
    pub port: u16,
    pub host: String,
}

impl Config {
    pub fn read_config(file: String) -> Result<Config> {
        let toml_str = fs::read_to_string(file)?;
        let config: Config = toml::from_str(&toml_str)?;
        Ok(config)
    }
}
