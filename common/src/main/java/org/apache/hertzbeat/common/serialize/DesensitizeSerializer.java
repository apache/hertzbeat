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

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import org.apache.hertzbeat.common.util.DesensitizedUtil;

import java.io.IOException;

/**
 * desensitization Serializes sensitive field
 */
public class DesensitizeSerializer {

    private DesensitizeSerializer() {}

    /**
     * desensitization Serializes mobile phone field
     */
    public static class PhoneSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.MOBILE_PHONE));
        }
    }

    /**
     * desensitization Serializes email field
     */
    public static class EmailSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.EMAIL));
        }
    }

    /**
     * desensitization Serializes password field
     */
    public static class PasswordSerializer extends JsonSerializer<String> {

        @Override
        public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
            jsonGenerator.writeString(DesensitizedUtil.desensitized(s, DesensitizedUtil.DesensitizedType.PASSWORD));
        }
    }
}
