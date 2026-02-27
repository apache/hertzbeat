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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.common;

import java.nio.ByteBuffer;
import com.google.common.primitives.UnsignedBytes;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  IPMI code
 */
public class IpmiCode {

    /**
     * IPMI code
     */
    public interface Code {
        byte getCode();

        default String getDescription() {
            return "No description";
        }
    }

    public static <T extends Enum<T> & IpmiCode.Code> T fromByte(Class<T> type, byte code) {
        for (T value : type.getEnumConstants()) {
            if (value.getCode() == code) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown " + type.getSimpleName() + " code 0x" + UnsignedBytes.toString(code, 16));
    }

    public static <T extends Enum<T> & IpmiCode.Code> T fromInt(Class<T> type, int code) {
        return fromByte(type, ByteConvertUtils.checkCastByte(code));
    }

    public static <T extends Enum<T> & IpmiCode.Code> T fromBuffer(Class<T> type, ByteBuffer buffer) {
        return fromByte(type, buffer.get());
    }

    public static <T extends Enum<T> & IpmiCode.Code> T fromBufferWithMask(Class<T> type, ByteBuffer buffer, int mask) {
        return fromByte(type, (byte) (buffer.get() & mask));
    }

}
