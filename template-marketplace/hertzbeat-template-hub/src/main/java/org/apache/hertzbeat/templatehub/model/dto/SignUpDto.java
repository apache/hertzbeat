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
@Schema(description = "sign up body")
public class SignUpDto {

    @Schema(description = "name", example = "user", accessMode = READ_ONLY)
    @NotBlank(message = "Name can not null")
    @Size(max = 10, message = "name max length 10")
    private String name;

    @Schema(description = "user email", example = "xxx@xxx.com", accessMode = READ_ONLY)
    @NotBlank(message = "email can not null")
    private String email;

    @Schema(description = "password", example = "123456", accessMode = READ_ONLY)
    @NotBlank(message = "password can not null")
    @Size(min = 6,max = 16, message = "password max length 16,min 6")
    private String password;

}
