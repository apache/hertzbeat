package com.usthe.common.util;

/**
 * @author ceilzcx
 * @since 9/11/2022
 * 为了避免ExporterParser解析过程中, 使用subString的方式生成过多的String对象, 使用该类控制
 */
public class StrBuffer {
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
    // todo golang对于无限大的字符为 +INF, 需要单独处理
    public double toDouble() {
        String s = toStr();
        if (CommonUtil.isINF(s)) {
            return Double.MAX_VALUE;
        }
        return Double.parseDouble(s);
    }

    // char[] -> long
    public long toLong() {
        String s = toStr();
        if (CommonUtil.isINF(s)) {
            return Long.MAX_VALUE;
        }
        return Long.parseLong(s);
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
}
