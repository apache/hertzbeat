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

package org.apache.hertzbeat.ai.sop.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.ai.sop.util.SopMessageUtil;

/**
 * Unified SOP execution result.
 * Contains all information about a SOP execution including metadata, output, and step details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SopResult {
    
    // ===== Metadata =====
    
    /**
     * SOP name
     */
    private String sopName;
    
    /**
     * SOP version
     */
    private String sopVersion;
    
    /**
     * Execution status: SUCCESS, FAILED, PARTIAL
     */
    private String status;
    
    /**
     * Start timestamp in milliseconds
     */
    private long startTime;
    
    /**
     * End timestamp in milliseconds
     */
    private long endTime;
    
    /**
     * Duration in milliseconds
     */
    private long duration;
    
    // ===== Output Type =====
    
    /**
     * Output type: REPORT, SIMPLE, DATA, ACTION
     */
    private OutputType outputType;
    
    /**
     * Output format: markdown, json, text
     */
    private String outputFormat;
    
    /**
     * Language code: zh (Chinese), en (English)
     */
    @Builder.Default
    private String language = "zh";
    
    // ===== Output Content =====
    
    /**
     * Short summary (one line)
     */
    private String summary;
    
    /**
     * Main content (Markdown report / JSON data / etc.)
     */
    private String content;
    
    /**
     * Structured data (for programmatic processing)
     */
    @Builder.Default
    private Map<String, Object> data = new HashMap<>();
    
    // ===== Step Details =====
    
    /**
     * Execution result of each step
     */
    @Builder.Default
    private List<StepResult> steps = new ArrayList<>();
    
    /**
     * Error message if failed
     */
    private String error;
    
    /**
     * Get localized message using i18n.
     */
    private String msg(String code) {
        return SopMessageUtil.getMessage(code, language);
    }
    
    /**
     * Convert to AI-friendly response format.
     * Used when SOP is called as a tool by AI.
     */
    public String toAiResponse() {
        StringBuilder sb = new StringBuilder();
        
        sb.append(msg("sop.result.title")).append(": ").append(status).append("\n");
        sb.append(msg("sop.result.name")).append(": ").append(sopName)
          .append(" (v").append(sopVersion).append(")\n");
        sb.append(msg("sop.result.duration")).append(": ").append(duration).append("ms\n");
        
        if (summary != null && !summary.isEmpty()) {
            sb.append(msg("sop.result.summary")).append(": ").append(summary).append("\n");
        }
        
        if ("FAILED".equals(status) && error != null) {
            sb.append(msg("sop.result.error")).append(": ").append(error).append("\n");
            return sb.toString();
        }
        
        if (outputType == OutputType.REPORT && content != null) {
            sb.append("\n--- ").append(msg("sop.result.report.title")).append(" ---\n");
            sb.append(content);
        } else if (outputType == OutputType.DATA && !data.isEmpty()) {
            sb.append("\n").append(msg("sop.result.data.title")).append(":\n");
            for (Map.Entry<String, Object> entry : data.entrySet()) {
                sb.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        } else if (outputType == OutputType.SIMPLE) {
            sb.append(msg("sop.result.simple.complete")).append("\n");
        }
        
        return sb.toString();
    }
    
    /**
     * Convert to SSE stream format for real-time updates.
     */
    public String toSseFormat() {
        StringBuilder sb = new StringBuilder();
        sb.append("event: sop_result\n");
        sb.append("data: {");
        sb.append("\"sopName\":\"").append(sopName).append("\",");
        sb.append("\"status\":\"").append(status).append("\",");
        sb.append("\"duration\":").append(duration).append(",");
        sb.append("\"outputType\":\"").append(outputType).append("\",");
        sb.append("\"language\":\"").append(language).append("\",");
        if (summary != null) {
            sb.append("\"summary\":\"").append(escapeJson(summary)).append("\",");
        }
        if (content != null) {
            sb.append("\"content\":\"").append(escapeJson(content)).append("\",");
        }
        sb.append("\"stepsCount\":").append(steps.size());
        sb.append("}\n\n");
        return sb.toString();
    }
    
    private String escapeJson(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
}
