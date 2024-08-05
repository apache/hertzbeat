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

import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * Test case for {@link AlertDefinesController}
 * Test whether the data mocked at the mock is correct, and test whether the format of the returned data is correct
 */
@ExtendWith(MockitoExtension.class)
class AlertDefinesControllerTest {

	private MockMvc mockMvc;

	@InjectMocks
	private AlertDefinesController alertDefinesController;

	@Mock
	private AlertDefineService alertDefineService;

	private AlertDefine alertDefine;

	@BeforeEach
	void setUp() {

		this.mockMvc = standaloneSetup(alertDefinesController).build();

		alertDefine = AlertDefine.builder()
				.id(9L)
				.app("linux")
				.metric("disk")
				.field("usage")
				.expr("x")
				.times(1)
				.tags(new LinkedList<>())
				.build();
	}

	@Test
	void getAlertDefines() throws Exception {

        when(alertDefineService.getAlertDefines(List.of(1L), "Test", (byte) 1, "id", "desc", 1, 10))
                .thenReturn(new PageImpl<>(Collections.singletonList(alertDefine)));

		mockMvc.perform(MockMvcRequestBuilders.get(
								"/api/alert/defines")
						.param("ids", "1")
						.param("search", "Test")
                        .param("priority", "1")
						.param("sort", "id")
						.param("order", "desc")
						.param("pageIndex", "1")
						.param("pageSize", "10")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
				.andExpect(jsonPath("$.data.content[0].app").value("linux"))
				.andExpect(jsonPath("$.data.content[0].id").value("9"))
				.andExpect(jsonPath("$.data.content[0].metric").value("disk"))
				.andReturn();
	}

	@Test
	void deleteAlertDefines() throws Exception {

		this.mockMvc.perform(MockMvcRequestBuilders.delete("/api/alert/defines")
						.contentType(MediaType.APPLICATION_JSON)
						.content(JsonUtil.toJson(Collections.singletonList(1))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE))
				.andReturn();
	}

}
