package com.usthe.common.util;

/**
 * @author ceilzcx
 * @since 9/11/2022
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

    // 读取当前字符, left++
    public char read() {
        if (left > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", right=" + right);
        }
        return chars[left++];
    }

    public void rollback() {
        if (left > 0) {
            left--;
        }
    }

    // 只查询left+i的下标字符, 不会进行left++的操作
    public char charAt(int i) {
        if (left + i > right) {
            throw new IndexOutOfBoundsException("StrBuffer use charAt method error. left=" + left + ", i=" + i);
        }
        return chars[left + i];
    }

    // char[] -> String
    public String toStr() {
        StringBuilder builder = new StringBuilder();
        for (int i = left; i <= right; i++) {
            builder.append(chars[i]);
        }
        return builder.toString();
    }

    // char[] -> double
    public double toDouble() {
        String s = toStr();
        return parseDouble(s);
    }

    // char[] -> long
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

    // string -> long, 需要判断是否为INF
    public static long parseLong(String s) {
        if (POSITIVE_INF.equalsIgnoreCase(s)) {
            return POSITIVE_INF_VALUE;
        }
        if (NEGATIVE_INF.equalsIgnoreCase(s)) {
            return NEGATIVE_INF_VALUE;
        }
        return Long.parseLong(s);
    }

    // string -> double, 需要判断是否为INF
    public static double parseDouble(String s) {
        if (POSITIVE_INF.equalsIgnoreCase(s)) {
            return POSITIVE_INF_VALUE;
        } else if (NEGATIVE_INF.equalsIgnoreCase(s)) {
            return NEGATIVE_INF_VALUE;
        }
        return Double.parseDouble(s);
    }
}
