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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutionException;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEvent.EventStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionContext;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * In-memory user input requests and one-time references consumed by tools.
 */
@Service
public class AgentInteractionInputService {

    public static final String INPUT_REF_ARGUMENT = "inputRef";
    private static final long INPUT_REF_TTL_MS = 15 * 60 * 1000L;

    private final ConcurrentMap<String, PendingInteraction> pendingInteractions = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, StoredInput> storedInputs = new ConcurrentHashMap<>();

    public InteractionResult request(String targetTool, String title, String description, List<InputField> fields,
                                     AgentToolExecutionContext context) {
        if (!StringUtils.hasText(targetTool) || !StringUtils.hasText(title) || fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("targetTool, title, and fields are required");
        }
        List<InputField> requestedFields = List.copyOf(fields);
        validateFields(requestedFields);
        String interactionId = id("aui");
        CompletableFuture<InteractionResult> completion = new CompletableFuture<>();
        AgentToolExecutionRequest request = context.getRequest();
        pendingInteractions.put(interactionId, new PendingInteraction(targetTool, requestedFields,
                request.getSessionUid(), request.getActor(), completion));
        context.publishEvent(AgentRuntimeEvent.userInputRequested(interactionId,
                Map.of("targetTool", targetTool,
                        "title", title,
                        "description", description == null ? "" : description,
                        "fields", fieldPayload(requestedFields))));
        try {
            InteractionResult result = completion.get();
            publishCompleted(context, interactionId, EventStatus.COMPLETED, null);
            return result;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            publishCompleted(context, interactionId, EventStatus.FAILED, "User input request was interrupted");
            throw new IllegalStateException("User input request was interrupted", exception);
        } catch (ExecutionException exception) {
            String message = exception.getCause() == null || !StringUtils.hasText(exception.getCause().getMessage())
                    ? "User input request failed" : exception.getCause().getMessage();
            publishCompleted(context, interactionId, EventStatus.FAILED, message);
            throw new IllegalStateException(exception.getCause());
        } finally {
            pendingInteractions.remove(interactionId);
        }
    }

    private void publishCompleted(AgentToolExecutionContext context, String interactionId, EventStatus status,
                                  String errorMessage) {
        context.publishEvent(status == EventStatus.COMPLETED
                ? AgentRuntimeEvent.userInputCompleted(interactionId)
                : AgentRuntimeEvent.userInputFailed(interactionId, errorMessage));
    }

    public void submit(String interactionId, AgentActor actor, Map<String, Object> values) {
        PendingInteraction pending = pendingInteractions.get(interactionId);
        if (pending == null || !sameActor(pending.actor(), actor)) {
            throw new IllegalArgumentException("User input request was not found");
        }
        Map<String, Object> submitted = new LinkedHashMap<>();
        if (values != null) {
            values.forEach((key, value) -> {
                if (value != null) {
                    submitted.put(key, value);
                }
            });
        }
        validateSubmission(pending.fields(), submitted);
        String inputRef = id("air");
        storedInputs.put(inputRef, new StoredInput(pending.targetTool(), pending.fields(), Map.copyOf(submitted),
                pending.sessionUid(), pending.actor(), System.currentTimeMillis() + INPUT_REF_TTL_MS));
        if (!pending.completion().complete(new InteractionResult(inputRef, pending.targetTool(),
                List.copyOf(submitted.keySet())))) {
            storedInputs.remove(inputRef);
            throw new IllegalArgumentException("User input request is no longer active");
        }
    }

    public AgentToolExecutionRequest validateReference(AgentToolExecutionRequest request) {
        String inputRef = inputRef(request);
        if (inputRef == null) {
            return request;
        }
        requireStoredInput(inputRef, request);
        return request;
    }

    public AgentToolExecutionRequest mergeAndTake(AgentToolExecutionRequest request) {
        String inputRef = inputRef(request);
        if (inputRef == null) {
            return request;
        }
        StoredInput input = requireStoredInput(inputRef, request);
        if (!storedInputs.remove(inputRef, input)) {
            throw new IllegalArgumentException("Input reference was already consumed");
        }
        Map<String, Object> arguments = deepCopy(request.getArguments());
        arguments.remove(INPUT_REF_ARGUMENT);
        for (InputField field : input.fields()) {
            if (input.values().containsKey(field.field())) {
                setPath(arguments, field.targetPath(), input.values().get(field.field()));
            }
        }
        return request.toBuilder().arguments(arguments).build();
    }

    private StoredInput requireStoredInput(String inputRef, AgentToolExecutionRequest request) {
        StoredInput input = storedInputs.get(inputRef);
        if (input == null || input.expiresAt() < System.currentTimeMillis()) {
            storedInputs.remove(inputRef);
            throw new IllegalArgumentException("Input reference is invalid or expired");
        }
        if (!input.targetTool().equals(request.getToolName())
                || !input.sessionUid().equals(request.getSessionUid())
                || !sameActor(input.actor(), request.getActor())) {
            throw new IllegalArgumentException("Input reference does not belong to this tool execution");
        }
        return input;
    }

    private String inputRef(AgentToolExecutionRequest request) {
        Object value = request.getArguments().get(INPUT_REF_ARGUMENT);
        return value instanceof String text && StringUtils.hasText(text) ? text : null;
    }

    private void validateFields(List<InputField> fields) {
        java.util.HashSet<String> names = new java.util.HashSet<>();
        for (InputField field : fields) {
            if (field == null || !StringUtils.hasText(field.field()) || !StringUtils.hasText(field.targetPath())
                    || !StringUtils.hasText(field.label()) || !StringUtils.hasText(field.type())) {
                throw new IllegalArgumentException("Every input field requires field, targetPath, type, and label");
            }
            if (!names.add(field.field())) {
                throw new IllegalArgumentException("Input field is duplicated: " + field.field());
            }
        }
    }

    private void validateSubmission(List<InputField> fields, Map<String, Object> values) {
        Map<String, InputField> definitions = new LinkedHashMap<>();
        fields.forEach(field -> definitions.put(field.field(), field));
        if (!definitions.keySet().containsAll(values.keySet())) {
            throw new IllegalArgumentException("User input contains an unknown field");
        }
        for (InputField field : fields) {
            Object value = values.get(field.field());
            if (field.required() && (value == null
                    || value instanceof String text && !StringUtils.hasText(text))) {
                throw new IllegalArgumentException("Required user input is missing: " + field.field());
            }
        }
    }

    private List<Map<String, Object>> fieldPayload(List<InputField> fields) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (InputField field : fields) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("field", field.field());
            item.put("type", field.type());
            item.put("label", field.label());
            item.put("required", field.required());
            if (StringUtils.hasText(field.placeholder())) {
                item.put("placeholder", field.placeholder());
            }
            payload.add(Map.copyOf(item));
        }
        return List.copyOf(payload);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deepCopy(Map<String, Object> source) {
        Map<String, Object> copy = new LinkedHashMap<>();
        source.forEach((key, value) -> copy.put(key,
                value instanceof Map<?, ?> map ? deepCopy((Map<String, Object>) map) : value));
        return copy;
    }

    @SuppressWarnings("unchecked")
    private void setPath(Map<String, Object> arguments, String path, Object value) {
        String[] segments = path.split("\\.");
        Map<String, Object> current = arguments;
        for (int index = 0; index < segments.length - 1; index++) {
            Object existing = current.get(segments[index]);
            Map<String, Object> nested = existing instanceof Map<?, ?> map
                    ? deepCopy((Map<String, Object>) map) : new LinkedHashMap<>();
            current.put(segments[index], nested);
            current = nested;
        }
        current.put(segments[segments.length - 1], value);
    }

    private boolean sameActor(AgentActor first, AgentActor second) {
        return first.getType().equals(second.getType()) && first.getId().equals(second.getId());
    }

    private String id(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "");
    }

    /** Field rendered by the WebUI and merged into a target tool argument path. */
    public record InputField(String field, String targetPath, String type, String label,
                             boolean required, String placeholder) {
    }

    /** Safe result returned to the model after the user submits the form. */
    public record InteractionResult(String inputRef, String targetTool, List<String> providedFields) {
    }

    private record PendingInteraction(String targetTool, List<InputField> fields, String sessionUid,
                                      AgentActor actor, CompletableFuture<InteractionResult> completion) {
    }

    private record StoredInput(String targetTool, List<InputField> fields, Map<String, Object> values,
                               String sessionUid, AgentActor actor, long expiresAt) {
    }
}
