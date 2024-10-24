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

import org.apache.hertzbeat.templatehub.model.DO.TemplateDO;
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
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * Test case for {@link StarController}
 */
@ExtendWith(MockitoExtension.class)
class StarDOControllerTest {

    @InjectMocks
    private StarController starController;

    @Mock
    private StarService starService;

    @Mock
    private VersionService versionService;

    @Mock
    private TemplateService templateService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        this.mockMvc = standaloneSetup(starController).build();
    }

    @Test
    public void testGetAllVersionByUserStar_InvalidUserId() throws Exception {
        mockMvc.perform(get("/star/{user}", -1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testGetVersionPageByUserStar_ValidInput() throws Exception {
        List<TemplateDO> templateDOS = new ArrayList<>();
        templateDOS.add(new TemplateDO());
        Page<TemplateDO> templatePage = new PageImpl<>(templateDOS);

        when(starService.getPageByUserStar(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), anyInt())).thenReturn(templatePage);

        mockMvc.perform(get("/star/page/user/{user}", 1)
                        .param("page", "0")
                        .param("size", "10"));

        verify(starService,times(1)).getPageByUserStar(anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), anyInt());
    }

    @Test
    public void testGetVersionPageByUserStar_InvalidUserId() throws Exception {
        mockMvc.perform(get("/star/page/user/{user}", -1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15)); // Expect failure code
    }

    @Test
    public void testCancelStar_ValidInput() throws Exception {
        // Mock the service methods
        when(starService.cancelStarByUser(anyInt(), anyInt())).thenReturn(true);
//        when(versionService.cancelStarVersion(anyInt())).thenReturn(1);
        when(templateService.cancelStarTemplate(anyInt())).thenReturn(true);

        mockMvc.perform(post("/star/cancel/{user}", 1)
                        .param("versionId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
    }

    @Test
    public void testCancelStar_InvalidUserId() throws Exception {
        mockMvc.perform(post("/star/cancel/{user}", -1)
                        .param("versionId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testCancelStar_InvalidVersionId() throws Exception {
        mockMvc.perform(post("/star/cancel/{user}", 1)
                        .param("versionId", "-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testCancelStar_CancelStarServiceFailed() throws Exception {
        // Mock the service methods
        when(starService.cancelStarByUser(anyInt(), anyInt())).thenReturn(false);

        mockMvc.perform(post("/star/cancel/{user}", 1)
                        .param("versionId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testCancelStar_CancelVersionServiceFailed() throws Exception {
        // Mock the service methods
        when(starService.cancelStarByUser(anyInt(), anyInt())).thenReturn(true);
        when(templateService.cancelStarTemplate(anyInt())).thenReturn(false);

        mockMvc.perform(post("/star/cancel/{user}", 1)
                        .param("templateId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

    @Test
    public void testCancelStar_CancelTemplateServiceFailed() throws Exception {
        // Mock the service methods
        when(starService.cancelStarByUser(anyInt(), anyInt())).thenReturn(true);
        when(templateService.cancelStarTemplate(anyInt())).thenReturn(false);

        mockMvc.perform(post("/star/cancel/{user}", 1)
                        .param("versionId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(15));
    }

}