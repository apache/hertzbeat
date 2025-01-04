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

package org.apache.hertzbeat.alert.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Email account configuration dto
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MailServerConfig {

    @NotNull(message = "Type cannot be empty")
    private Integer type;

    @NotBlank(message = "Mail host cannot be empty")
    private String emailHost;

    @NotBlank(message = "Username cannot be empty")
    @Email
    private String emailUsername;

    @NotBlank(message = "Password cannot be empty")
    private String emailPassword;

    @NotNull(message = "Mail port cannot be null")
    @Max(message = "Mail port must be less than or equal to 65535", value = 65535)
    @Min(message = "Mail port must be greater than or equal to 1", value = 1)
    private Integer emailPort;

    private boolean emailSsl = true;

    private boolean emailStarttls = false;

    private boolean enable = true;
}
