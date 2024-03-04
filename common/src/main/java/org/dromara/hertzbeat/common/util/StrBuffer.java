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

package org.dromara.hertzbeat.common.util;

/**
 * @author ceilzcx
 *
 * 为了避免ExporterParser解析过程中, 使用subString的方式生成过多的String对象, 使用该类控制
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
     * 读取当前字符, left++
     *
     * @return 当前下标字符
     */
    public char read() {
        if (left > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", right=" + right);
        }
        return chars[left++];
    }

    /**
     * 回滚一个字符
     */
    public void rollback() {
        if (left > 0) {
            left--;
        }
    }

    /**
     * 只查询left+i的下标字符, 不会进行left++的操作
     *
     * @param i 下标
     * @return left+i下标对应的字符
     */
    public char charAt(int i) {
        if (left + i > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", i=" + i);
        }
        return chars[left + i];
    }

    /**
     * 转string对象
     *
     * @return char数组对应的字符串
     */
    public String toStr() {
        StringBuilder builder = new StringBuilder();
        for (int i = left; i <= right; i++) {
            builder.append(chars[i]);
        }
        return builder.toString();
    }

    /**
     * 转double
     *
     * @return char数组对应的浮点数
     */
    public double toDouble() {
        String s = toStr();
        return parseDouble(s);
    }

    /**
     * 转long
     *
     * @return char数组对应的长整数
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
     * string -> long, 需要判断是否为INF
     *
     * @param s 字符串
     * @return 长整数
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
     * string -> double, 需要判断是否为INF
     *
     * @param s 字符串
     * @return 浮点数
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
