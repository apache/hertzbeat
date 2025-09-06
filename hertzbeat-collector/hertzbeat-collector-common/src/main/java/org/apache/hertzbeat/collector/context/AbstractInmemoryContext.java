package org.apache.hertzbeat.collector.context;

import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.collector.constants.ContextStatus;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 *
 */
public abstract class AbstractInmemoryContext implements Context {
    protected final AtomicReference<ContextStatus> contextStatus = new AtomicReference<>(ContextStatus.WAITING);
    protected final Map<Object, Object> map = new ConcurrentHashMap<>();
    @Getter
    @Setter
    private Throwable error;


    @Override
    public <T> void put(Object key, T value) {
        this.map.put(key, value);
    }

    @Override
    public <T> T remove(Object key) {
        return (T) this.map.remove(key);
    }

    @Override
    public <T> T get(Object key) {
        return (T) this.map.get(key);
    }

    @Override
    public <T> T getOrDefault(Object key, T defaultValue) {
        return (T) this.map.getOrDefault(key, defaultValue);
    }

    @Override
    public boolean hasKey(Object key) {
        return this.map.containsKey(key);
    }

    @Override
    public ContextStatus getStatus() {
        return contextStatus.get();
    }

    @Override
    public void setStatus(ContextStatus status) {
        contextStatus.set(status);
    }
}
