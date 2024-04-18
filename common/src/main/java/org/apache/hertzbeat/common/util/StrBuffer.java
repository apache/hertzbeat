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

/**
 * In order to avoid generating too many String objects in the way of subString during ExporterParser parsing,
 * use this class control
 */
public class StrBuffer {
    private static final String POSITIVE_INF = "+inf";
    private static final String NEGATIVE_INF = "-inf";
    private static final long POSITIVE_INF_VALUE = 0x7FF0000000000000L;
    private static final long NEGATIVE_INF_VALUE = 0xFFF0000000000000L;

    private final char[] chars;
    private int left;
    private int right;

    public StrBuffer(String s) {
        this.chars = s.toCharArray();
        this.left = 0;
        this.right = s.length() - 1;
    }

    /**
     * Reading the current character, left++
     *
     * @return Current subscript character
     */
    public char read() {
        if (left > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", right=" + right);
        }
        return chars[left++];
    }

    /**
     * Rollback one character
     */
    public void rollback() {
        if (left > 0) {
            left--;
        }
    }

    /**
     * Only the index character of left+i is queried; there is no left++ operation
     *
     * @param i index
     * @return left+iThe character corresponding to the index
     */
    public char charAt(int i) {
        if (left + i > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", i=" + i);
        }
        return chars[left + i];
    }

    /**
     * Converting a string object
     *
     * @return charA string corresponding to an array
     */
    public String toStr() {
        StringBuilder builder = new StringBuilder();
        for (int i = left; i <= right; i++) {
            builder.append(chars[i]);
        }
        return builder.toString();
    }

    /**
     * transition double
     *
     * @return char double integer corresponding to the array
     */
    public double toDouble() {
        String s = toStr();
        return parseDouble(s);
    }

    /**
     * transition long
     *
     * @return char the long integer corresponding to the array
     */
    public long toLong() {
        String s = toStr();
        return parseLong(s);
    }

    public void skipBlankTabs() {
        while (left <= right) {
            if (this.isBlankOrTab(chars[left])) {
                left++;
            } else {
                break;
            }
        }
        while (right >= left) {
            if (this.isBlankOrTab(chars[right])) {
                right--;
            } else {
                break;
            }
        }
    }

    private boolean isBlankOrTab(char c) {
        return c == ' ' || c == '\t';
    }

    public boolean isEmpty() {
        return left > right;
    }

    /**
     * string -> long, We need to determine if it's INF
     *
     * @param s string
     * @return long
     */
    public static long parseLong(String s) {
        if (POSITIVE_INF.equalsIgnoreCase(s)) {
            return POSITIVE_INF_VALUE;
        }
        if (NEGATIVE_INF.equalsIgnoreCase(s)) {
            return NEGATIVE_INF_VALUE;
        }
        return Double.valueOf(s).longValue();
    }

    /**
     * string -> double, We need to determine if it's INF
     *
     * @param s string
     * @return double
     */
    public static double parseDouble(String s) {
        if (POSITIVE_INF.equalsIgnoreCase(s)) {
            return POSITIVE_INF_VALUE;
        } else if (NEGATIVE_INF.equalsIgnoreCase(s)) {
            return NEGATIVE_INF_VALUE;
        }
        return Double.parseDouble(s);
    }
}
