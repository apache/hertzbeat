package com.usthe.warehouse.store;

import com.usthe.common.entity.message.CollectRep;
import io.lettuce.core.codec.RedisCodec;
import lombok.extern.slf4j.Slf4j;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/**
 * MetricsData redis 序列化
 * @author tom
 * @date 2021/11/25 10:42
 */
@Slf4j
public class MetricsDataRedisCodec implements RedisCodec<String, CollectRep.MetricsData> {

    @Override
    public String decodeKey(ByteBuffer byteBuffer) {
        return new String(byteBuffer.array(), byteBuffer.position(), byteBuffer.limit(), StandardCharsets.UTF_8);
    }

    @Override
    public CollectRep.MetricsData decodeValue(ByteBuffer byteBuffer) {
        try {
            return CollectRep.MetricsData.parseFrom(byteBuffer);
        } catch (Exception e) {
            log.error(e.getMessage());
            return null;
        }
    }

    @Override
    public ByteBuffer encodeKey(String s) {
        return ByteBuffer.wrap(s.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public ByteBuffer encodeValue(CollectRep.MetricsData metricsData) {
        return ByteBuffer.wrap(metricsData.toByteArray());
    }
}
