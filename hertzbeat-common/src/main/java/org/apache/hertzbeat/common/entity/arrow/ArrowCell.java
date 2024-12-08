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
import org.apache.arrow.vector.table.Row;
import org.apache.arrow.vector.types.pojo.Field;

import java.util.Map;

/**
 * A cell consisting of {@link Field} and value
 */
@Data
public class ArrowCell {
    private final String value;
    private final Field field;
    private final Map<String, String> metadata;

    public ArrowCell(Field field, Row row) {
        this.field = field;
        this.value = row.getVarCharObj(field.getName());
        this.metadata = field.getMetadata();
    }

    public String getStringMetaData(String key) {
        return metadata.get(key);
    }

    public Boolean getBooleanMetaData(String key) {
        return Boolean.parseBoolean(metadata.get(key));
    }

    public Byte getByteMetaData(String key) {
        return Byte.parseByte(metadata.get(key));
    }

    public Integer getIntMetaData(String key) {
        return Integer.parseInt(metadata.get(key));
    }
}
