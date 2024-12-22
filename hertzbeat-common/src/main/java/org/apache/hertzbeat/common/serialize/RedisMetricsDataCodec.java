package org.apache.hertzbeat.common.serialize;

import io.lettuce.core.codec.RedisCodec;
import io.netty.buffer.Unpooled;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.arrow.vector.table.ArrowTable;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * redis metrics data codec
 */
@Slf4j
public class RedisMetricsDataCodec implements RedisCodec<String, CollectRep.MetricsData> {

    @Override
    public String decodeKey(ByteBuffer byteBuffer) {
        return Unpooled.wrappedBuffer(byteBuffer).toString(StandardCharsets.UTF_8);
    }

    @Override
    public CollectRep.MetricsData decodeValue(ByteBuffer byteBuffer) {
        try (ByteArrayInputStream in = new ByteArrayInputStream(byteBuffer.array());
             ArrowStreamReader reader = new ArrowStreamReader(Channels.newChannel(in), new RootAllocator())) {
            VectorSchemaRoot root = reader.getVectorSchemaRoot();
            reader.loadNextBatch();
            return new CollectRep.MetricsData(new ArrowTable(root));
        } catch (IOException e) {
            throw new RuntimeException("Failed to deserialize Arrow table", e);
        }
    }

    @Override
    public ByteBuffer encodeKey(String s) {
        return ByteBuffer.wrap(s.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public ByteBuffer encodeValue(CollectRep.MetricsData metricsData) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             VectorSchemaRoot root = metricsData.toVectorSchemaRoot();
             ArrowStreamWriter writer = new ArrowStreamWriter(root,
                     null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            return ByteBuffer.wrap(out.toByteArray());
        } catch (IOException e) {
            log.error("sendMetricsData error", e);
        }
        return null;
    }
}
