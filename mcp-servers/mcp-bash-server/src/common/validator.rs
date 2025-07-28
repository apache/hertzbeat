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

    /// Validate a command against the security blacklist and whitelist
    /// Returns Ok(()) if command is safe, Err(ErrorData) if command is blocked
    /// 
    /// Security Logic:
    /// 1. All commands are denied by default
    /// 2. Blacklist has higher priority than whitelist
    /// 3. If command matches any blacklist pattern (exact or regex), deny
    /// 4. If command doesn't match blacklist and matches whitelist (exact or regex), allow
    /// 5. Otherwise, deny
    pub fn is_unsafe_command(&self, args: Vec<&OsStr>) -> Result<(), ErrorData> {
        // Handle empty command - deny by default
        if args.is_empty() {
            return Err(ErrorData::invalid_request(
                "Empty command not allowed".to_string(),
                None,
            ));
        }

        let full_cmd = args
            .join(&OsStr::new(" "))
            .into_string()
            .expect("Convert OsStr to String failed!");

        debug!("Validating command: {}", full_cmd);

        // First check blacklist - if any match, deny immediately
        // Check blacklist exact commands - match against the full command
        for blacklisted_cmd in &self.blacklist.commands {
            if &full_cmd == blacklisted_cmd {
                error!("Command blocked by blacklist exact match: {}, full command: {}", blacklisted_cmd, full_cmd);
                return Err(ErrorData::invalid_request(
                    format!("Command blocked by blacklist: {}", blacklisted_cmd),
                    None,
                ));
            }
        }

        // Check blacklist regex patterns
        for pattern in &self.blacklist.regex {
            match regex::Regex::new(pattern) {
                Ok(regex) => {
                    if regex.is_match(&full_cmd) {
                        error!("Command blocked by blacklist regex pattern: {}, full command: {}", pattern, full_cmd);
                        return Err(ErrorData::invalid_request(
                            format!("Command blocked by blacklist pattern: {}", pattern),
                            None,
                        ));
                    }
                }
                Err(e) => {
                    error!("Invalid regex pattern in blacklist: {}, error: {}", pattern, e);
                }
            }
        }

        // Now check whitelist - if any match, allow
        // Check whitelist exact commands
        if self.whitelist.commands.contains(&full_cmd) {
            debug!("Command allowed by whitelist exact match: {}", full_cmd);
            return Ok(());
        }

        // Check whitelist regex patterns
        for pattern in &self.whitelist.regex {
            match regex::Regex::new(pattern) {
                Ok(regex) => {
                    if regex.is_match(&full_cmd) {
                        debug!("Command allowed by whitelist regex pattern: {}", pattern);
                        return Ok(());
                    }
                }
                Err(e) => {
                    error!("Invalid regex pattern in whitelist: {}, error: {}", pattern, e);
                }
            }
        }

        // Handle nested shell commands (e.g., bash -c "command")
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
                    let inner_args: Vec<&OsStr> = args[2]
                        .to_str()
                        .map(|s| s.split_whitespace().map(OsStr::new).collect())
                        .unwrap_or_else(|| Vec::new());
                    return self.is_unsafe_command(inner_args);
                }
            }
        }

        // Default deny - command didn't match whitelist
        error!("Command denied - not in whitelist: {}", full_cmd);
        Err(ErrorData::invalid_request(
            format!("Command not allowed: {}", full_cmd),
            None,
        ))
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
            regex: vec![
                ".*[|&;><].*".to_string(),     // Block commands with dangerous operators
                "^sudo .*".to_string(),        // Block sudo commands
                ".*/etc/.*".to_string(),       // Block access to /etc
                ".*passwd.*".to_string(),      // Block password-related commands
            ],
        };

        let whitelist = Whitelist {
            commands: vec!["echo hello".to_string(), "ls -la".to_string(), "pwd".to_string()],
            regex: vec![
                "^echo [a-zA-Z0-9 ]+$".to_string(),   // Only simple echo commands
                "^ls [a-zA-Z0-9 /-]*$".to_string(),   // Only simple ls commands
                "^(pwd|whoami|date|uptime)$".to_string(), // Basic system info commands
            ],
        };

        Validator::new(blacklist, whitelist)
    }

    #[test]
    fn test_validator_creation() {
        let validator = create_test_validator();
        assert_eq!(validator.blacklist.commands.len(), 4);
        assert_eq!(validator.blacklist.regex.len(), 4);
        assert_eq!(validator.whitelist.commands.len(), 3);
        assert_eq!(validator.whitelist.regex.len(), 3);
    }

    #[test]
    fn test_safe_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("pwd")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok()); // pwd is whitelisted
    }

    #[test]
    fn test_whitelisted_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("echo"), OsStr::new("hello")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok()); // "echo hello" is exactly whitelisted
    }

    #[test]
    fn test_whitelisted_regex_command() {
        let validator = create_test_validator();
        let args = vec![OsStr::new("echo"), OsStr::new("test123")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok()); // Matches whitelist regex "^echo [a-zA-Z0-9 ]+$"
    }

    #[test]
    fn test_blacklisted_command() {
        let validator = create_test_validator();
        // Test a command that contains a blacklisted command but isn't exact match
        let args = vec![OsStr::new("rm"), OsStr::new("-rf"), OsStr::new("/")];
        let result = validator.is_unsafe_command(args);
        // Should be denied because "rm -rf /" is not in whitelist (default deny)
        // not because "rm" is blacklisted (since we need exact command match)
        assert!(result.is_err());
    }

    #[test]
    fn test_blacklisted_exact_command() {
        let validator = create_test_validator();
        // Test exact match against blacklist
        let args = vec![OsStr::new("rm")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // "rm" exactly matches blacklist
    }

    #[test]
    fn test_blacklisted_regex_operation() {
        let validator = create_test_validator();
        // Test pipe operation which should be blocked by regex
        let args = vec![OsStr::new("echo"), OsStr::new("test"), OsStr::new("|"), OsStr::new("cat")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Contains "|" which matches ".*[|&;><].*" regex
    }

    #[test]
    fn test_multiple_blacklisted_commands() {
        let validator = create_test_validator();

        // Test commands that are exactly in the blacklist
        let dangerous_commands = vec!["rm", "dd", "shutdown", "kill"];
        for cmd in dangerous_commands {
            let args = vec![OsStr::new(cmd)];
            let result = validator.is_unsafe_command(args);
            assert!(result.is_err(), "Command '{}' should be blocked", cmd);
        }
    }

    #[test]
    fn test_multiple_blacklisted_regex_operations() {
        let validator = create_test_validator();

        let dangerous_ops = vec!["|", "&", ";", ">"];
        for op in dangerous_ops {
            let args = vec![OsStr::new("echo"), OsStr::new("test"), OsStr::new(op)];
            let result = validator.is_unsafe_command(args);
            assert!(result.is_err(), "Operation '{}' should be blocked by regex", op);
        }
    }

    #[test]
    fn test_empty_command() {
        let validator = create_test_validator();
        let args: Vec<&OsStr> = vec![];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Empty commands are now denied by default
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
        assert!(result.is_err()); // Not in whitelist, so denied by default
    }

    #[test]
    fn test_invalid_regex_in_whitelist() {
        let blacklist = Blacklist {
            commands: vec![],
            regex: vec![],
        };

        let whitelist = Whitelist {
            commands: vec![],
            regex: vec!["[invalid_regex".to_string()], // Invalid regex
        };

        let validator = Validator::new(blacklist, whitelist);
        let args = vec![OsStr::new("test")];
        let result = validator.is_unsafe_command(args);
        // Should be denied because command is not in whitelist and default is deny
        assert!(result.is_err());
    }

    #[test]
    fn test_case_sensitivity() {
        let validator = create_test_validator();

        // Test uppercase version of blacklisted command
        let args = vec![OsStr::new("RM")];
        let result = validator.is_unsafe_command(args);
        // Should be denied because not in whitelist (default deny)
        assert!(result.is_err());

        // Test exact case match for blacklisted command
        let args = vec![OsStr::new("rm")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Should be blocked by blacklist
    }

    #[test]
    fn test_partial_command_match() {
        let validator = create_test_validator();

        // Test command that contains blacklisted word but isn't exact match
        let args = vec![OsStr::new("remove")]; // contains "rm" but shouldn't match
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Should be denied because not in whitelist (default deny)
    }

    #[test]
    fn test_blacklist_priority_over_whitelist() {
        // Test that blacklist has higher priority than whitelist
        let blacklist = Blacklist {
            commands: vec!["echo hello".to_string()], // Changed to exact match
            regex: vec![],
        };

        let whitelist = Whitelist {
            commands: vec!["echo hello".to_string()],
            regex: vec!["^echo .*".to_string()],
        };

        let validator = Validator::new(blacklist, whitelist);
        let args = vec![OsStr::new("echo"), OsStr::new("hello")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Should be blocked because "echo hello" is in blacklist
    }

    #[test]
    fn test_blacklist_regex_priority() {
        // Test that blacklist regex has higher priority than whitelist
        let blacklist = Blacklist {
            commands: vec![],
            regex: vec![".*sudo.*".to_string()],
        };

        let whitelist = Whitelist {
            commands: vec!["sudo ls".to_string()],
            regex: vec!["^sudo .*".to_string()],
        };

        let validator = Validator::new(blacklist, whitelist);
        let args = vec![OsStr::new("sudo"), OsStr::new("ls")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err()); // Should be blocked by blacklist regex
    }

    #[test]
    fn test_default_deny_behavior() {
        // Test that commands not in whitelist are denied by default
        let blacklist = Blacklist {
            commands: vec![],
            regex: vec![],
        };

        let whitelist = Whitelist {
            commands: vec!["pwd".to_string()],
            regex: vec![],
        };

        let validator = Validator::new(blacklist, whitelist);
        
        // Command in whitelist should be allowed
        let args = vec![OsStr::new("pwd")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok());
        
        // Command not in whitelist should be denied
        let args = vec![OsStr::new("ls")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err());
    }

    #[test] 
    fn test_exact_vs_partial_blacklist_matching() {
        // Test the fix: blacklist should match exactly, not partially
        let blacklist = Blacklist {
            commands: vec!["rm".to_string()], // Only "rm" exactly
            regex: vec![],
        };

        let whitelist = Whitelist {
            commands: vec!["rm -rf /tmp/test".to_string()], // Allow this specific command
            regex: vec![],
        };

        let validator = Validator::new(blacklist, whitelist);
        
        // "rm" exactly should be blocked by blacklist
        let args = vec![OsStr::new("rm")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err(), "Exact match 'rm' should be blocked by blacklist");
        
        // "rm -rf /tmp/test" should be allowed by whitelist (not blocked by blacklist)
        let args = vec![OsStr::new("rm"), OsStr::new("-rf"), OsStr::new("/tmp/test")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_ok(), "'rm -rf /tmp/test' should be allowed by whitelist");
        
        // "rm -rf /" should be denied (not in whitelist, not exact blacklist match)
        let args = vec![OsStr::new("rm"), OsStr::new("-rf"), OsStr::new("/")];
        let result = validator.is_unsafe_command(args);
        assert!(result.is_err(), "'rm -rf /' should be denied by default");
    }
}
