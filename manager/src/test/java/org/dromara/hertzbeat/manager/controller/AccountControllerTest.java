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

package org.dromara.hertzbeat.manager.controller;

import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.manager.pojo.dto.LoginDto;
import com.usthe.sureness.util.JsonWebTokenUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test case for {@link AccountController}
 */
@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AccountController accountController;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(accountController).build();
    }

    @Test
    void authGetToken() throws Exception {
        JsonWebTokenUtil.setDefaultSecretKey("dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp"
                + "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
                + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9"
                + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp");
        LoginDto loginDto = LoginDto.builder()
                .identifier("admin")
                .credential("hertzbeat")
                .build();
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/auth/form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.token").exists())
                .andReturn();
        loginDto.setCredential("wrong_credential");
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/auth/form")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(loginDto)))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_LOGIN_FAILED_CODE))
                .andReturn();
    }

    @Test
    void refreshToken() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/auth/refresh/{refreshToken}",
                        "123456"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.MONITOR_LOGIN_FAILED_CODE))
                .andReturn();
    }
}
