package org.apache.hertzbeat.common.queue.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.hubspot.jackson.datatype.protobuf.ProtobufModule;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * test for {@link RedisCommonDataQueue}
 */
class RedisCommonDataQueueTest {

	private static GenericContainer<?> redisContainer;
	private RedisCommonDataQueue redisCommonDataQueue;
	private RedisClient redisClient;
	private StatefulRedisConnection<String, String> connection;
	private RedisCommands<String, String> syncCommands;
	private ObjectMapper objectMapper;

	@BeforeAll
	public static void startContainer() {

		redisContainer = new GenericContainer<>(
				DockerImageName.parse("redis:latest"))
				.withExposedPorts(6379);

		redisContainer.start();
	}

	@BeforeEach
	public void setUp() {

		String address = redisContainer.getHost();
		Integer port = redisContainer.getFirstMappedPort();

		CommonProperties properties = new CommonProperties();
		CommonProperties.DataQueueProperties queueProperties = new CommonProperties.DataQueueProperties();
		CommonProperties.RedisProperties redisProperties = new CommonProperties.RedisProperties();
		redisProperties.setRedisHost(address);
		redisProperties.setRedisPort(port);
		redisProperties.setMetricsDataQueueNameToAlerter("metricsDataQueueToAlerter");
		redisProperties.setMetricsDataQueueNameToPersistentStorage("metricsDataQueueToPersistentStorage");
		redisProperties.setMetricsDataQueueNameToRealTimeStorage("metricsDataQueueToRealTimeStorage");
		redisProperties.setAlertsDataQueueName("alertsDataQueue");
		queueProperties.setRedis(redisProperties);
		properties.setQueue(queueProperties);

		redisCommonDataQueue = new RedisCommonDataQueue(properties);

		RedisURI redisURI = RedisURI.builder()
				.withHost(redisProperties.getRedisHost())
				.withPort(redisProperties.getRedisPort())
				.build();

		redisClient = RedisClient.create(redisURI);
		connection = redisClient.connect();
		syncCommands = connection.sync();

		objectMapper = new ObjectMapper()
				.registerModule(new ProtobufModule())
				.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
				.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
				.configure(SerializationFeature.FAIL_ON_SELF_REFERENCES, false);
	}

	@AfterEach
	public void tearDown() {

		connection.close();
		redisClient.shutdown();
	}

	@AfterAll
	public static void stopContainer() {

		redisContainer.stop();
	}

	@Test
	 void testPollAlertsData() {

		String alertJson = "{\"content\":\"testAlert\"}";
		syncCommands.lpush("alertsDataQueue", alertJson);

		Alert alert = redisCommonDataQueue.pollAlertsData();
		assertNotNull(alert);
		assertEquals("testAlert", alert.getContent());
	}

	@Test
	void testPollMetricsDataToAlerter() {

		String metricsDataJson = "{\"metrics\":\"testMetric\"}";
		syncCommands.lpush("metricsDataQueueToAlerter", metricsDataJson);

		CollectRep.MetricsData metricsData = redisCommonDataQueue.pollMetricsDataToAlerter();

		assertNotNull(metricsData);
		assertEquals("testMetric", metricsData.getMetrics());
	}

	@Test
	public void testSendAlertsData() throws JsonProcessingException {

		Alert alert = Alert.builder()
				.content("testAlert")
				.build();

		redisCommonDataQueue.sendAlertsData(alert);

		String result = syncCommands.rpop("alertsDataQueue");
		assertNotNull(result);

		Alert resultAlert = objectMapper.readValue(result, Alert.class);
		assertEquals("testAlert", resultAlert.getContent());
	}

	@Test
	public void testSendMetricsData() throws Exception {

		CollectRep.MetricsData metricsData = CollectRep.MetricsData
				.newBuilder()
				.setMetrics("testMetric")
				.build();

		redisCommonDataQueue.sendMetricsData(metricsData);
		String resultToAlerter = syncCommands.rpop("metricsDataQueueToAlerter");
		String resultToPersistentStorage = syncCommands.rpop("metricsDataQueueToPersistentStorage");
		String resultToRealTimeStorage = syncCommands.rpop("metricsDataQueueToRealTimeStorage");

		assertNotNull(resultToAlerter);
		assertNotNull(resultToPersistentStorage);
		assertNotNull(resultToRealTimeStorage);

		CollectRep.MetricsData resultMetricsDataToAlerter = objectMapper.readValue(resultToAlerter, CollectRep.MetricsData.class);
		CollectRep.MetricsData resultMetricsDataToPersistentStorage = objectMapper.readValue(resultToPersistentStorage, CollectRep.MetricsData.class);
		CollectRep.MetricsData resultMetricsDataToRealTimeStorage = objectMapper.readValue(resultToRealTimeStorage, CollectRep.MetricsData.class);

		assertEquals("testMetric", resultMetricsDataToAlerter.getMetrics());
		assertEquals("testMetric", resultMetricsDataToPersistentStorage.getMetrics());
		assertEquals("testMetric", resultMetricsDataToRealTimeStorage.getMetrics());
	}

	@Test
	public void testDestroy() {

		redisCommonDataQueue.destroy();
		assertTrue(connection.isOpen());
		assertTrue(redisClient.connect().isOpen());
	}

}
