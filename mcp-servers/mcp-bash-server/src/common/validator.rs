//! Command validation module for security enforcement
//!
//! This module provides command validation functionality to prevent execution
//! of dangerous commands and operations based on configurable blacklists.

use std::ffi::OsStr;
use tracing::debug;

use crate::{common::config::Whitelist, config::Blacklist};
use rmcp::model::ErrorData;
use tracing::error;

/// Command validator that checks commands against security blacklists
/// Prevents execution of dangerous commands and operations
#[derive(Debug, Clone)]
pub struct Validator {
    /// Security blacklist configuration containing forbidden commands and operations
    blacklist: Blacklist,
    /// Security whitelist configuration containing secure commands
    whitelist: Whitelist,
}

impl Validator {
    /// Create a new validator with the specified blacklist configuration
    pub fn new(blacklist: Blacklist, whitelist: Whitelist) -> Self {
        Validator {
            blacklist,
            whitelist,
        }
    }

    /// Validate a command against the security blacklist
    /// Returns Ok(()) if command is safe, Err(ErrorData) if command is blacklisted
    /// Also handles nested shell commands (e.g., bash -c "command")
    pub fn is_unsafe_command(&self, args: Vec<&OsStr>) -> Result<(), ErrorData> {
        // Dangerous commands
        let blacklist = &self.blacklist.commands;

        // Dangerous symbols
        let bad_syms = &self.blacklist.operations;

        let full_cmd = args
            .join(&OsStr::new(" "))
            .into_string()
            .expect("Convert OsStr to String failed!");

        // Check whitelist
        if self.whitelist.commands.contains(&full_cmd) {
            return Ok(());
        }
        // Check regex patterns in whitelist
        for pattern in &self.whitelist.regex {
            match regex::Regex::new(pattern) {
                Ok(regex) => {
                    if regex.is_match(&full_cmd) {
                        debug!("Command matched whitelist regex pattern: {pattern}");
                        return Ok(());
                    } else {
                        debug!("Command did not match whitelist regex pattern: {pattern}");
                    }
                }
                Err(e) => {
                    error!("Invalid regex pattern in whitelist: {pattern}, error: {e}");
                }
            }
        }

        for word in blacklist.iter() {
            for &arg in args.iter() {
                if &arg.to_string_lossy().to_string() == word {
                    error!("Found banned command: {word}, command: {full_cmd}");
                    return Err(ErrorData::invalid_request(
                        format!("Found banned command: {word}"),
                        None,
                    ));
                }
            }
        }

        for sym in bad_syms.iter() {
            for &arg in args.iter() {
                debug!("arg: {arg:?}, sym: {sym:?}");
                if &arg.to_string_lossy().to_string() == sym {
                    error!("Found banned symbol: {sym}, command: {full_cmd}");
                    return Err(ErrorData::invalid_request(
                        format!("Found banned symbol: {sym}"),
                        None,
                    ));
                }
            }
        }

        // Check the command with pattern like `bash -c "echo 'hello world' | tee foo.txt"`
        // If the command run using with prefix `bash -c`, then we should check the command after '-c'
        let available_shells_string = std::fs::read_to_string("/etc/shells").unwrap();
        let available_shells = available_shells_string.split('\n');
        let mut is_shell = false;
        for shell in available_shells {
            if shell.contains(&args[0].to_string_lossy().to_string()) {
                is_shell = true;
            }
        }
        if is_shell && args.len() >= 2 && args[1] == OsStr::new("-c") {
            // pattern is "<shell> -c '<command>'", check the command again
            if args.len() >= 3 {
                let args: Vec<&OsStr> = args[2]
                    .to_str()
                    .map(|s| s.split_whitespace().map(OsStr::new).collect())
                    .unwrap_or_else(|| Vec::new());
                self.is_unsafe_command(args)?;
            }
        }

        Ok(())
    }
}
