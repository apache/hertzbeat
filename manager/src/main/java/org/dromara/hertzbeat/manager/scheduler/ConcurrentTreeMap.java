package org.dromara.hertzbeat.manager.scheduler;

import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * concurrent treemap
 * @author tom
 */
public class ConcurrentTreeMap<K,V> extends TreeMap<K,V> {

    private final ReentrantReadWriteLock readWriteLock = new ReentrantReadWriteLock();

    public ConcurrentTreeMap() {
        super();
    }

    @Override
    public V put(K key, V value) {
        readWriteLock.writeLock().lock();
        try {
            return super.put(key, value);
        } finally {
            readWriteLock.writeLock().unlock();
        }
    }

    @Override
    public V remove(Object key) {
        readWriteLock.writeLock().lock();
        try {
            return super.remove(key);
        } finally {
            readWriteLock.writeLock().unlock();
        }
    }

    @Override
    public Map.Entry<K, V> firstEntry() {
        readWriteLock.readLock().lock();
        try {
            return super.firstEntry();
        } finally {
            readWriteLock.readLock().unlock();
        }
    }

    @Override
    public Map.Entry<K, V> higherEntry(K key) {
        readWriteLock.readLock().lock();
        try {
            return super.higherEntry(key);
        } finally {
            readWriteLock.readLock().unlock();
        }
    }

    @Override
    public Map.Entry<K, V> ceilingEntry(K key) {
        readWriteLock.readLock().lock();
        try {
            return super.ceilingEntry(key);
        } finally {
            readWriteLock.readLock().unlock();
        }
    }
}
