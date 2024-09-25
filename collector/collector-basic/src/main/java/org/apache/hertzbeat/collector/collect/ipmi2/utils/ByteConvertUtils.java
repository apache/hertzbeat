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

import com.google.common.primitives.UnsignedBytes;

/**
 * Byte convert utils
 */
public class ByteConvertUtils {

    public static int byteToInt(byte b) {
        return UnsignedBytes.toInt(b);
    }

    public static byte checkCastByte(int i) {
        return UnsignedBytes.checkedCast(i);
    }

    public static int lsMsByteToInt(byte lsByte, byte msByte) {
        return (byteToInt(msByte) << 8) + byteToInt(lsByte);
    }

    public static byte[] intToLsMsByte(int i) {
        if (i < 0 || i > 0xFFFF) {
            throw new IllegalArgumentException("Invalid int value: " + i);
        }
        byte[] bytes = new byte[2];
        bytes[0] = checkCastByte(i & 0xFF);
        bytes[1] = checkCastByte((i >> 8) & 0xFF);
        return bytes;
    }

    public static int getBitsAsSigned(int value, int n) {
        int mask = (1 << n) - 1;
        int lowerBits = value & mask;
        int signBit = 1 << (n - 1);
        if ((lowerBits & signBit) != 0) {
            lowerBits |= ~mask;
        }
        return lowerBits;
    }

}
