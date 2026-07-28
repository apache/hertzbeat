/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigPublicOptions;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.service.ObjectStoreConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@ExtendWith(MockitoExtension.class)
class ObjectStoreConfigControllerTest {

    @Mock
    private ObjectStoreConfigService objectStoreConfigService;
    @InjectMocks
    private ObjectStoreConfigController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(controller).build();
    }

    @Test
    void readDoesNotExposeObsCredentials() throws Exception {
        when(objectStoreConfigService.getSafeConfig()).thenReturn(obsResponse());

        mockMvc.perform(get("/api/config/oss").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.type").value("OBS"))
                .andExpect(jsonPath("$.data.config.bucketName").value("bucket"))
                .andExpect(jsonPath("$.data.config.accessKey").doesNotExist())
                .andExpect(jsonPath("$.data.config.secretKey").doesNotExist())
                .andExpect(jsonPath("$.data.configuredSecrets").isArray());
    }

    @Test
    void missingConfigIsDistinctFromStorageFailure() throws Exception {
        when(objectStoreConfigService.getSafeConfig()).thenReturn(null);
        mockMvc.perform(get("/api/config/oss").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void failuresUseFixedEnvelopeWithoutStorageOrConfigText() throws Exception {
        when(objectStoreConfigService.getSafeConfig())
                .thenThrow(new DataAccessResourceFailureException("object-store-storage-sentinel"));
        when(objectStoreConfigService.saveAndGetSafeConfig(any()))
                .thenThrow(new IllegalArgumentException("object-store-config-sentinel"));

        mockMvc.perform(get("/api/config/oss").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Object store storage unavailable"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("object-store-storage-sentinel"))));
        mockMvc.perform(post("/api/config/oss")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"invalid-type-sentinel\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Invalid object store config"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("object-store-config-sentinel"))))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("invalid-type-sentinel"))));
    }

    @Test
    void malformedSecretBodyUsesFixedEnvelopeWithoutEcho() throws Exception {
        mockMvc.perform(post("/api/config/oss")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OBS\",\"config\":{\"secretKey\":\"secret-body-sentinel\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Invalid object store config"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret-body-sentinel"))));
    }

    private ObjectStoreConfigResponse obsResponse() {
        return new ObjectStoreConfigResponse(ObjectStoreDTO.Type.OBS,
                new ObjectStoreConfigPublicOptions(
                        "bucket", "https://obs.cn-north-4.myhuaweicloud.com", "hertzbeat"),
                Set.of("accessKey", "secretKey"));
    }
}
