use std::ffi::OsStr;
use tracing::debug;

use crate::config::Blacklist;
use rmcp::model::ErrorData;
use tracing::error;

#[derive(Debug, Clone)]
pub struct Validator {
    blacklist: Blacklist,
}

impl Validator {
    pub fn new(blacklist: Blacklist) -> Self {
        Validator { blacklist }
    }

    pub fn is_unsafe_command(&self, args: Vec<&OsStr>) -> Result<(), ErrorData> {
        // Dangerous commands
        let blacklist = &self.blacklist.commands;

        // Dangerous symbols
        let bad_syms = &self.blacklist.operations;

        let full_cmd = args
            .join(&OsStr::new(" "))
            .into_string()
            .expect("Convert OsStr to String failed!");

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
