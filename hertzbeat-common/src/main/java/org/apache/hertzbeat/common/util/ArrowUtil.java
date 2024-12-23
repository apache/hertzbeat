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
 * protobuf json convert util
 */
@Slf4j
public final class ArrowUtil {
    

    private ArrowUtil() {
    }

    /**
     * Serialize multi VectorSchemaRoot to a byte array
     * @param roots VectorSchemaRoot
     * @return byte array
     */
    public static byte[] serializeMultipleRoots(List<VectorSchemaRoot> roots) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            DataOutputStream dataOut = new DataOutputStream(out);
            dataOut.writeInt(roots.size());
            for (VectorSchemaRoot root : roots) {
                try (ArrowStreamWriter writer = new ArrowStreamWriter(
                        root,
                        null,
                        Channels.newChannel(out))) {
                    writer.start();
                    writer.writeBatch();
                    writer.end();
                }
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to serialize multiple VectorSchemaRoots", e);
        }
    }

    /**
     * Deserialize multiple VectorSchemaRoots from a byte array
     * @param data byte array
     * @return List of VectorSchemaRoot
     */
    public static List<VectorSchemaRoot> deserializeMultipleRoots(byte[] data) {
        try (ByteArrayInputStream in = new ByteArrayInputStream(data)) {
            DataInputStream dataIn = new DataInputStream(in);
            int rootCount = dataIn.readInt();

            List<VectorSchemaRoot> roots = new ArrayList<>(rootCount);
            
            for (int i = 0; i < rootCount; i++) {
                try (ArrowStreamReader reader = new ArrowStreamReader(
                        Channels.newChannel(in),
                        new RootAllocator())) {
                    VectorSchemaRoot root = reader.getVectorSchemaRoot();
                    reader.loadNextBatch();
                    roots.add(root);
                }
            }
            return roots;
        } catch (IOException e) {
            throw new RuntimeException("Failed to deserialize multiple VectorSchemaRoots", e);
        }
    }

    /**
     * Deserialize MetricsData list from a byte array
     * @param data byte array
     * @return List of MetricsData
     */
    public static List<CollectRep.MetricsData> deserializeMetricsData(byte[] data) {
        List<VectorSchemaRoot> roots = deserializeMultipleRoots(data);
        List<CollectRep.MetricsData> metricsDataList = new ArrayList<>(roots.size());
        for (VectorSchemaRoot root : roots) {
            CollectRep.MetricsData metricsData = new CollectRep.MetricsData(root);
            metricsDataList.add(metricsData);
        }
        return metricsDataList;
    }

    /**
     * Serialize MetricsData list to a byte array
     * @param metricsDataList List of MetricsData
     * @return byte array
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
