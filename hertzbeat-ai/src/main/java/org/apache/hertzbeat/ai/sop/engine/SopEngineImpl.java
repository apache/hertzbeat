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

package org.apache.hertzbeat.ai.sop.engine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.sop.executor.SopExecutor;
import org.apache.hertzbeat.ai.sop.model.OutputConfig;
import org.apache.hertzbeat.ai.sop.model.OutputType;
import org.apache.hertzbeat.ai.sop.model.SopDefinition;
import org.apache.hertzbeat.ai.sop.model.SopParameter;
import org.apache.hertzbeat.ai.sop.model.SopResult;
import org.apache.hertzbeat.ai.sop.model.SopStep;
import org.apache.hertzbeat.ai.sop.model.StepResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * Implementation of the SopEngine.
 */
@Slf4j
@Service
public class SopEngineImpl implements SopEngine {

    private final List<SopExecutor> executors;

    @Autowired
    public SopEngineImpl(List<SopExecutor> executors) {
        this.executors = executors;
    }

    @Override
    public Flux<String> execute(SopDefinition definition, Map<String, Object> inputParams) {
        return Flux.create(sink -> {
            try {
                OutputConfig outputConfig = resolveOutputConfig(definition);
                Map<String, Object> context = prepareContext(definition, inputParams, outputConfig);

                log.info("Starting execution of SOP: {}", definition.getName());
                sink.next("Starting SOP: " + definition.getName() + " (v" + definition.getVersion() + ")");
                
                for (SopStep step : definition.getSteps()) {
                    sink.next("Executing step [" + step.getId() + "]: " + step.getType());
                    
                    // Find appropriate executor
                    SopExecutor executor = findExecutor(step.getType());
                    if (executor == null) {
                        String error = "No executor found for step type: " + step.getType();
                        log.error(error);
                        sink.error(new IllegalArgumentException(error));
                        return;
                    }
                    
                    // Execute the step
                    try {
                        Object result = executor.execute(step, context);
                        context.put(step.getId(), result);
                        
                        // For LLM steps, output the result (the report)
                        if ("llm".equalsIgnoreCase(step.getType()) && result != null) {
                            sink.next("--- Report from " + step.getId() + " ---");
                            sink.next(String.valueOf(result));
                            sink.next("--- End of Report ---");
                        }
                        
                        sink.next("Step " + step.getId() + " completed");
                    } catch (Exception e) {
                        log.error("Error executing step {}: {}", step.getId(), e.getMessage(), e);
                        sink.error(e);
                        return;
                    }
                }
                
                sink.next("SOP " + definition.getName() + " completed successfully.");
                sink.complete();
            } catch (Exception e) {
                String sopName = definition == null ? "unknown" : definition.getName();
                log.error("Error executing SOP {}: {}", sopName, e.getMessage(), e);
                sink.error(e);
            }
        });
    }
    
    @Override
    public SopResult executeSync(SopDefinition definition, Map<String, Object> inputParams) {
        long startTime = System.currentTimeMillis();
        List<StepResult> stepResults = new ArrayList<>();

        SopResult.SopResultBuilder resultBuilder = SopResult.builder()
                .sopName(definition == null ? null : definition.getName())
                .sopVersion(definition == null ? null : definition.getVersion())
                .startTime(startTime);

        try {
            OutputConfig outputConfig = resolveOutputConfig(definition);
            Map<String, Object> context = prepareContext(definition, inputParams, outputConfig);

            resultBuilder.outputType(outputConfig.getOutputType());
            resultBuilder.outputFormat(outputConfig.getFormat() != null ? outputConfig.getFormat() : "text");
            resultBuilder.language(outputConfig.getLanguageCode());

            log.info("Starting sync execution of SOP: {}", definition.getName());
            
            for (SopStep step : definition.getSteps()) {
                long stepStartTime = System.currentTimeMillis();
                StepResult.StepResultBuilder stepBuilder = StepResult.builder()
                        .stepId(step.getId())
                        .type(step.getType())
                        .startTime(stepStartTime);
                
                // Find appropriate executor
                SopExecutor executor = findExecutor(step.getType());
                if (executor == null) {
                    String error = "No executor found for step type: " + step.getType();
                    log.error(error);
                    stepBuilder.status("FAILED")
                            .error(error)
                            .endTime(System.currentTimeMillis());
                    stepResults.add(stepBuilder.build());
                    
                    return buildFailedResult(resultBuilder, stepResults, error, startTime);
                }
                
                // Execute the step
                try {
                    Object result = executor.execute(step, context);
                    context.put(step.getId(), result);
                    
                    long stepEndTime = System.currentTimeMillis();
                    stepBuilder.status("SUCCESS")
                            .output(result)
                            .endTime(stepEndTime)
                            .duration(stepEndTime - stepStartTime);
                    stepResults.add(stepBuilder.build());
                    
                } catch (Exception e) {
                    log.error("Error executing step {}: {}", step.getId(), e.getMessage(), e);
                    long stepEndTime = System.currentTimeMillis();
                    stepBuilder.status("FAILED")
                            .error(e.getMessage())
                            .endTime(stepEndTime)
                            .duration(stepEndTime - stepStartTime);
                    stepResults.add(stepBuilder.build());
                    
                    return buildFailedResult(resultBuilder, stepResults, e.getMessage(), startTime);
                }
            }
            
            // Build successful result
            long endTime = System.currentTimeMillis();
            resultBuilder.status("SUCCESS")
                    .endTime(endTime)
                    .duration(endTime - startTime)
                    .steps(stepResults)
                    .data(context);
            
            // Extract summary and content based on output configuration
            extractOutputContent(resultBuilder, context, outputConfig, stepResults);
            
            return resultBuilder.build();
            
        } catch (Exception e) {
            log.error("Error executing SOP {}: {}", definition.getName(), e.getMessage(), e);
            return buildFailedResult(resultBuilder, stepResults, e.getMessage(), startTime);
        }
    }

    /**
     * Applies defaults and validates required parameters consistently for every execution entry point.
     */
    private Map<String, Object> prepareContext(SopDefinition definition, Map<String, Object> inputParams,
                                                OutputConfig outputConfig) {
        if (definition.getSteps() == null || definition.getSteps().isEmpty()) {
            throw new IllegalArgumentException("SOP must contain at least one step");
        }

        Map<String, Object> context = inputParams == null ? new HashMap<>() : new HashMap<>(inputParams);
        if (definition.getParameters() != null) {
            for (SopParameter parameter : definition.getParameters()) {
                Object value = context.get(parameter.getName());
                if (isMissing(value) && parameter.getDefaultValue() != null) {
                    context.put(parameter.getName(), parameter.getDefaultValue());
                    value = parameter.getDefaultValue();
                }
                if (parameter.isRequired() && isMissing(value)) {
                    throw new IllegalArgumentException("Required SOP parameter is missing: " + parameter.getName());
                }
            }
        }
        context.put("_language", outputConfig.getLanguageCode());
        return context;
    }

    private boolean isMissing(Object value) {
        return value == null || value instanceof String text && text.isBlank();
    }

    private OutputConfig resolveOutputConfig(SopDefinition definition) {
        if (definition == null) {
            throw new IllegalArgumentException("SOP definition must not be null");
        }
        if (definition.getOutput() != null) {
            return definition.getOutput();
        }
        return OutputConfig.builder()
                .type("simple")
                .format("text")
                .language("zh")
                .build();
    }
    
    private SopResult buildFailedResult(SopResult.SopResultBuilder builder, 
            List<StepResult> stepResults, String error, long startTime) {
        long endTime = System.currentTimeMillis();
        return builder.status("FAILED")
                .endTime(endTime)
                .duration(endTime - startTime)
                .steps(stepResults)
                .error(error)
                .summary("SOP execution failed: " + error)
                .build();
    }
    
    private void extractOutputContent(SopResult.SopResultBuilder builder, 
            Map<String, Object> context, OutputConfig outputConfig, List<StepResult> stepResults) {
        
        // Extract content from specified step or last LLM step
        String contentStepId = outputConfig.getContentStep();
        String summaryStepId = outputConfig.getSummaryStep();
        
        // Find content
        if (contentStepId != null && context.containsKey(contentStepId)) {
            builder.content(String.valueOf(context.get(contentStepId)));
        } else {
            // Default: use the last LLM step's output as content
            for (int i = stepResults.size() - 1; i >= 0; i--) {
                StepResult step = stepResults.get(i);
                if ("llm".equalsIgnoreCase(step.getType()) && step.getOutput() != null) {
                    builder.content(String.valueOf(step.getOutput()));
                    break;
                }
            }
        }
        
        // Generate summary based on output type
        OutputType outputType = outputConfig.getOutputType();
        switch (outputType) {
            case REPORT:
                builder.summary("Report generated successfully");
                break;
            case DATA:
                builder.summary("Data retrieved: " + context.size() + " items");
                break;
            case ACTION:
                builder.summary("Action pending confirmation");
                break;
            default:
                builder.summary("Operation completed successfully");
        }
        
        // Override with custom summary step if specified
        if (summaryStepId != null && context.containsKey(summaryStepId)) {
            String summaryContent = String.valueOf(context.get(summaryStepId));
            // Take first line as summary
            int newlineIndex = summaryContent.indexOf('\n');
            if (newlineIndex > 0 && newlineIndex < 200) {
                builder.summary(summaryContent.substring(0, newlineIndex));
            } else if (summaryContent.length() > 200) {
                builder.summary(summaryContent.substring(0, 200) + "...");
            } else {
                builder.summary(summaryContent);
            }
        }
    }
    
    private SopExecutor findExecutor(String type) {
        for (SopExecutor executor : executors) {
            if (executor.support(type)) {
                return executor;
            }
        }
        return null;
    }
}
