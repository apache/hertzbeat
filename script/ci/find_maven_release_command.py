#!/usr/bin/env python3

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Find the single-line mvnd release assembly command in the backend workflow."""

from __future__ import annotations

import shlex
import sys
from pathlib import Path


# These options consume the next argument; their values are not Maven profiles.
VALUE_OPTIONS = {
    "-pl", "--projects", "-f", "--file", "-D", "--define", "-s", "--settings",
    "-gs", "--global-settings", "-t", "--toolchains", "-gt", "--global-toolchains",
    "-l", "--log-file", "-rf", "--resume-from", "-T", "--threads", "-b", "--builder",
}


def is_release_package_command(line: str) -> bool:
    command = line.strip()
    if command.startswith("run:"):
        command = command.removeprefix("run:").strip()
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return False
    # Keep the gate's existing command contract; do not match echoed text or
    # compound shell commands whose execution requires further interpretation.
    if tokens[:4] != ["mvnd", "clean", "-B", "package"]:
        return False
    if any(token and all(char in ";&|()<>" for char in token) for token in tokens):
        return False
    profiles: list[str] = []
    index = 4
    while index < len(tokens):
        token = tokens[index]
        if token in VALUE_OPTIONS:
            index += 2
            continue
        if token == "-P":
            index += 1
            if index == len(tokens):
                return False
            profiles.extend(tokens[index].split(","))
        elif token.startswith("-P"):
            profiles.extend(token[2:].split(","))
        index += 1
    profiles = [profile.strip() for profile in profiles]
    return "release" in profiles and not {"!release", "-release"}.intersection(profiles)


def release_package_line(text: str) -> int | None:
    return next((number for number, line in enumerate(text.splitlines(), 1)
                 if is_release_package_command(line)), None)


if __name__ == "__main__":
    number = release_package_line(Path(sys.argv[1]).read_text())
    if number is not None:
        print(number)
