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

package org.apache.hertzbeat.common.serialize;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.util.Map;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.table.ArrowTable;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.kafka.common.header.Headers;
import org.apache.kafka.common.serialization.Deserializer;

/**
 * kafka metrics data deserializer
 */
public class KafkaMetricsDataDeserializer implements Deserializer<CollectRep.MetricsData> {

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        Deserializer.super.configure(configs, isKey);
    }

    @Override
    public CollectRep.MetricsData deserialize(String s, byte[] bytes){
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes);
             ArrowStreamReader reader = new ArrowStreamReader(Channels.newChannel(in), new RootAllocator())) {
            VectorSchemaRoot root = reader.getVectorSchemaRoot();
            reader.loadNextBatch();
            return new CollectRep.MetricsData(new ArrowTable(root));
        } catch (IOException e) {
            throw new RuntimeException("Failed to deserialize Arrow table", e);
        }
    }

    @Override
    public CollectRep.MetricsData deserialize(String topic, Headers headers, byte[] data) {
        return Deserializer.super.deserialize(topic, headers, data);
    }

    @Override
    public void close() {
        Deserializer.super.close();
    }
}
