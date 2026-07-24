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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyDecision;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionResult;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolStatus;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionOrchestrator;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRegistry;
import org.springframework.util.StringUtils;

/**
 * Controlled bridge between model tool calls and model-visible Gateway tools.
 */
public class AgentToolBridge {

    private final AgentToolRegistry toolRegistry;
    private final Clock clock;
    private final AgentRuntimeBlockingTaskRunner taskRunner;
    private final AgentToolExecutionOrchestrator toolExecutionOrchestrator;
    private final AgentRuntimeApprovalRegistry approvalRegistry;

    public AgentToolBridge(AgentToolRegistry toolRegistry,
                           AgentToolExecutionOrchestrator toolExecutionOrchestrator,
                           AgentRuntimeApprovalRegistry approvalRegistry) {
        this(toolRegistry, Clock.systemUTC(),
            new AgentRuntimeBlockingTaskRunner(), toolExecutionOrchestrator, approvalRegistry);
    }

    AgentToolBridge(AgentToolRegistry toolRegistry,
                    Clock clock,
                    AgentRuntimeBlockingTaskRunner taskRunner,
                    AgentToolExecutionOrchestrator toolExecutionOrchestrator,
                    AgentRuntimeApprovalRegistry approvalRegistry) {
        // The registry owns the handler catalog; without it the bridge cannot expose model-visible tools.
        this.toolRegistry = Objects.requireNonNull(toolRegistry, "toolRegistry must not be null");
        // The bridge owns elapsed-time and timeout calculations, so a missing clock would make execution accounting invalid.
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        // Blocking execution is part of timeout and cancellation enforcement; it cannot be substituted at call time.
        this.taskRunner = Objects.requireNonNull(taskRunner, "taskRunner must not be null");
        // AgentRuntimeService always wires the execution orchestrator; keeping catalog execution would restore a second path.
        this.toolExecutionOrchestrator = Objects.requireNonNull(toolExecutionOrchestrator,
            "toolExecutionOrchestrator must not be null");
        // Approval waits are completed from channel command handlers through this active runtime registry.
        this.approvalRegistry = Objects.requireNonNull(approvalRegistry, "approvalRegistry must not be null");
    }

    public AgentToolExecutionResult execute(AgentRuntimeContext context, AgentRuntimeProperties runtimeProperties,
                                            AgentRuntimeToolCall toolCall, AgentRuntimeControl control,
                                            AgentToolBridge.ExecutionListener eventSink) {
        // The runtime loop supplies the complete execution snapshot and mandatory approval event sink.
        Objects.requireNonNull(context, "context must not be null");
        Objects.requireNonNull(toolCall, "toolCall must not be null");
        Objects.requireNonNull(runtimeProperties, "runtimeProperties must not be null");
        Objects.requireNonNull(control, "control must not be null");
        Objects.requireNonNull(eventSink, "eventSink must not be null");
        AgentToolExecutionResult result = executeOnce(context, runtimeProperties, toolCall, control, eventSink, null);
        if (!isWaitingApproval(result)) {
            return result;
        }
        return awaitApprovalAndResume(context, runtimeProperties, toolCall, control, eventSink, result);
    }

    private AgentToolExecutionResult executeOnce(AgentRuntimeContext context,
                                                  AgentRuntimeProperties runtimeProperties,
                                                  AgentRuntimeToolCall toolCall, AgentRuntimeControl control,
                                                  AgentToolBridge.ExecutionListener eventSink,
                                                  AgentToolExecutionResult approvedResult) {
        control.checkpoint();
        long startedAt = clock.millis();
        AgentToolDescriptor descriptor = executableDescriptor(toolCall.getToolName());
        if (descriptor == null) {
            return unavailableResult(toolCall, clock.millis() - startedAt);
        }
        try {
            String toolCallId = approvedResult == null
                    ? toolCall.getToolCallId()
                    : approvedResult.getToolCallId();
            AgentToolExecutionRequest request = AgentToolExecutionRequest.builder()
                    .sessionUid(context.getSessionUid())
                    .runId(context.getRunId())
                    .runUid(context.getRunUid())
                    .runSessionId(context.getRunSessionId())
                    .actor(context.getActor())
                    .entryType(context.getEntryType())
                    .approvalHandling(context.getApprovalHandling())
                    .toolName(toolCall.getToolName())
                    .toolCallId(toolCallId)
                    .approvalId(approvedResult == null ? null : approvedResult.getApprovalId())
                    .approvalStatus(approvedResult == null ? null : approvedResult.getApprovalStatus().name())
                    .arguments(toolCall.getArguments())
                    .eventConsumer(event -> eventSink.toolEvent(toolCall, event))
                    .build();
            AgentToolExecutionResult rawResult = taskRunner.run(
                    "tool " + descriptor.getName(),
                    runtimeProperties.getToolTimeout(),
                    control,
                    () -> toolExecutionOrchestrator.execute(request));
            return runtimeResult(toolCall, descriptor, rawResult, clock.millis() - startedAt);
        } catch (AgentRuntimeOperationTimeoutException exception) {
            return timeoutResult(toolCall, descriptor, exception.getTimeout(), clock.millis() - startedAt);
        } catch (RuntimeException exception) {
            if (exception instanceof AgentRuntimeStoppedException) {
                throw exception;
            }
            // Bridge exceptions cross into model-visible tool results and client events.
            String errorMessage = AgentRuntimeTextSanitizer.sanitizeAndLimit(
                    "Tool execution failed: " + exception.getMessage(), 1024);
            return AgentToolExecutionResult.builder()
                    .toolCallId(toolCall.getToolCallId())
                    .toolName(descriptor.getName())
                    .status(AgentToolStatus.FAILED)
                    .decision(AgentPolicyDecision.ALLOW)
                    .risk(descriptor.getRisk())
                    .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                    .output(errorMessage)
                    .errorMessage(errorMessage)
                    .elapsedMs(clock.millis() - startedAt)
                    .build();
        }
    }

    private AgentToolExecutionResult awaitApprovalAndResume(AgentRuntimeContext context,
                                                            AgentRuntimeProperties runtimeProperties,
                                                            AgentRuntimeToolCall toolCall,
                                                            AgentRuntimeControl control,
                                                            AgentToolBridge.ExecutionListener eventSink,
                                                            AgentToolExecutionResult waitingResult) {
        String approvalId = waitingResult.getApprovalId();
        CompletableFuture<AgentApprovalDecision> approval = approvalRegistry.register(approvalId);
        try {
            eventSink.approvalRequested(toolCall, waitingResult);
            AgentApprovalDecision decision = awaitApprovalDecision(control, approval);
            eventSink.approvalCompleted(toolCall, waitingResult, decision);
            if (decision == AgentApprovalDecision.REJECTED) {
                return waitingResult.toBuilder()
                        .status(AgentToolStatus.DENIED)
                        .decision(AgentPolicyDecision.DENY)
                        .approvalStatus(AgentApprovalStatus.REJECTED)
                        .output("Tool execution rejected by approval decision.")
                        .errorMessage("Tool execution rejected by approval decision.")
                        .build();
            }
            return executeOnce(context, runtimeProperties, toolCall, control, eventSink, waitingResult);
        } finally {
            approval.cancel(false);
        }
    }

    private AgentApprovalDecision awaitApprovalDecision(AgentRuntimeControl control,
                                                       CompletableFuture<AgentApprovalDecision> approval) {
        while (true) {
            try {
                return approval.get(250, TimeUnit.MILLISECONDS);
            } catch (TimeoutException ignored) {
                control.checkpoint();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                control.stop("Runtime was interrupted.");
                control.checkpoint();
            } catch (CancellationException exception) {
                control.checkpoint();
                throw exception;
            } catch (ExecutionException exception) {
                Throwable cause = exception.getCause();
                if (cause instanceof RuntimeException runtimeException) {
                    throw runtimeException;
                }
                throw new IllegalStateException(cause);
            }
        }
    }

    private AgentToolDescriptor executableDescriptor(String toolName) {
        return toolRegistry.find(toolName)
            .map(AgentToolRegistry.RegisteredTool::descriptor)
            .filter(descriptor -> descriptor.getExposure() == AgentToolExposure.MODEL_VISIBLE
                || descriptor.getExposure() == AgentToolExposure.MODEL_ON_DEMAND)
            .orElse(null);
    }

    public List<AgentToolDescriptor> visibleTools() {
        List<AgentToolDescriptor> descriptors = toolRegistry.descriptors();
        if (descriptors.isEmpty()) {
            return List.of();
        }
        return descriptors.stream()
                .filter(this::isVisibleTool)
                .toList();
    }

    public List<AgentToolDescriptor> discoverableTools(String namespace, String query) {
        return toolRegistry.discoverableDescriptors(namespace, query);
    }

    private boolean isVisibleTool(AgentToolDescriptor descriptor) {
        // Model visibility is catalog metadata only; execution authorization remains in policy and approvals.
        return descriptor.getExposure() == AgentToolExposure.MODEL_VISIBLE;
    }

    private AgentToolExecutionResult unavailableResult(AgentRuntimeToolCall toolCall, long elapsedMs) {
        String toolName = toolCall.getToolName();
        String errorMessage = "Unknown or unavailable tool: " + toolName;
        return AgentToolExecutionResult.builder()
                .toolCallId(toolCall.getToolCallId())
                .toolName(toolName)
                .status(AgentToolStatus.FAILED)
                .decision(AgentPolicyDecision.DENY)
                .risk(AgentToolRisk.DANGEROUS)
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(errorMessage)
                .errorMessage(errorMessage)
                .elapsedMs(elapsedMs)
                .build();
    }

    private AgentToolExecutionResult runtimeResult(AgentRuntimeToolCall toolCall, AgentToolDescriptor descriptor,
                                                   AgentToolExecutionResult result, long elapsedMs) {
        if (result == null) {
            // The orchestrator contract should not return null; degrade invalid implementations into tool failure.
            return AgentToolExecutionResult.builder()
                    .toolCallId(toolCall.getToolCallId())
                    .toolName(descriptor.getName())
                    .status(AgentToolStatus.FAILED)
                    .decision(AgentPolicyDecision.ALLOW)
                    .risk(descriptor.getRisk())
                    .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                    .output("Tool returned no result.")
                    .errorMessage("Tool returned no result.")
                    .elapsedMs(elapsedMs)
                    .build();
        }
        AgentToolStatus status = result.getStatus();
        String output = modelOutput(status, result);
        return result.toBuilder()
                .output(output)
                .elapsedMs(elapsedMs)
                .build();
    }

    private String modelOutput(AgentToolStatus status, AgentToolExecutionResult result) {
        if (StringUtils.hasText(result.getOutput())) {
            return result.getOutput();
        }
        if (status == AgentToolStatus.DENIED || status == AgentToolStatus.FAILED) {
            return StringUtils.hasText(result.getErrorMessage())
                    ? result.getErrorMessage()
                    : "Tool failed without an error message.";
        }
        // Successful handlers may intentionally return no model content; represent that as an empty tool result.
        return "";
    }

    private AgentToolExecutionResult timeoutResult(AgentRuntimeToolCall toolCall,
                                                   AgentToolDescriptor descriptor,
                                                   Duration timeout, long elapsedMs) {
        long timeoutMs = timeout.toMillis();
        String errorMessage = "Tool execution timed out after " + timeoutMs + "ms.";
        return AgentToolExecutionResult.builder()
                .toolCallId(toolCall.getToolCallId())
                .toolName(descriptor.getName())
                .status(AgentToolStatus.FAILED)
                .decision(AgentPolicyDecision.ALLOW)
                .risk(descriptor.getRisk())
                .approvalStatus(AgentApprovalStatus.NOT_REQUIRED)
                .output(errorMessage)
                .errorMessage(errorMessage)
                .elapsedMs(elapsedMs)
                .build();
    }

    private boolean isWaitingApproval(AgentToolExecutionResult result) {
        return result.getStatus() == AgentToolStatus.WAITING_APPROVAL
                || result.getDecision() == AgentPolicyDecision.REQUIRE_APPROVAL;
    }

    /**
     * Approval lifecycle listener owned by the tool bridge boundary.
     */
    public interface ExecutionListener {

        void approvalRequested(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result);

        void approvalCompleted(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result,
                               AgentApprovalDecision decision);

        void toolEvent(AgentRuntimeToolCall toolCall, AgentRuntimeEvent event);

        static ExecutionListener noop() {
            return new ExecutionListener() {
                @Override
                public void approvalRequested(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result) {
                }

                @Override
                public void approvalCompleted(AgentRuntimeToolCall toolCall, AgentToolExecutionResult result,
                                              AgentApprovalDecision decision) {
                }

                @Override
                public void toolEvent(AgentRuntimeToolCall toolCall, AgentRuntimeEvent event) {
                }
            };
        }
    }

}
