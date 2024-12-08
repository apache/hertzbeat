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

import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;

/**
 * <p>Used for writing data as Arrow and generating bytes that can be set in {@link org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData}.
 * <p>Before using ArrowVectorWriter, you should initialize {@link BufferAllocator} and {@link VectorSchemaRoot}
 * <p>ArrowVectorWriter can set value in any field that has been initialized and add field dynamically without concerning.
 */
public interface ArrowVectorWriter extends AutoCloseable {
    /**
     * Add field without checking if it is added before.
     * @param field field to be added
     */
    void addField(Metrics.Field field);

    /**
     * Add value to the given field name. Default value is {@link CommonConstants#NULL_VALUE} when value is null or blank.
     * @param fieldName fieldName
     * @param value value
     */
    void setValue(String fieldName, String value);

    /**
     * Set {@link CommonConstants#NULL_VALUE} to the given field name.
     * @param fieldName fieldName
     */
    void setNull(String fieldName);

    /**
     * Generate bytes arr
     * @return bytes arr
     */
    byte[] toByteArray();

    /**
     * Check if is empty.
     * @return If no data in ArrowVectorWriter, return true.
     */
    boolean isEmpty();

    /**
     * Close all resource. Especially {@link BufferAllocator} and {@link VectorSchemaRoot}
     */
    void close();
}
