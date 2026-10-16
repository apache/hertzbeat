<!--
Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements.
See the NOTICE file distributed with this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy at http://www.apache.org/licenses/LICENSE-2.0 .
Unless required by applicable law or agreed to in writing, software distributed under the License
is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
-->

# Model connections

The AI workspace, Chat and SOP share the active saved connection. With no saved
selection, they use `hertzbeat.agent.provider` from YAML. An invalid active
connection disables the client; it never selects another provider automatically.
Existing `openai-compatible` presets and singleton configurations remain readable.

| Protocol | Path appended to the base URL |
| --- | --- |
| `openai-chat` | `/chat/completions` |
| `openai-responses` | `/responses` |
| `anthropic-messages` | `/messages` |

Enter the full API prefix (including `/v1` when required), or the exact request
URL. No vendor URL, version prefix or model is inferred for an explicit protocol.
New connections omit a universal temperature parameter.

Authentication modes are `default` (Bearer API key for OpenAI, `x-api-key` for
Anthropic), `custom-header`, and `none`. Additional headers are supported; the
transport owns Content-Type, Accept and connection headers. API keys and header
values are encrypted at rest and never returned by configuration APIs. Blank
edit values preserve existing secrets; remove a header entry to delete it.

```yaml
hertzbeat:
  agent:
    provider:
      name: Local model
      type: protocol
      protocol: openai-chat
      base-url: http://localhost:8000/v1
      model: your-model-id
      auth-mode: none
```

Saved connections expose a test action that makes small model requests without
activation. Text, streaming, and a complete custom tool round trip are reported
separately. `not-observed` means the model did not demonstrate the capability;
it does not assert that the server cannot support it. HTTP errors expose status
codes only. Responses encrypted reasoning items and Anthropic signed blocks are
retained for tool-result replay. Gateway transcript persistence encrypts this
opaque replay state so generic redaction cannot invalidate signatures or expose
the contents. Hosted vendor tools and new reasoning controls are outside this
initial implementation.

Model discovery uses a draft connection without saving or activating it. Fill in
the base URL and authentication, then fetch models or enter a model ID manually.
Discovery is bounded to 1,000 models, 10 pages, 2 MiB per response and 15 seconds
overall; redirects are not followed. Saved credentials can be reused for
discovery only when the destination, protocol and authentication remain unchanged.
