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

package org.apache.hertzbeat.common.queue.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test for {@link RedisCommonDataQueue}.
 */

class RedisCommonDataQueueTest {

	@Mock
	private RedisClient redisClient;

	@Mock
	private StatefulRedisConnection<String, String> connection;

	@Mock
	private RedisCommands<String, String> syncCommands;

	@Mock
	private CommonProperties properties;

	@Mock
	private CommonProperties.DataQueueProperties queueProperties;

	@Mock
	private CommonProperties.RedisProperties redisProperties;

	private ObjectMapper objectMapper = new ObjectMapper();

	private RedisCommonDataQueue redisCommonDataQueue;

	@BeforeEach
	public void setUp() {

		MockitoAnnotations.initMocks(this);

		when(properties.getQueue()).thenReturn(queueProperties);
		when(queueProperties.getRedis()).thenReturn(redisProperties);
		when(redisProperties.getRedisHost()).thenReturn("localhost");
		when(redisProperties.getRedisPort()).thenReturn(6379);
		when(redisProperties.getMetricsDataQueueNameToAlerter()).thenReturn("metricsDataToAlerter");
		when(redisProperties.getMetricsDataQueueNameToPersistentStorage()).thenReturn("metricsDataToPersistentStorage");
		when(redisProperties.getMetricsDataQueueNameToRealTimeStorage()).thenReturn("metricsDataToRealTimeStorage");
		when(redisProperties.getAlertsDataQueueName()).thenReturn("alertsData");

		when(redisClient.connect()).thenReturn(connection);
		when(connection.sync()).thenReturn(syncCommands);

		redisCommonDataQueue = new RedisCommonDataQueue(properties);
	}

	@Test
	public void testPollAlertsData() throws Exception {

		String alertJson = "{\"message\": \"test alert\"}";
		when(syncCommands.rpop("alertsData")).thenReturn(alertJson);

		Alert alert = redisCommonDataQueue.pollAlertsData();

		assertNotNull(alert);
		assertEquals("test alert", alert.getContent());
	}

	@Test
	public void testSendAlertsData() throws Exception {

		Alert alert = Alert.builder()
				.content("test alert")
				.build();
		redisCommonDataQueue.sendAlertsData(alert);

		ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
		verify(syncCommands).lpush(eq("alertsData"), captor.capture());

		String alertJson = captor.getValue();
		Alert capturedAlert = objectMapper.readValue(alertJson, Alert.class);

		assertEquals(alert.getContent(), capturedAlert.getContent());
	}

	@Test
	public void testPollMetricsDataToAlerter() throws Exception {

		String metricsDataJson = "{\"data\": \"metrics data to alerter\"}";
		when(syncCommands.rpop("metricsDataToAlerter")).thenReturn(metricsDataJson);

		CollectRep.MetricsData metricsData = redisCommonDataQueue.pollMetricsDataToAlerter();

		assertNotNull(metricsData);
		assertEquals("metrics data to alerter", metricsData.getMetrics());
	}

	@Test
	public void testPollMetricsDataToPersistentStorage() throws Exception {

		String metricsDataJson = "{\"data\": \"metrics data to persistent storage\"}";
		when(syncCommands.rpop("metricsDataToPersistentStorage")).thenReturn(metricsDataJson);

		CollectRep.MetricsData metricsData = redisCommonDataQueue.pollMetricsDataToPersistentStorage();

		assertNotNull(metricsData);
		assertEquals("metrics data to persistent storage", metricsData.getMetrics());
	}

	@Test
	public void testPollMetricsDataToRealTimeStorage() throws Exception {

		String metricsDataJson = "{\"data\": \"metrics data to real time storage\"}";
		when(syncCommands.rpop("metricsDataToRealTimeStorage")).thenReturn(metricsDataJson);

		CollectRep.MetricsData metricsData = redisCommonDataQueue.pollMetricsDataToRealTimeStorage();

		assertNotNull(metricsData);
		assertEquals("metrics data to real time storage", metricsData.getMetrics());
	}

	@Test
	public void testSendMetricsData() throws Exception {

		CollectRep.MetricsData metricsData = CollectRep.MetricsData
				.newBuilder()
				.setMetrics("metrics data")
				.build();

		redisCommonDataQueue.sendMetricsData(metricsData);

		ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
		verify(syncCommands, times(1)).lpush(eq("metricsDataToAlerter"), captor.capture());
		verify(syncCommands, times(1)).lpush(eq("metricsDataToPersistentStorage"), captor.capture());
		verify(syncCommands, times(1)).lpush(eq("metricsDataToRealTimeStorage"), captor.capture());

		String metricsDataJson = captor.getValue();
		CollectRep.MetricsData capturedMetricsData = objectMapper.readValue(metricsDataJson, CollectRep.MetricsData.class);

		assertEquals(metricsData.getMetrics(), capturedMetricsData.getMetrics());
	}

}
