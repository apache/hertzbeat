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

package org.apache.hertzbeat.common.entity.arrow.writer;

import com.google.common.collect.Maps;
import jakarta.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.vector.VarCharVector;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.ArrowVector;
import org.apache.hertzbeat.common.entity.job.Metrics;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * implementation of ArrowVectorWriter
 */
@Slf4j
public class ArrowVectorWriterImpl implements ArrowVectorWriter {
    private ArrowVector arrowVector;
    private Map<VarCharVector, AtomicInteger> vectorOffsetMap;
    private final AtomicInteger maxRowCount = new AtomicInteger(0);

    public ArrowVectorWriterImpl(ArrowVector arrowVector) {
        this.arrowVector = arrowVector;
        if (this.arrowVector.getSchemaRoot().getRowCount() > 0) {
            this.maxRowCount.set(this.arrowVector.getSchemaRoot().getRowCount());
        }
        this.vectorOffsetMap = Maps.newHashMap();
    }

    public static ArrowVectorWriter of(Collection<String> fields) {
        return new ArrowVectorWriterImpl(ArrowVector.of(fields));
    }

    public ArrowVectorWriterImpl(List<Metrics.Field> fields) {
        initResource(buildFieldList(fields), null);
    }

    @Override
    public void addField(Metrics.Field field) {
        this.arrowVector.addVector(buildField(field));
    }

    @Override
    public void setValue(String fieldName, String value) {
        Optional<VarCharVector> vectorOptional = this.arrowVector.getVector(fieldName);
        if (vectorOptional.isEmpty()) {
            return;
        }

        final VarCharVector varCharVector = vectorOptional.get();
        final AtomicInteger indexCounter = this.vectorOffsetMap.computeIfAbsent(varCharVector, v -> new AtomicInteger(0));
        setValueSafely(varCharVector, indexCounter, value);
    }

    @Override
    public void setNull(String fieldName) {
        setValue(fieldName, null);
    }

    @NotNull
    @Override
    public Map<String, String> getSchemaMetadata() {
        return this.arrowVector.getMetadata();
    }

    @Override
    public ArrowVector doWrite() {
        this.arrowVector.getSchemaRoot().setRowCount(maxRowCount.get());
        return this.arrowVector;
    }

    @Override
    public boolean isEmpty() {
        return this.maxRowCount.get() <= 0;
    }

    @Override
    public void close() {
        close(false);
    }

    public void close(boolean closeSource) {
        if (closeSource) {
            this.arrowVector.close();
        }
    }

    private void setValueSafely(VarCharVector vector, AtomicInteger indexCounter, String value) {
        if (vector.getValueCapacity() <= 0) {
            vector.allocateNew(3);
        }

        if (StringUtils.isBlank(value)) {
            vector.setSafe(indexCounter.getAndIncrement(), CommonConstants.NULL_VALUE.getBytes(StandardCharsets.UTF_8));
        } else {
            vector.setSafe(indexCounter.getAndIncrement(), value.getBytes(StandardCharsets.UTF_8));
        }

        if (indexCounter.get() > maxRowCount.get()) {
            maxRowCount.set(indexCounter.get());
        }
    }

    private List<Field> buildFieldList(List<Metrics.Field> fields) {
        return fields.stream()
                .map(ArrowVectorWriterImpl::buildField)
                .collect(Collectors.toList());
    }

    private static Field buildField(Metrics.Field field) {
        Map<String, String> metadata = Maps.newHashMapWithExpectedSize(3);
        metadata.put(MetricDataConstants.TYPE, String.valueOf(field.getType()));
        metadata.put(MetricDataConstants.LABEL, String.valueOf(field.isLabel()));
        if (field.getUnit() != null) {
            metadata.put(MetricDataConstants.UNIT, field.getUnit());
        }

        return new Field(field.getField(), new FieldType(true, new ArrowType.Utf8(), null, metadata), null);
    }

    private void initResource(List<Field> fieldList, Map<String, String> schemaMetadata) {
        this.arrowVector = new ArrowVector(fieldList, schemaMetadata);
        this.vectorOffsetMap = new HashMap<>();
    }
}
