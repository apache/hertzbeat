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

package org.apache.hertzbeat.templatehub.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hertzbeat.templatehub.model.dto.TemplateDto;
import org.apache.hertzbeat.templatehub.model.entity.Version;
import org.apache.hertzbeat.templatehub.service.StarService;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.apache.hertzbeat.templatehub.service.VersionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * Test case for {@link VersionController}
 */
@ExtendWith(MockitoExtension.class)
class VersionControllerTest {

    @InjectMocks
    private VersionController versionController;

    @Mock
    private TemplateService templateService;

    @Mock
    private VersionService versionService;

    @Mock
    private StarService starService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        this.mockMvc = standaloneSetup(versionController).build();
    }

    @Test
    public void testGetVersionsByTemplate_ValidTemplateId() throws Exception {
        when(versionService.getVersions(anyInt())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/version/version/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testGetVersionsByTemplate_InvalidTemplateId() throws Exception {
        mockMvc.perform(get("/version/version/0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("Template information error"))
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testGetVersionById_ValidVersionId() throws Exception {
        Version version = new Version();
        version.setId(1);

        when(versionService.getVersion(anyInt())).thenReturn(version);

        mockMvc.perform(get("/version/get/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    public void testGetVersionById_InvalidVersionId() throws Exception {
        when(versionService.getVersion(anyInt())).thenReturn(null);

        mockMvc.perform(get("/version/get/999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testGetVersionPageByTemplate_ValidParameters() throws Exception {
        List<Version> versions = new ArrayList<>();
        versions.add(new Version());
        Page<Version> versionPage = new PageImpl<>(versions);
        when(versionService.getVersionPageByTemplate(anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(versionPage);

        mockMvc.perform(get("/version/page/1/0?page=0&size=10"));

        verify(versionService, times(1)).getVersionPageByTemplate(anyInt(), anyInt(), anyInt(), anyInt());
    }

    @Test
    public void testUploadVersion_ValidInput() throws Exception {
        TemplateDto templateDto = new TemplateDto();
        templateDto.setUserId(1);
        templateDto.setName("Test Template");
        templateDto.setCurrentVersion("1.0");

        String templateDtoJson = new ObjectMapper().writeValueAsString(templateDto);

        when(versionService.upload(any(), any())).thenReturn(true);

        mockMvc.perform(multipart("/version/upload")
                        .file("file", "dummy content".getBytes(StandardCharsets.UTF_8))
                        .param("templateDto", templateDtoJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testUploadVersion_EmptyFile() throws Exception {
        mockMvc.perform(multipart("/version/upload")
                        .file("file", new byte[0])
                        .param("templateDto", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testStarVersion_ValidParameters() throws Exception {
        when(starService.starVersion(anyInt(), anyInt(), anyInt(), any())).thenReturn(1);
        when(versionService.startVersion(anyInt())).thenReturn(true);
        when(templateService.starTemplate(anyInt())).thenReturn(true);

        mockMvc.perform(post("/version/star")
                        .param("user", "1")
                        .param("template", "1")
                        .param("version", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testStarVersion_InvalidParameters() throws Exception {
        mockMvc.perform(post("/version/star")
                        .param("user", "0")
                        .param("template", "0")
                        .param("version", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

}