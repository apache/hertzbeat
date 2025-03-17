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

package org.apache.hertzbeat.alert.config;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * UniSMS properties
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UniSmsProperties {
    /**
     * UniSMS access key id
     */
    @NotBlank(message = "accessKeyId cannot be empty")
    private String accessKeyId;
    
    /**
     * UniSMS access key secret, required for HMAC mode
     */
    private String accessKeySecret;
    
    /**
     * SMS signature
     */
    @NotBlank(message = "signature cannot be null")
    private String signature;
    
    /**
     * SMS template ID
     */
    @NotBlank(message = "templateId cannot be null")
    private String templateId;
    
    /**
     * Authentication mode: simple or hmac, default is simple
     */
    @NotBlank(message = "authMode cannot be null")
    private String authMode = "simple";
} 