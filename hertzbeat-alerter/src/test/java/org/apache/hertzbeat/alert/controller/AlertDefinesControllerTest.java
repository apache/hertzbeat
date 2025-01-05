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

package org.apache.hertzbeat.alert.controller;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Test case for {@link AlertDefinesController}
 * Test whether the data mocked at the mock is correct, and test whether the format of the returned data is correct
 */
@Disabled
@ExtendWith(MockitoExtension.class)
class AlertDefinesControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private AlertDefinesController alertDefinesController;

    @Mock
    AlertDefineService alertDefineService;

    // Parameters to avoid default values interference, default values have been replaced
    List<Long> ids = Stream.of(6565463543L, 6565463544L).collect(Collectors.toList());
    Byte priority = Byte.parseByte("1");
    String sort = "gmtCreate";
    String order = "asc";
    Integer pageIndex = 1;
    Integer pageSize = 7;

    // Parameter collection
    Map<String, Object> content = new HashMap<>();

    // Object for mock
    PageRequest pageRequest;

    // Since the specification is used in dynamic proxy, it cannot be mocked
    // Missing debugging parameters are ids, priority
    // The missing part has been manually output for testing

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.standaloneSetup(alertDefinesController).build();
        content.put("ids", ids);
        content.put("priority", priority);
        content.put("sort", sort);
        content.put("order", order);
        content.put("pageIndex", pageIndex);
        content.put("pageSize", pageSize);
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(content.get("order").toString()), content.get("sort").toString()));
        pageRequest = PageRequest.of((Integer) content.get("pageIndex"), (Integer) content.get("pageSize"), sortExp);
    }

    //    @Test
    // todo: fix this test
    void getAlertDefines() throws Exception {

        // Test the correctness of the mock
        // Although objects cannot be mocked, stubs can be stored using class files
        //        Mockito.when(alertDefineService.getAlertDefines(Mockito.any(Specification.class), Mockito.argThat(new ArgumentMatcher<PageRequest>() {
        //            @Override
        //            public boolean matches(PageRequest pageRequestMidden) {
        //                // There are three methods in the source code that need to be compared, namely getPageNumber(), getPageSize(), getSort()
        //                if(pageRequestMidden.getPageSize() == pageRequest.getPageSize() &&
        //                        pageRequestMidden.getPageNumber() == pageRequest.getPageNumber() &&
        //                        pageRequestMidden.getSort().equals(pageRequest.getSort())) {
        //                    return true;
        //                }
        //                return false;
        //            }
        //        }))).thenReturn(new PageImpl<AlertDefine>(new ArrayList<AlertDefine>()));
        AlertDefine define = AlertDefine.builder().id(9L).expr("x").times(1).build();
        Mockito.when(alertDefineService.getAlertDefines(null, null, null, "id", "desc", 1, 10)).thenReturn(new PageImpl<>(Collections.singletonList(define)));

        mockMvc.perform(MockMvcRequestBuilders.get(
                                "/api/alert/defines")
                        .param("ids", ids.toString().substring(1, ids.toString().length() - 1))
                        .param("priority", priority.toString())
                        .param("sort", sort)
                        .param("order", order)
                        .param("pageIndex", pageIndex.toString())
                        .param("pageSize", pageSize.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andExpect(jsonPath("$.data.content").value(new ArrayList<>()))
                .andExpect(jsonPath("$.data.pageable").value("INSTANCE"))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(0))
                .andExpect(jsonPath("$.data.last").value(true))
                .andExpect(jsonPath("$.data.number").value(0))
                .andExpect(jsonPath("$.data.size").value(0))
                .andExpect(jsonPath("$.data.first").value(true))
                .andExpect(jsonPath("$.data.numberOfElements").value(0))
                .andExpect(jsonPath("$.data.empty").value(true))
                .andExpect(jsonPath("$.data.sort.empty").value(true))
                .andExpect(jsonPath("$.data.sort.sorted").value(false))
                .andExpect(jsonPath("$.data.sort.unsorted").value(true))
                .andReturn();
    }

    @Test
    void deleteAlertDefines() throws Exception {
        this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/alert/defines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JsonUtil.toJson(ids)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
                .andReturn();
    }
}
