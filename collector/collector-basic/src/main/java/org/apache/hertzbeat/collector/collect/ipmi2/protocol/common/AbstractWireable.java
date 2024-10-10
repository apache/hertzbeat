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

/**
 * Abstract wireable
 */
public abstract class AbstractWireable implements Wireable {

    public static byte setBits(byte b, int byteIndex, int byteMask, int byteValue) {
        byteMask <<= byteIndex;
        return (byte) ((b & ~byteMask) | ((byteValue << byteIndex) & byteMask));
    }

    public static byte setBits(byte b, int byteMask, int byteValue) {
        return setBits(b, 0, byteMask, byteValue);
    }

    public static byte setBits(byte b, int byteValue) {
        return setBits(b, 0, 0xff, byteValue);
    }

    public static byte getBits(byte b, int byteIndex, int byteMask) {
        return (byte) ((b >> byteIndex) & byteMask);
    }

    public static byte getBits(byte b, int byteMask) {
        return getBits(b, 0, byteMask);
    }

    public static void ignoreBytes(ByteBuffer buffer, int length) {
        for (int i = 0; i < length; i++) {
            buffer.get();
        }
    }

    public static void reservedBytes(ByteBuffer buffer, int length) {
        for (int i = 0; i < length; i++) {
            buffer.put((byte) 0);
        }
    }
}
