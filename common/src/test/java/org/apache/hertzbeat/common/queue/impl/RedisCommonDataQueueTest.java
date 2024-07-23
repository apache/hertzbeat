package org.apache.hertzbeat.common.queue.impl;


import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import io.lettuce.core.resource.ClientResources;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.aspectj.lang.annotation.Before;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * test for {@link RedisCommonDataQueue}
 */

@ExtendWith(MockitoExtension.class)
class RedisCommonDataQueueTest {

	@Mock
	private RedisClient redisClient;

	@Mock
	private StatefulRedisConnection<String, String> connection;

	@Mock
	private RedisCommands<String, String> syncCommands;

	@Mock
	private ObjectMapper objectMapper;

	private CommonProperties commonProperties;

	private CommonProperties.RedisProperties redisProperties;

	private RedisCommonDataQueue redisCommonDataQueue;

	@BeforeEach
	public void setUp() {

		MockitoAnnotations.openMocks(this);

		commonProperties = mock(CommonProperties.class);
		redisProperties = mock(CommonProperties.RedisProperties.class);
		CommonProperties.DataQueueProperties dataQueueProperties = mock(CommonProperties.DataQueueProperties.class);

		when(commonProperties.getQueue()).thenReturn(dataQueueProperties);
		when(dataQueueProperties.getRedis()).thenReturn(redisProperties);

		when(redisProperties.getRedisHost()).thenReturn("localhost");
		when(redisProperties.getRedisPort()).thenReturn(6379);
		when(redisProperties.getMetricsDataQueueNameToAlerter()).thenReturn("metricsDataQueueToAlerter");
		when(redisProperties.getMetricsDataQueueNameToPersistentStorage()).thenReturn("metricsDataQueueToPersistentStorage");
		when(redisProperties.getMetricsDataQueueNameToRealTimeStorage()).thenReturn("metricsDataQueueToRealTimeStorage");
		when(redisProperties.getAlertsDataQueueName()).thenReturn("alertsDataQueue");

		try (MockedStatic<RedisClient> mockedRedisClient = mockStatic(RedisClient.class)) {
			mockedRedisClient.when(() -> RedisClient.create(any(ClientResources.class), any(RedisURI.class))).thenReturn(redisClient);

			when(redisClient.connect()).thenReturn(connection);
			when(connection.sync()).thenReturn(syncCommands);

			redisCommonDataQueue = new RedisCommonDataQueue(commonProperties);
		}
	}

	@Test
	public void testPollAlertsData() throws Exception {

		try (MockedStatic<RedisClient> mockedRedisClient = mockStatic(RedisClient.class)) {
			mockedRedisClient.when(() -> RedisClient.create(any(ClientResources.class), any(RedisURI.class))).thenReturn(redisClient);

			when(redisClient.connect()).thenReturn(connection);
			when(connection.sync()).thenReturn(syncCommands);

			redisCommonDataQueue = new RedisCommonDataQueue(commonProperties);
		}

		String alertJson = "{\"id\":\"1\",\"content\":\"Test Alert\"}";
		Alert expectedAlert = Alert.builder().id(1L).content("Test Alert").build();

		when(syncCommands.rpop("alertsDataQueueName")).thenReturn(alertJson);
		when(objectMapper.readValue(alertJson, Alert.class)).thenReturn(expectedAlert);

		Alert actualAlert = redisCommonDataQueue.pollAlertsData();

		assertEquals(expectedAlert, actualAlert);
	}

//	@Test
//	public void testPollMetricsDataToAlerter() throws Exception {
//		String metricsDataJson = "{\"id\":\"1\",\"value\":100}";
//		CollectRep.MetricsData expectedMetricsData = new CollectRep.MetricsData("1", 100);
//
//		when(syncCommands.rpop("metricsDataQueueNameToAlerter")).thenReturn(metricsDataJson);
//		when(objectMapper.readValue(metricsDataJson, CollectRep.MetricsData.class)).thenReturn(expectedMetricsData);
//
//		CollectRep.MetricsData actualMetricsData = redisCommonDataQueue.pollMetricsDataToAlerter();
//
//		assertEquals(expectedMetricsData, actualMetricsData);
//	}

//	@Test
//	public void testSendAlertsData() throws Exception {
//		Alert alert = new Alert("1", "Test Alert");
//		String alertJson = "{\"id\":\"1\",\"message\":\"Test Alert\"}";
//
//		when(objectMapper.writeValueAsString(alert)).thenReturn(alertJson);
//
//		redisCommonDataQueue.sendAlertsData(alert);
//
//		verify(syncCommands).lpush("alertsDataQueueName", alertJson);
//	}

//	@Test
//	public void testSendMetricsData() throws Exception {
//		CollectRep.MetricsData metricsData = new CollectRep.MetricsData("1", 100);
//		String metricsDataJson = "{\"id\":\"1\",\"value\":100}";
//
//		when(objectMapper.writeValueAsString(metricsData)).thenReturn(metricsDataJson);
//
//		redisCommonDataQueue.sendMetricsData(metricsData);
//
//		verify(syncCommands).lpush("metricsDataQueueNameToAlerter", metricsDataJson);
//		verify(syncCommands).lpush("metricsDataQueueNameToPersistentStorage", metricsDataJson);
//		verify(syncCommands).lpush("metricsDataQueueNameToRealTimeStorage", metricsDataJson);
//	}

	@Test
	public void testDestroy() {
		redisCommonDataQueue.destroy();

		verify(connection).close();
		verify(redisClient).shutdown();
	}

}