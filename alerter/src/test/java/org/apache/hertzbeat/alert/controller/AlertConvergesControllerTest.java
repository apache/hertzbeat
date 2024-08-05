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


import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.service.AlertConvergeService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertConverge;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;


/**
 * test case for {@link AlertConvergesController}
 */

@ExtendWith(MockitoExtension.class)
class AlertConvergesControllerTest {

	private MockMvc mockMvc;

	@Mock
	private AlertConvergeService alertConvergeService;

	@InjectMocks
	private AlertConvergesController alertConvergesController;

	private List<AlertConverge> alertConvergeList;

	@BeforeEach
	void setUp() {

		this.mockMvc = standaloneSetup(alertConvergesController).build();

		AlertConverge alertConverge1 = AlertConverge.builder()
				.name("Converge1")
				.id(1L)
				.build();

		AlertConverge alertConverge2 = AlertConverge.builder()
				.name("Converge2")
				.id(2L)
				.build();

		alertConvergeList = Arrays.asList(alertConverge1, alertConverge2);
	}

	@Test
	void testGetAlertConverges() throws Exception {

		Page<AlertConverge> alertConvergePage = new PageImpl<>(
				alertConvergeList,
				PageRequest.of(0, 8, Sort.by("id").descending()),
				alertConvergeList.size()
		);

		when(alertConvergeService.getAlertConverges(null, null, "id", "desc", 0, 8)).thenReturn(alertConvergePage);

		mockMvc.perform(get("/api/alert/converges")
						.param("pageIndex", "0")
						.param("pageSize", "8")
						.param("sort", "id")
						.param("order", "desc")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.content[0].id").value(1))
				.andExpect(jsonPath("$.data.content[0].name").value("Converge1"))
				.andExpect(jsonPath("$.data.content[1].id").value(2))
				.andExpect(jsonPath("$.data.content[1].name").value("Converge2"));
	}

	@Test
	void testDeleteAlertDefines() throws Exception {

		doNothing().when(alertConvergeService).deleteAlertConverges(eq(new HashSet<>(Arrays.asList(1L, 2L))));

		mockMvc.perform(delete("/api/alert/converges")
						.param("ids", "1,2")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
	}
}

