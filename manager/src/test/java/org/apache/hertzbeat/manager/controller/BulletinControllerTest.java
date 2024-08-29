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
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.manager.service.BulletinService;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link BulletinController}
 */
@ExtendWith(MockitoExtension.class)
class BulletinControllerTest {
    private MockMvc mockMvc;

    @InjectMocks
    private BulletinController bulletinController;
    @Mock
    private BulletinService bulletinService;
    @Mock
    private RealTimeDataReader realTimeDataReader;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(bulletinController).build();
    }

    @Test
    void testAddNewBulletin() throws Exception {
        BulletinDto bulletinDto = new BulletinDto();
        doAnswer(invocation -> {
            throw new IllegalArgumentException("Invalid bulletin");
        }).when(bulletinService).validate(bulletinDto);

        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/bulletin")
                .contentType("application/json")
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));

        doAnswer(invocation -> {
            return null;
        }).when(bulletinService).validate(bulletinDto);
        doAnswer(invocation -> {
            return null;
        }).when(bulletinService).addBulletin(bulletinDto);
        this.mockMvc.perform(MockMvcRequestBuilders.post("/api/bulletin")
                .contentType("application/json")
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void testEditBulletin() throws Exception {
        BulletinDto bulletinDto = new BulletinDto();
        doAnswer(invocation -> {
            throw new IllegalArgumentException("Invalid bulletin");
        }).when(bulletinService).validate(bulletinDto);

        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/bulletin")
                .contentType("application/json")
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));

        doAnswer(invocation -> {
            return null;
        }).when(bulletinService).validate(bulletinDto);
        doAnswer(invocation -> {
            return null;
        }).when(bulletinService).editBulletin(bulletinDto);
        this.mockMvc.perform(MockMvcRequestBuilders.put("/api/bulletin")
                .contentType("application/json")
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void testGetBulletinByName() throws Exception {
        Mockito.when(bulletinService.getBulletinByName(any(String.class))).thenReturn(null);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/bulletin/{name}", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));

        Mockito.when(bulletinService.getBulletinByName(any(String.class))).thenThrow(new RuntimeException("test"));
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/bulletin/{name}", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));
    }

    @Test
    void testGetAllNames() throws Exception {
        List<String> names = new ArrayList<String>();
        names.add("one");
        names.add("two");
        Mockito.when(bulletinService.getAllNames()).thenReturn(names);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/bulletin/names"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("one"))
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }

    @Test
    void testDeleteBulletinByName() throws Exception {
        Mockito.doNothing().when(bulletinService).deleteBulletinByName(any(List.class));
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/bulletin")
                .param("names", "one"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));

        // will throw exception
        Mockito.doThrow(new RuntimeException("test")).when(bulletinService).deleteBulletinByName(any(List.class));
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/bulletin")
                .param("names", "one"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));
    }

    @Test
    void testGetAllMetricsData() throws Exception {
        // server is not available
        Mockito.when(realTimeDataReader.isServerAvailable()).thenReturn(false);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/bulletin/metrics")
                .param("name", "test")
                .param("pageIndex", "0")
                .param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.FAIL_CODE));

        // normal
        Bulletin bulletin = new Bulletin();
        BulletinMetricsData data = new BulletinMetricsData();
        data.setName("sample");
        Mockito.when(realTimeDataReader.isServerAvailable()).thenReturn(true);
        Mockito.when(bulletinService.getBulletinByName(any(String.class)))
                .thenReturn(bulletin);
        Mockito.when(bulletinService.buildBulletinMetricsData(any(BulletinMetricsData.BulletinMetricsDataBuilder.class), any(Bulletin.class)))
            .thenReturn(data);
        this.mockMvc.perform(MockMvcRequestBuilders.get("/api/bulletin/metrics")
            .param("name", "test")
            .param("pageIndex", "0")
            .param("pageSize", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("sample"))
            .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
    }
}
