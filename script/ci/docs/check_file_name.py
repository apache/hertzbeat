# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import os
import re
import sys
import json

def read_config(file_path):
    try:
        with open(file_path, 'r') as file:
            config = json.load(file)
            return config.get("directories", [])
    except Exception as e:
        print(f"Error reading configuration file: {e}")
        sys.exit(1)


def find_invalid_files(directories):
    invalid_files = []
    pattern = re.compile(r'^[_a-z0-9-]+(\.[_a-z0-9-]+)*$')

    for target_dir in directories:
        print(f"Checking directory: {target_dir}")
        for root, _, files in os.walk(target_dir):
            for filename in files:
                if not pattern.match(filename):
                    invalid_files.append(os.path.join(root, filename))

    if invalid_files:
        print("\nError: The following files have invalid names (file names should only contain lowercase letters, numbers, and hyphens):")
        for invalid_file in invalid_files:
            print(invalid_file)
        sys.exit(1)
    else:
        print("All file names are valid.")


if __name__ == "__main__":
    # usage: python check_filenames.py config.json
    if len(sys.argv) != 2:
        print("Usage: python xxx_script.py config.json")
        sys.exit(1)

    config_file = sys.argv[1]
    directories = read_config(config_file)
    if not directories:
        print("\nNo directories found in configuration file.")
        sys.exit(1)

    find_invalid_files(directories)
