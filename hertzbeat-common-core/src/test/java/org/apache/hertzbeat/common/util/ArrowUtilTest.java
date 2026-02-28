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

import com.google.common.collect.Lists;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.BigIntVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.arrow.vector.types.pojo.Schema;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Test case for {@link ArrowUtil}
 */
class ArrowUtilTest {

    @Test
    void testSerializeAndDeserializeMultipleRoots() {
        RootAllocator allocator = new RootAllocator();
        List<VectorSchemaRoot> roots = new ArrayList<>();

        // Create first root
        Field field1 = new Field("field1", FieldType.nullable(new ArrowType.Int(64, true)), null);
        Schema schema1 = new Schema(Collections.singletonList(field1));
        VectorSchemaRoot root1 = VectorSchemaRoot.create(schema1, allocator);
        BigIntVector vector1 = (BigIntVector) root1.getVector("field1");
        vector1.allocateNew(10);
        vector1.setSafe(0, 100L);
        vector1.setValueCount(1);
        root1.setRowCount(1);
        roots.add(root1);

        // Create second root
        Field field2 = new Field("field2", FieldType.nullable(new ArrowType.Int(64, true)), null);
        Schema schema2 = new Schema(Collections.singletonList(field2));
        VectorSchemaRoot root2 = VectorSchemaRoot.create(schema2, allocator);
        BigIntVector vector2 = (BigIntVector) root2.getVector("field2");
        vector2.allocateNew(10);
        vector2.setSafe(0, 200L);
        vector2.setValueCount(1);
        root2.setRowCount(1);
        roots.add(root2);

        // Serialize
        byte[] data = ArrowUtil.serializeMultipleRoots(roots);
        // Deserialize
        List<VectorSchemaRoot> deserializedRoots = ArrowUtil.deserializeMultipleRoots(data);

        Assertions.assertEquals(2, deserializedRoots.size());
        VectorSchemaRoot resultRoot1 = deserializedRoots.get(0);
        Assertions.assertEquals(1, resultRoot1.getRowCount());
        Assertions.assertEquals(100L, ((BigIntVector) resultRoot1.getVector("field1")).get(0));
        VectorSchemaRoot resultRoot2 = deserializedRoots.get(1);
        Assertions.assertEquals(1, resultRoot2.getRowCount());
        Assertions.assertEquals(200L, ((BigIntVector) resultRoot2.getVector("field2")).get(0));

        // Cleanup
        roots.forEach(VectorSchemaRoot::close);
        deserializedRoots.forEach(VectorSchemaRoot::close);
        allocator.close();
    }

    @Test
    void testSerializeAndDeserializeMetricsData() {
        CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
            .setId(1L)
            .setApp("linux")
            .setMetrics("cpu")
            .setTime(System.currentTimeMillis())
            .addField(CollectRep.Field.newBuilder().setName("usage").setType(1).build())
            .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("50.5").build())
            .build();
        CollectRep.MetricsData metricsData1 = CollectRep.MetricsData.newBuilder()
            .setId(1L)
            .setApp("linux_1")
            .setMetrics("cpu")
            .setTime(System.currentTimeMillis())
            .addField(CollectRep.Field.newBuilder().setName("usage").setType(1).build())
            .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("60.5").build())
            .build();
        List<CollectRep.MetricsData> list = Lists.newArrayList(metricsData, metricsData1);

        // Serialize
        byte[] data = ArrowUtil.serializeMetricsData(list);
        // Deserialize
        List<CollectRep.MetricsData> deserializedList = ArrowUtil.deserializeMetricsData(data);

        Assertions.assertEquals(2, deserializedList.size());
        CollectRep.MetricsData result = deserializedList.get(0);
        Assertions.assertEquals("linux", result.getApp());
        Assertions.assertEquals(1, result.getValues().size());
        Assertions.assertEquals("50.5", result.getValues().get(0).getColumns(0));

        result = deserializedList.get(1);
        Assertions.assertEquals("linux_1", result.getApp());
        Assertions.assertEquals(1, result.getValues().size());
        Assertions.assertEquals("60.5", result.getValues().get(0).getColumns(0));
    }
}
