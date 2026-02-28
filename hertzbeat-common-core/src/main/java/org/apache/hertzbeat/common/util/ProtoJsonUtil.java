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

import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;

/**
 * protobuf json convert util
 */
@Slf4j
public final class ProtoJsonUtil {

    private static final JsonFormat.Printer PRINTER = JsonFormat.printer();
    private static final JsonFormat.Parser PARSER = JsonFormat.parser();

    private ProtoJsonUtil() {
    }

    /**
     * protobuf to json
     * @param proto protobuf
     * @return json
     */
    public static String toJsonStr(Message proto) {

        if (Objects.isNull(proto)) {
            log.error("proto is null");
            return null;
        }

        try {
            return PRINTER.print(proto);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * json to protobuf
     * @param json json str
     * @param builder proto instance builder
     * @return protobuf
     */
    public static Message toProtobuf(String json, Message.Builder builder) {

        if (Objects.isNull(json) || Objects.isNull(builder)) {
            log.error("json or builder is null");
            return null;
        }

        try {
            PARSER.merge(json, builder);
            return builder.build();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }
}
