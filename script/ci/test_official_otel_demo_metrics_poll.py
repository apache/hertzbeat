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

"""Contracts for the official OTEL demo metrics verification window."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEMO_SCRIPT = ROOT / "script/dev/run-official-otel-demo.sh"


class OfficialOtelDemoMetricsPollTest(unittest.TestCase):

    def test_each_metrics_poll_builds_a_fresh_bounded_exact_window(self) -> None:
        content = DEMO_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("build_metrics_console_path() {", content)
        path_builder = content.split("build_metrics_console_path() {", 1)[1].split("\n}", 1)[0]
        verify_demo = content.split("verify_demo() {", 1)[1].split("\n}", 1)[0]
        metrics_poll = verify_demo.rsplit("poll_until ", 1)[1]

        self.assertIn("date +%s", path_builder)
        self.assertIn('metrics_start="$((metrics_end - 3600000))"', path_builder)
        self.assertIn("?start=%s&end=%s&query=%s", path_builder)
        self.assertIn('"${metrics_start}" "${metrics_end}" "${metrics_query}"', path_builder)
        self.assertIn(r'\$(build_metrics_console_path', metrics_poll)


if __name__ == "__main__":
    unittest.main()
