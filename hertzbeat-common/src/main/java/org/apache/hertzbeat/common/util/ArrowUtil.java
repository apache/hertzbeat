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

package org.apache.hertzbeat.common.util;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Arrow data serialization and deserialization utility class
 */
@Slf4j
public final class ArrowUtil {
    
    private ArrowUtil() {
    }

    /**
     * Serialize multiple VectorSchemaRoots into a byte array
     * The serialization process:
     * 1. Write the number of roots as an integer
     * 2. For each root, serialize its content using ArrowStreamWriter
     *
     * @param roots List of VectorSchemaRoot to be serialized
     * @return serialized byte array
     */
    public static byte[] serializeMultipleRoots(List<VectorSchemaRoot> roots) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             DataOutputStream dataOut = new DataOutputStream(out)) {
            
            dataOut.writeInt(roots.size());
            for (VectorSchemaRoot root : roots) {
                ArrowStreamWriter writer = new ArrowStreamWriter(
                        root,
                        null,
                        Channels.newChannel(out));
                writer.start();
                writer.writeBatch();
                writer.end();
                writer.close();
                root.close();
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to serialize multiple VectorSchemaRoots", e);
        }
    }

    /**
     * Deserialize multiple VectorSchemaRoots from a byte array
     * The deserialization process:
     * 1. Read the number of roots from the first integer
     * 2. Create a single RootAllocator for memory management
     * 3. Deserialize each root using ArrowStreamReader
     *
     * @param data byte array containing serialized VectorSchemaRoots
     * @return List of deserialized VectorSchemaRoot objects
     * @throws RuntimeException if deserialization fails
     */
    public static List<VectorSchemaRoot> deserializeMultipleRoots(byte[] data) {
        List<VectorSchemaRoot> roots = new ArrayList<>();
        try (ByteArrayInputStream in = new ByteArrayInputStream(data);
             DataInputStream dataIn = new DataInputStream(in)) {
            
            int rootCount = dataIn.readInt();
            RootAllocator allocator = new RootAllocator();
            
            for (int i = 0; i < rootCount; i++) {
                ArrowStreamReader reader = new ArrowStreamReader(
                        Channels.newChannel(in),
                        allocator);
                VectorSchemaRoot root = reader.getVectorSchemaRoot();
                reader.loadNextBatch();
                roots.add(root);
            }
            return roots;
        } catch (IOException e) {
            roots.forEach(VectorSchemaRoot::close);
            throw new RuntimeException("Failed to deserialize multiple VectorSchemaRoots", e);
        }
    }

    /**
     * Deserialize a list of MetricsData from a byte array
     * The process:
     * 1. Check for null or empty input
     * 2. Deserialize VectorSchemaRoots
     * 3. Convert each valid root to MetricsData
     * 4. Ensure proper resource cleanup
     *
     * @param data byte array containing serialized metrics data
     * @return List of MetricsData objects
     */
    public static List<CollectRep.MetricsData> deserializeMetricsData(byte[] data) {
        if (data == null || data.length == 0) {
            return new ArrayList<>();
        }
        List<VectorSchemaRoot> roots = deserializeMultipleRoots(data);
        List<CollectRep.MetricsData> metricsDataList = new ArrayList<>(roots.size());
        try {
            for (VectorSchemaRoot root : roots) {
                if (root != null) {
                    CollectRep.MetricsData metricsData = new CollectRep.MetricsData(root);
                    metricsDataList.add(metricsData);
                }
            }
        } finally {
            roots.forEach(VectorSchemaRoot::close);
        }
        return metricsDataList;
    }

    /**
     * Serialize a list of MetricsData into a byte array
     * The process:
     * 1. Convert each MetricsData to VectorSchemaRoot
     * 2. Serialize all roots into a single byte array
     *
     * @param metricsDataList List of MetricsData to be serialized
     * @return serialized byte array
     */
    public static byte[] serializeMetricsData(List<CollectRep.MetricsData> metricsDataList) {
        List<VectorSchemaRoot> roots = new ArrayList<>(metricsDataList.size());
        for (CollectRep.MetricsData metricsData : metricsDataList) {
            VectorSchemaRoot root = metricsData.toVectorSchemaRootAndRelease();
            roots.add(root);
        }
        return serializeMultipleRoots(roots);
    }
    
}
