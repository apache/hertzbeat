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
        // Handle empty command
        if args.is_empty() {
            return Ok(());
        }

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
        if let Ok(available_shells_string) = std::fs::read_to_string("/etc/shells") {
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
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsStr;

    fn create_test_validator() -> Validator {
        let blacklist = Blacklist {
            commands: vec![
                "rm".to_string(),
                "dd".to_string(),
                "shutdown".to_string(),
                "kill".to_string(),
            ],
            operations: vec![
                "|".to_string(),
                "&".to_string(),
                ";".to_string(),
                ">".to_string(),
            ],
        };

        let whitelist = Whitelist {
            commands: vec!["echo hello world".to_string(), "ls -la".to_string()],
            regex: vec![
                "^echo [a-zA-Z0-9 ]+$".to_string(), // Only simple echo commands without special chars
                "^ls [a-zA-Z0-9 -]+$".to_string(),  // Only simple ls commands
            ],
        };

        Validator::new(blacklist, whitelist)
    }

    #[test]
    fn test_validator_creation() {
        let validator = create_test_validator();
        assert_eq!(validator.blacklist.commands.len(), 4);
        assert_eq!(validator.blacklist.operations.len(), 4);
        assert_eq!(validator.whitelist.commands.len(), 2);
        assert_eq!(validator.whitelist.regex.len(), 2);
    }

    #[test]
    fn test_safe_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("pwd")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_whitelisted_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("echo"), OsStr::new("hello"), OsStr::new("world")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_whitelisted_regex_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("echo"), OsStr::new("hello")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_blacklisted_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("rm"), OsStr::new("-rf"), OsStr::new("/")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err());
    }

    #[test]
    fn test_blacklisted_operation() {
        let validator = create_test_validator();
        // The operation symbol must be a separate argument to be blocked
        let args = vec![OsStr::new("echo"), OsStr::new("test"), OsStr::new("|")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_blacklisted_commands() {
        let validator = create_test_validator();

        let dangerous_commands = vec!["dd", "shutdown", "kill"];
        for cmd in dangerous_commands {
            let args = vec![OsStr::new(cmd)];
            let result = validator.is_unsafe_command(args);
            assert!(result.is_err(), "Command '{}' should be blocked", cmd);
        }
    }

    #[test]
    fn test_multiple_blacklisted_operations() {
        let validator = create_test_validator();

        let dangerous_ops = vec!["|", "&", ";", ">"];
        for op in dangerous_ops {
            // Each operation as a separate argument
            let args = vec![OsStr::new("echo"), OsStr::new("test"), OsStr::new(op)];
            let result = validator.is_unsafe_command(args);
            assert!(result.is_err(), "Operation '{}' should be blocked", op);
        }
    }

    #[test]
    fn test_empty_command() {
        let validator = create_test_validator();
        let args: Vec<&OsStr> = vec![];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_complex_safe_command() {
        let validator = create_test_validator();
        let args = vec![
            OsStr::new("find"),
            OsStr::new("/tmp"),
            OsStr::new("-name"),
            OsStr::new("*.txt"),
        ];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_regex_in_whitelist() {
        let blacklist = Blacklist {
            commands: vec![],
            operations: vec![],
        };

        let whitelist = Whitelist {
            commands: vec![],
            regex: vec!["[invalid_regex".to_string()], // Invalid regex
        };

        let validator = Validator::new(blacklist, whitelist);
        let args = vec![OsStr::new("test")];
        let result = validator.is_unsafe_command(args);
        // Should still work, just log the error and continue
        assert!(result.is_ok());
    }

    #[test]
    fn test_case_sensitivity() {
        let validator = create_test_validator();

        // Test uppercase version of blacklisted command
        let args = vec![OsStr::new("RM")];
        let result = validator.is_unsafe_command(args);
        // Should be safe since our blacklist is case-sensitive
        assert!(result.is_ok());

        // Test exact case match
        let args = vec![OsStr::new("rm")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err());
    }

    #[test]
    fn test_partial_command_match() {
        let validator = create_test_validator();

        // Test command that contains blacklisted word but isn't exact match
        let args = vec![OsStr::new("remove")]; // contains "rm" but shouldn't match
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
    }
}
