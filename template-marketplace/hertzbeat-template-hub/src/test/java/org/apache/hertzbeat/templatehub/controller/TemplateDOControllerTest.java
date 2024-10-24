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
import org.apache.hertzbeat.templatehub.model.DTO.TemplateDto;
import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
import org.apache.hertzbeat.templatehub.service.TemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * Test case for {@link TemplateController}
 */
@ExtendWith(MockitoExtension.class)
class TemplateDOControllerTest {

    @InjectMocks
    private TemplateController templateController;

    @Mock
    private TemplateService templateService;

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        this.mockMvc = standaloneSetup(templateController).build();
    }

    @Test
    void testUploadTemplate_WithEmptyFileAndString_ShouldReturnParamsError() throws Exception {
        this.mockMvc.perform(multipart("/template/upload")
                                .file("file", new byte[0])
                                .param("templateDto", "")
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("params error"));

        verify(templateService, never()).upload(any(), any());
    }

    @Test
    void testUploadTemplate_WithValidInputs_ShouldReturnUploadSuccess() throws Exception {
        TemplateDto dto = new TemplateDto();
        dto.setUserId(1);
        dto.setName("Test Template");
        dto.setCurrentVersion("1.0");

        String jsonString = objectMapper.writeValueAsString(dto);
        when(templateService.upload(any(), any())).thenReturn(true);

        this.mockMvc.perform(multipart("/template/upload")
                        .file("file", new byte[1])
                        .param("templateDto", jsonString)
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.msg").value("upload success"));

        verify(templateService, times(1)).upload(any(), any());
    }

    @Test
    void testGetCountByIsDelAndOffshelf_WithValidParams_ShouldReturnCount() throws Exception {
        when(templateService.getCountByIsDelAndOffShelf(0, 1)).thenReturn(5);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/template/count/{isDel}/{offShelf}", 0, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(5))
                .andReturn();

        verify(templateService, times(1)).getCountByIsDelAndOffShelf(0, 1);
    }

    @Test
    void testGetTemplatePageByCategory_WithValidParams_ShouldReturnTemplates() throws Exception {

        List<TemplateDO> templateDOS = new ArrayList<>();
        templateDOS.add(new TemplateDO());
        Page<TemplateDO> mockPage = new PageImpl<>(templateDOS);

        when(templateService.getPageByCategory(any(), anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(mockPage);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/template/page/category/{categoryIdStr}/{isDel}/{orderOption}", "1_2_3", 0, 1)
                        .param("page", "0")
                        .param("size", "10"));

        verify(templateService, times(1)).getPageByCategory(any(), anyInt(), anyInt(), anyInt(), anyInt());
    }

    @Test
    void testGetPageByName_WithValidParams_ShouldReturnTemplates() throws Exception {

        List<TemplateDO> templateDOS = new ArrayList<>();
        templateDOS.add(new TemplateDO());
        Page<TemplateDO> mockPage = new PageImpl<>(templateDOS);
        when(templateService.getPageByNameLike(anyString(), anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(mockPage);

        this.mockMvc.perform(MockMvcRequestBuilders.get("/template/page/name/{name}/{isDel}/{orderOption}", "Test", 0, 1)
                        .param("page", "0")
                        .param("size", "10"));

        verify(templateService, times(1)).getPageByNameLike("Test", 0, 1, 0, 10);
    }

}