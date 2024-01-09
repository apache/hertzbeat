package org.dromara.hertzbeat.collector.collect.redis;

import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.RedisProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;


/**
 * Test case for {@link RedisCommonCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
class RedisSingleCollectImplTest {


    @Mock
    private RedisProtocol redisProtocol;

    @InjectMocks
    private RedisCommonCollectImpl redisSingleCollect;

    @BeforeEach
    void setUp() {
        redisProtocol = RedisProtocol.builder()
                .host("192.168.77.100")
                .port("26379")
                .pattern("1")
                .build();
    }

    @Test
    void getInstance() {
    }

    @Test
    void collect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("used_cpu_sys");
        Metrics metrics = new Metrics();
        metrics.setRedis(redisProtocol);
        metrics.setAliasFields(aliasField);
        redisSingleCollect.collect(builder, 1L, "test", metrics);
    }
}
