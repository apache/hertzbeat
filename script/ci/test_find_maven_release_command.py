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

"""Regression contracts for the backend release command gate."""

import unittest

from script.ci.find_maven_release_command import is_release_package_command, release_package_line


class MavenReleaseCommandTest(unittest.TestCase):
    def test_accepts_real_release_profiles_after_module_selection(self):
        for command in (
            "run: mvnd clean -B package -pl '!hertzbeat-e2e' -Prelease -Dmaven.test.skip=false --file pom.xml",
            "mvnd clean -B package -Prelease -pl '!hertzbeat-e2e'",
            "mvnd clean -B package -pl '!hertzbeat-e2e' -P release",
            "mvnd clean -B package -Pother,release",
        ):
            with self.subTest(command=command):
                self.assertTrue(is_release_package_command(command))

    def test_rejects_missing_fake_or_disabled_release_profiles(self):
        for command in (
            "mvnd clean -B package -pl '!hertzbeat-e2e'",
            "mvnd clean -B package -Prelease-preview",
            "mvnd clean -B package -Pprerelease",
            "mvnd clean -B package -P!release",
            "mvnd clean -B package -Prelease -P!release",
            "mvnd clean -B package -Dnote=-Prelease",
            "mvnd clean -B package -D '-Prelease'",
            "mvnd clean -B package -pl '-Prelease'",
            "mvnd clean -B package --log-file '-Prelease'",
            "mvnd clean -B package # -Prelease",
            "echo 'mvnd clean -B package -Prelease'",
            "mvnd clean -B package; echo -Prelease",
            "mvnd clean -B package -Prelease | cat",
            "mvnd clean -B package '-Prelease",
        ):
            with self.subTest(command=command):
                self.assertFalse(is_release_package_command(command))

    def test_returns_actual_command_line_number_or_no_match(self):
        self.assertEqual(3, release_package_line(
            "name: Build\n# mvnd clean -B package -Prelease\n"
            "  run: mvnd clean -B package -pl '!hertzbeat-e2e' -Prelease\n"))
        self.assertIsNone(release_package_line("run: mvnd clean -B package -Pprerelease"))


if __name__ == "__main__":
    unittest.main()
