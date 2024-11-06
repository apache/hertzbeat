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

package org.apache.hertzbeat.collector.collect.ipmi2.utils;

import java.nio.ByteBuffer;

/**
 * Byte order read and write utils
 */
public class ByteOrderUtils {
    public static long readLeLong(ByteBuffer buffer) {
        long value = 0;
        for (int i = 0; i < Long.BYTES; i++) {
            value |= ((long) buffer.get()) << (i * 8);
        }
        return value;
    }

    public static void writeLeLong(ByteBuffer buffer, long value) {
        for (int i = 0; i < Long.BYTES; i++) {
            buffer.put((byte) (value >> (i * 8)));
        }
    }

    public static int readLeInt(ByteBuffer buffer) {
        int value = 0;
        for (int i = 0; i < Integer.BYTES; i++) {
            value |= (buffer.get() & 0xFF) << (i * 8);
        }
        return value;
    }

    public static void writeLeInt(ByteBuffer buffer, int value) {
        for (int i = 0; i < Integer.BYTES; i++) {
            buffer.put((byte) (value >> (i * 8)));
        }
    }

    public static char readLeChar(ByteBuffer buffer) {
        char value = 0;
        for (int i = 0; i < Character.BYTES; i++) {
            value |= ((char) buffer.get()) << (i * 8);
        }
        return value;
    }

    public static void writeLeChar(ByteBuffer buffer, char value) {
        for (int i = 0; i < Character.BYTES; i++) {
            buffer.put((byte) (value >> (i * 8)));
        }
    }

    public static byte[] readBytes(ByteBuffer buffer, int size) {
        byte[] bytes = new byte[size];
        buffer.get(bytes);
        return bytes;
    }

    public static void writeBytes(ByteBuffer buffer, byte[] bytes) {
        buffer.put(bytes);
    }

}
