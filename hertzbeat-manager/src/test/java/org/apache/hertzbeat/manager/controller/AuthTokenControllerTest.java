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

package org.apache.hertzbeat.manager.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link AuthTokenController}
 */
@ExtendWith(MockitoExtension.class)
class AuthTokenControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AuthTokenController authTokenController;

    @Mock
    private AccountService accountService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(authTokenController).build();
    }

    @Test
    void testGenerateTokenSuccess() throws Exception {
        SubjectSum subjectSum = mockAdminSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
            when(accountService.generateToken(eq("my-token"), eq(3600L))).thenReturn("generated-jwt-token");

            this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/token/generate")
                            .param("name", "my-token")
                            .param("expireSeconds", "3600"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.token").value("generated-jwt-token"));
        }
    }

    @Test
    void testGenerateTokenWithoutOptionalParams() throws Exception {
        SubjectSum subjectSum = mockAdminSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
            when(accountService.generateToken(any(), any())).thenReturn("generated-jwt-token");

            this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/token/generate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.token").value("generated-jwt-token"));
        }
    }

    @Test
    void testGenerateTokenNoLogin() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(null);

            this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/token/generate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No login user"));
        }
    }

    @Test
    void testGenerateTokenNoPermission() throws Exception {
        SubjectSum subjectSum = mockUserSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            this.mockMvc.perform(MockMvcRequestBuilders.post("/api/account/token/generate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }
    }

    @Test
    void testListTokensSuccess() throws Exception {
        SubjectSum subjectSum = mockAdminSubject();
        List<AuthToken> tokens = List.of(
                AuthToken.builder().id(1L).name("Token1").tokenHash("hash1").tokenMask("mask1")
                        .status((byte) 0).gmtCreate(LocalDateTime.now()).build(),
                AuthToken.builder().id(2L).name("Token2").tokenHash("hash2").tokenMask("mask2")
                        .status((byte) 0).gmtCreate(LocalDateTime.now()).build()
        );

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
            when(accountService.listTokens()).thenReturn(tokens);

            this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].name").value("Token1"))
                    .andExpect(jsonPath("$.data[1].name").value("Token2"));
        }
    }

    @Test
    void testListTokensNoLogin() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(null);

            this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));
        }
    }

    @Test
    void testListTokensNoPermission() throws Exception {
        SubjectSum subjectSum = mockUserSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            this.mockMvc.perform(MockMvcRequestBuilders.get("/api/account/token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));
        }
    }

    @Test
    void testDeleteTokenSuccess() throws Exception {
        SubjectSum subjectSum = mockAdminSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);
            doNothing().when(accountService).deleteToken(1L);

            this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/account/token/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));

            verify(accountService).deleteToken(1L);
        }
    }

    @Test
    void testDeleteTokenNoLogin() throws Exception {
        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(null);

            this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/account/token/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));
        }
    }

    @Test
    void testDeleteTokenNoPermission() throws Exception {
        SubjectSum subjectSum = mockUserSubject();

        try (var mockedStatic = mockStatic(SurenessContextHolder.class)) {
            mockedStatic.when(SurenessContextHolder::getBindSubject).thenReturn(subjectSum);

            this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/account/token/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                    .andExpect(jsonPath("$.msg").value("No permission"));

            verify(accountService, never()).deleteToken(1L);
        }
    }

    private SubjectSum mockAdminSubject() {
        SubjectSum subjectSum = org.mockito.Mockito.mock(SubjectSum.class);
        when(subjectSum.hasRole("admin")).thenReturn(true);
        return subjectSum;
    }

    private SubjectSum mockUserSubject() {
        SubjectSum subjectSum = org.mockito.Mockito.mock(SubjectSum.class);
        when(subjectSum.hasRole("admin")).thenReturn(false);
        return subjectSum;
    }
}
