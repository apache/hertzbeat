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

"""Release-boundary contracts for the current MCP documentation."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CURRENT_MCP_DOCS = (
    ROOT / "home/docs/help/mcp_server.md",
    ROOT / "home/i18n/zh-cn/docusaurus-plugin-content-docs/current/help/mcp_server.md",
)


class CurrentMcpDocsBoundaryTest(unittest.TestCase):

    def test_current_docs_describe_the_unavailable_release_boundary(self) -> None:
        for path in CURRENT_MCP_DOCS:
            with self.subTest(path=path):
                content = path.read_text(encoding="utf-8")
                self.assertIn("mcp_availability: unavailable", content)
                self.assertIn(
                    "mcp_activation_requires: trusted-transport-identity-and-gateway-run-ledger",
                    content,
                )

    def test_current_docs_do_not_publish_connection_instructions(self) -> None:
        forbidden_fragments = (
            "/api/mcp",
            "mcpServers",
            "claude mcp add",
            "your-hertzbeat-server-host",
            "1157",
        )
        for path in CURRENT_MCP_DOCS:
            with self.subTest(path=path):
                content = path.read_text(encoding="utf-8")
                for fragment in forbidden_fragments:
                    self.assertNotIn(fragment, content)

    def test_english_current_doc_is_explicit_about_default_state(self) -> None:
        content = CURRENT_MCP_DOCS[0].read_text(encoding="utf-8").lower()
        self.assertIn("does not provide a callable mcp", content)
        self.assertIn("disabled by default", content)
        self.assertIn("trusted transport identity", content)
        self.assertIn("agent gateway run and tool ledger", content)


if __name__ == "__main__":
    unittest.main()
