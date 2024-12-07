package org.apache.hertzbeat.common.entity.arrow;

/**
 */
public interface ArrowVectorWriter extends AutoCloseable {
    void setValue(String fieldName, String value);

    byte[] toByteArray();

    boolean isEmpty();

    void close();
}
