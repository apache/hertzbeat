package org.dromara.hertzbeat.common.util;

/**
 * Pair KV 
 * @author ceilzcx
 */
public class Pair<K, V> {
    private K left;
    private final V right;

    public Pair(K left, V right) {
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
