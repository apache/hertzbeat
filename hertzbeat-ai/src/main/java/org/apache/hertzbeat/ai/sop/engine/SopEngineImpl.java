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

    // Thread-local context for each execution
    private static final ThreadLocal<Map<String, Object>> CONTEXT_BUS = ThreadLocal.withInitial(HashMap::new);
    
    private final List<SopExecutor> executors;

    @Autowired
    public SopEngineImpl(List<SopExecutor> executors) {
        this.executors = executors;
    }

    @Override
    public Flux<String> execute(SopDefinition definition, Map<String, Object> inputParams) {
        return Flux.create(sink -> {
            try {
                log.info("Starting execution of SOP: {}", definition.getName());
                sink.next("Starting SOP: " + definition.getName() + " (v" + definition.getVersion() + ")");
                
                // Initialize context with input parameters
                Map<String, Object> context = CONTEXT_BUS.get();
                context.clear();
                context.putAll(inputParams);
                
                // Add language configuration to context
                OutputConfig outputConfig = definition.getOutput();
                if (outputConfig != null) {
                    context.put("_language", outputConfig.getLanguageCode());
                } else {
                    context.put("_language", "zh");
                }
                
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
                log.error("Error executing SOP {}: {}", definition.getName(), e.getMessage(), e);
                sink.error(e);
            } finally {
                CONTEXT_BUS.remove();
            }
        });
    }
    
    @Override
    public SopResult executeSync(SopDefinition definition, Map<String, Object> inputParams) {
        long startTime = System.currentTimeMillis();
        List<StepResult> stepResults = new ArrayList<>();
        Map<String, Object> context = new HashMap<>(inputParams);
        
        // Apply default values for parameters that are not provided
        if (definition.getParameters() != null) {
            for (SopParameter param : definition.getParameters()) {
                if (!context.containsKey(param.getName()) && param.getDefaultValue() != null) {
                    context.put(param.getName(), param.getDefaultValue());
                }
            }
        }
        
        // Get output configuration first
        OutputConfig outputConfig = definition.getOutput();
        if (outputConfig == null) {
            outputConfig = OutputConfig.builder()
                    .type("simple")
                    .format("text")
                    .language("zh")
                    .build();
        }
        
        // Add language configuration to context
        context.put("_language", outputConfig.getLanguageCode());
        
        SopResult.SopResultBuilder resultBuilder = SopResult.builder()
                .sopName(definition.getName())
                .sopVersion(definition.getVersion())
                .startTime(startTime);
        
        resultBuilder.outputType(outputConfig.getOutputType());
        resultBuilder.outputFormat(outputConfig.getFormat() != null ? outputConfig.getFormat() : "text");
        resultBuilder.language(outputConfig.getLanguageCode());
        
        try {
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
