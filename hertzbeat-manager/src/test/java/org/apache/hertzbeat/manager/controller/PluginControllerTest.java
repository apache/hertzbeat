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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.PluginMetadata;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.pojo.dto.PluginParam;
import org.apache.hertzbeat.manager.pojo.dto.PluginParametersVO;
import org.apache.hertzbeat.manager.pojo.dto.PluginUpload;
import org.apache.hertzbeat.manager.service.PluginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * test case for plugin controller
 */
@ExtendWith(MockitoExtension.class)
class PluginControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private PluginController pluginController;

    @Mock
    private PluginService pluginService;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(pluginController).build();
    }

    @Test
    void uploadBindsHistoricalMultipartFieldNames() throws Exception {
        MockMultipartFile jarFile = new MockMultipartFile(
                "jarFile",
                "plugin-test.jar",
                "application/java-archive",
                "This is the file content".getBytes(StandardCharsets.UTF_8)
        );

        this.mockMvc.perform(MockMvcRequestBuilders.multipart("/api/plugin")
                        .file(jarFile)
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .param("name", "test-plugin")
                        .param("enableStatus", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Add success"))
                .andReturn();

        ArgumentCaptor<PluginUpload> upload = ArgumentCaptor.forClass(PluginUpload.class);
        verify(pluginService).savePlugin(upload.capture());
        assertEquals("test-plugin", upload.getValue().getName());
        assertEquals(true, upload.getValue().getEnableStatus());
        assertEquals("plugin-test.jar", upload.getValue().getJarFile().getOriginalFilename());
    }

    @Test
    void listUsesZeroBasedPaginationEnvelopeWithoutPersistedFilePath() throws Exception {
        PluginMetadata plugin = PluginMetadata.builder()
                .id(11L)
                .name("audit-plugin")
                .enableStatus(true)
                .jarFilePath("/secret/plugin-lib/audit.jar")
                .items(List.of())
                .paramCount(1)
                .build();
        when(pluginService.getPlugins("audit", 0, 8))
                .thenReturn(new PageImpl<>(List.of(plugin), PageRequest.of(0, 8), 1));

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin")
                        .param("search", "audit")
                        .param("pageIndex", "0")
                        .param("pageSize", "8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.number").value(0))
                .andExpect(jsonPath("$.data.size").value(8))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(11))
                .andExpect(jsonPath("$.data.content[0].name").value("audit-plugin"))
                .andExpect(jsonPath("$.data.content[0].enableStatus").value(true))
                .andExpect(jsonPath("$.data.content[0].jarFilePath").doesNotExist())
                .andReturn();
        verify(pluginService).getPlugins("audit", 0, 8);
    }

    @Test
    void deleteUsesRepeatedIdsQueryForBatchOperation() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/plugin")
                        .param("ids", "3", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Delete success"))
                .andReturn();
        verify(pluginService).deletePlugins(Set.of(3L, 7L));
    }

    @Test
    void updatePluginStatus() throws Exception {
        PluginMetadata metadata = new PluginMetadata();
        metadata.setId(6565463543L);
        metadata.setEnableStatus(true);

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/plugin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(metadata)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.msg").value("Update success"))
                .andReturn();
        verify(pluginService).updateStatus(metadata);
    }

    @Test
    void parameterDefinitionReadUsesIdQueryAndArrayFields() throws Exception {
        ParamDefineInfo define = new ParamDefineInfo();
        define.setField("endpoint");
        define.setType("text");
        PluginParam value = PluginParam.builder()
                .pluginMetadataId(11L)
                .field("endpoint")
                .paramValue("https://example.invalid")
                .type((byte) 1)
                .build();
        when(pluginService.getParamDefine(11L))
                .thenReturn(new PluginParametersVO(List.of(define), List.of(value)));

        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin/params/define")
                        .param("pluginMetadataId", "11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.paramDefines[0].field").value("endpoint"))
                .andExpect(jsonPath("$.data.pluginParams[0].pluginMetadataId").value(11));
        verify(pluginService).getParamDefine(11L);
    }

    @Test
    void parameterSaveAcceptsArrayAndEmptyArray() throws Exception {
        PluginParam value = PluginParam.builder()
                .pluginMetadataId(11L)
                .field("endpoint")
                .paramValue("https://example.invalid")
                .type((byte) 1)
                .build();

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/plugin/params")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(List.of(value))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").value(true));
        verify(pluginService).savePluginParam(List.of(value));

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/plugin/params")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data").value(true));
        verify(pluginService).savePluginParam(List.of());
    }

    @Test
    void operationFailureUsesStableMessageWithoutExceptionOrFilePath() throws Exception {
        doThrow(new CommonException("invalid plugin at /secret/plugin-lib/private.jar"))
                .when(pluginService).savePlugin(any(PluginUpload.class));
        MockMultipartFile jarFile = new MockMultipartFile(
                "jarFile", "private.jar", "application/java-archive", new byte[]{1});

        this.mockMvc.perform(MockMvcRequestBuilders.multipart("/api/plugin")
                        .file(jarFile)
                        .param("name", "private")
                        .param("enableStatus", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("plugin_operation_failed"))
                .andExpect(jsonPath("$.msg").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("/secret/"))));

        when(pluginService.getPlugins(null, 0, 8))
                .thenThrow(new IllegalStateException("database failed at /secret/plugin.db"));
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/plugin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE))
                .andExpect(jsonPath("$.msg").value("plugin_operation_failed"))
                .andExpect(jsonPath("$.msg").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("/secret/"))));
    }

}
