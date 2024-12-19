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

package org.apache.hertzbeat.common.entity.arrow;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.VarCharVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.arrow.vector.types.pojo.Schema;
import org.apache.hertzbeat.common.entity.arrow.reader.DefaultMetadataReader;
import org.apache.hertzbeat.common.util.CommonUtil;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 */
@Data
@Slf4j
@EqualsAndHashCode(callSuper = true)
public class ArrowVector extends DefaultMetadataReader implements AutoCloseable {
    private final BufferAllocator bufferAllocator;
    private VectorSchemaRoot schemaRoot;
    private final Schema schema;

    public ArrowVector(BufferAllocator bufferAllocator, VectorSchemaRoot schemaRoot) {
        this.bufferAllocator = bufferAllocator;
        this.schemaRoot = schemaRoot;
        this.schema = schemaRoot.getSchema();
        this.metadata = schema.getCustomMetadata();
    }

    public ArrowVector(List<Field> fieldList, Map<String, String> schemaMetadata) {
        this.schema = new Schema(fieldList, schemaMetadata == null ? new HashMap<>() : schemaMetadata);

        this.bufferAllocator = new RootAllocator();
        this.schemaRoot = VectorSchemaRoot.create(schema, bufferAllocator);
        this.metadata = schema.getCustomMetadata();
    }

    public static ArrowVector empty() {
        return new ArrowVector(new ArrayList<>(), null);
    }

    public static ArrowVector of(Collection<String> fields) {
        return new ArrowVector(convertField(fields), null);
    }

    public static ArrowVector fromByteArr(byte[] bytes) {
        BufferAllocator bufferAllocator = new RootAllocator();
        try (ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(bytes);
             ArrowStreamReader arrowStreamReader = new ArrowStreamReader(byteArrayInputStream, bufferAllocator)) {
            arrowStreamReader.loadNextBatch();
            VectorSchemaRoot schemaRoot = arrowStreamReader.getVectorSchemaRoot();

            return new ArrowVector(bufferAllocator, schemaRoot);
        } catch (IOException e) {
            log.error("Failed to read arrow stream...", e);
            throw new RuntimeException(e);
        }
    }

    public void addVector(Field field) {
        this.schemaRoot = this.schemaRoot.addVector(this.schemaRoot.getFieldVectors().size(), new VarCharVector(field, this.bufferAllocator));
    }

    public Optional<VarCharVector> getVector(String fieldName) {
        return Optional.ofNullable((VarCharVector) schemaRoot.getVector(fieldName));
    }

    public Map<String, String> getMetadata() {
        return schema.getCustomMetadata();
    }

    public Map<String, String> getFieldMetadata(String fieldName) {
        Optional<VarCharVector> vector = getVector(fieldName);
        if (vector.isEmpty()) {
            return new HashMap<>();
        }

        return vector.get().getField().getMetadata();
    }

    public byte[] toByteArray() {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ArrowStreamWriter writer = new ArrowStreamWriter(schemaRoot, null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();

            return out.toByteArray();
        } catch (IOException e) {
            log.error("Arrow vector to byte arr failed: {}", CommonUtil.getMessageFromThrowable(e), e);
        }

        return new byte[0];
    }

    @Override
    public void close() {
        if (schemaRoot != null) {
            this.schemaRoot.close();
        }
        if (bufferAllocator != null) {
            this.bufferAllocator.close();
        }
    }

    private static List<Field> convertField(Collection<String> fields) {
        return fields.stream()
                .map(field -> new Field(field, new FieldType(true, new ArrowType.Utf8(), null, null), null))
                .collect(Collectors.toList());
    }
}
