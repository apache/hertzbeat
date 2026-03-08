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

import java.util.Map;

/**
 * implementation of MetadataOperator
 */
public class DefaultMetadataReader implements MetadataReader {
    protected Map<String, String> metadata;

    @Override
    public String getMetadataAsString(String key) {
        return metadata.get(key);
    }

    @Override
    public Boolean getMetadataAsBoolean(String key) {
        return Boolean.parseBoolean(metadata.get(key));
    }

    @Override
    public Byte getMetadataAsByte(String key) {
        return Byte.parseByte(metadata.get(key));
    }

    @Override
    public Integer getMetadataAsInteger(String key) {
        return Integer.parseInt(metadata.get(key));
    }

    @Override
    public Long getMetadataAsLong(String key) {
        return Long.parseLong(metadata.get(key));
    }
}
