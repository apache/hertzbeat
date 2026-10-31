/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.ai.gateway.tool.interaction;

import java.util.List;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService.InputField;
import org.apache.hertzbeat.ai.gateway.tool.interaction.AgentInteractionInputService.InteractionResult;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * Model-visible user interaction tools.
 */
@Service
public class AgentInteractionToolService {

    private final AgentInteractionInputService inputService;

    public AgentInteractionToolService(AgentInteractionInputService inputService) {
        this.inputService = inputService;
    }

    @Tool(name = "interaction.request_input", description = """
            Collect missing values only for monitor.create or monitor.update, whose schemas accept inputRef.
            Never request values already supplied by the user. Other tools (including alert_inhibit.create) do not
            accept this reference: use their discovered schemas with the supplied non-secret configuration directly.
            This form does not perform the target operation or approve it. After submission call that target tool
            with the returned single-use inputRef and its other required arguments in this same run, through normal
            permission and approval checks. Do not finish the task merely because input was collected. Form values
            remain hidden from the model and are injected at targetPath only when the supported target executes.
            """)
    @AgentToolPolicy
    public InteractionResult requestInput(
            @ToolParam(description = "Registered tool that will consume the single-use inputRef.") String targetTool,
            @ToolParam(description = "Short form title shown to the user.") String title,
            @ToolParam(required = false, description = "Why these values are needed.") String description,
            @ToolParam(description = "Fields with field, targetPath, type, label, required, and optional placeholder. "
                    + "targetPath is a dot-separated target-tool argument path, such as params.host.")
            List<InputField> fields) {
        return inputService.request(targetTool, title, description, fields, AgentToolContextSupport.invocation());
    }
}
