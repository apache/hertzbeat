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

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Output configuration for SOP definition.
 * Defines how the SOP result should be formatted and presented.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutputConfig {
    
    /**
     * Output type: report, simple, data, action
     */
    private String type;
    
    /**
     * Output format: markdown, json, text
     */
    private String format;
    
    /**
     * Which step's output should be used as the final summary
     */
    private String summaryStep;
    
    /**
     * Which step's output should be used as the main content
     */
    private String contentStep;
    
    /**
     * Language for LLM responses and SOP output: zh (Chinese), en (English)
     * Default is zh (Chinese)
     */
    private String language;
    
    /**
     * Get language code.
     * If not specified in skill config, uses system default locale (from user's SystemConfig).
     */
    public String getLanguageCode() {
        if (language == null || language.isEmpty()) {
            // Use system default locale (set by user's SystemConfig)
            java.util.Locale defaultLocale = java.util.Locale.getDefault();
            if (defaultLocale.getLanguage().equals("en")) {
                return "en";
            }
            return "zh"; // Default to Chinese for non-English locales
        }
        return language.toLowerCase();
    }
    
    /**
     * Check if the language is Chinese
     */
    public boolean isChinese() {
        return "zh".equals(getLanguageCode()) || "chinese".equalsIgnoreCase(language);
    }
    
    /**
     * Get the OutputType enum from string
     */
    public OutputType getOutputType() {
        if (type == null) {
            return OutputType.SIMPLE;
        }
        try {
            return OutputType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return OutputType.SIMPLE;
        }
    }
}
