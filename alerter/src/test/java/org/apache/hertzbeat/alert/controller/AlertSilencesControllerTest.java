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

import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

/**
 * test case for {@link AlertSilencesController}
 */

@ExtendWith(MockitoExtension.class)
class AlertSilencesControllerTest {

	private MockMvc mockMvc;

	@Mock
	private AlertSilenceService alertSilenceService;

	private AlertSilence alertSilence;

	@InjectMocks
	private AlertSilencesController alertSilencesController;

	@BeforeEach
	void setUp() {

		this.mockMvc = standaloneSetup(alertSilencesController).build();

		alertSilence = AlertSilence
				.builder()
				.id(1L)
				.type((byte) 1)
				.name("Test Silence")
				.build();
	}

	@Test
	void testDeleteAlertDefines() throws Exception {

		doNothing().when(alertSilenceService).deleteAlertSilences(any());

		mockMvc.perform(delete("/api/alert/silences")
						.param("ids", "1,2,3")
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value((int) CommonConstants.SUCCESS_CODE));
	}

}
