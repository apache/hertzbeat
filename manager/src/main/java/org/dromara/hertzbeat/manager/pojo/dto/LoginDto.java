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

package org.dromara.hertzbeat.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.Range;

import jakarta.validation.constraints.NotBlank;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;

/**
 * Login registered account information transfer body username phone email
 * 登录注册账户信息传输体 username phone email
 *
 * @author tomsun28
 *
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Account information transfer body | 账户信息传输体")
public class LoginDto {

    /**
     * type
     * 1. Account (email username and mobile phone number) password login 2. github login 3. WeChat login
     */
    @Schema(description = "类型", example = "1", accessMode = READ_ONLY)
    @Range(min = 0, max = 4, message = "1.账户(邮箱用户名手机号)密码登录 2.github登录 3.微信登录")
    private Byte type;

    /**
     * User ID
     */
    @Schema(description = "用户标识", example = "1", accessMode = READ_ONLY)
    @NotBlank(message = "Identifier can not null")
    private String identifier;

    /**
     * key
     */
    @Schema(description = "密钥", example = "1", accessMode = READ_ONLY)
    @NotBlank(message = "Credential can not null")
    @Length(max = 512, message = "credential max length 512")
    private String credential;

}
