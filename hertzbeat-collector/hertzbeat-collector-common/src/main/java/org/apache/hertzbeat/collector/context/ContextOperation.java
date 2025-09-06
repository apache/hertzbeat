package org.apache.hertzbeat.collector.context;

import io.micrometer.common.lang.Nullable;

/**
 *
 */
public interface ContextOperation {
    <T> void put(Object key, T value);

    <T> T remove(Object key);

    @Nullable
    Throwable getError();

    void setError(Throwable error);
}
