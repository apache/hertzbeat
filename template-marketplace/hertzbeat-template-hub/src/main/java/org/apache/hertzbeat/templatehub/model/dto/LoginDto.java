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

package org.apache.hertzbeat.templatehub.model.DTO;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;

/**
 * Login registered account information transfer body email
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Account information transfer body")
public class LoginDto {

    /**
     * type
     * 1. Account (email) username password login 2. github login
     */
    @Schema(description = "type", example = "1", accessMode = READ_ONLY)
    @Max(value = 4, message = "1. Account (email) password login 2. github login 3. WeChat login")
    private Byte type;

    /**
     * User ID
     */
    @Schema(description = "user identification", example = "1", accessMode = READ_ONLY)
    @NotBlank(message = "Identifier can not null")
    private String identifier;

    /**
     * key
     */
    @Schema(description = "Secret key", example = "1", accessMode = READ_ONLY)
    @NotBlank(message = "Credential can not null")
    @Size(max = 512, message = "credential max length 512")
    private String credential;

}
