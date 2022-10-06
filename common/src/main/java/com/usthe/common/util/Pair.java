package com.usthe.common.util;

/**
 * Pair类(简写)，类似java.util.Map.Entry，只包含一个K、V
 * @author ceilzcx
 * @since 2022/10/03
 */
public class Pair<K, V> {
    private K left;
    private final V right;

    private Pair(K left, V right) {
        this.left = left;
        this.right = right;
    }

    public static <K, V> Pair<K, V> of(K left, V right) {
        return new Pair<>(left, right);
    }

    public K getLeft() {
        return left;
    }

    public void setLeft(K left) {
        this.left = left;
    }

    public V getRight() {
        return right;
    }
}
