package org.apache.hertzbeat.collector.dispatch.export;

import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * test for {@link NettyDataQueue}
 */

class NettyDataQueueTest {

	@Mock
	private CollectJobService collectJobService;

	@InjectMocks
	private NettyDataQueue nettyDataQueue;

	@BeforeEach
	public void setUp() {

		MockitoAnnotations.openMocks(this);
	}

	@Test
	void testSendMetricsData() {

		CollectRep.MetricsData metricsData = CollectRep.MetricsData
				.newBuilder()
				.setMetrics("test")
				.build();
		nettyDataQueue.sendMetricsData(metricsData);

		verify(collectJobService, times(1)).sendAsyncCollectData(metricsData);
	}

}
