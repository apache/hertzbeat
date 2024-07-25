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

package org.apache.hertzbeat.manager.scheduler;

import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * concurrent treemap
 */
public class ConcurrentTreeMap<K, V> extends TreeMap<K, V> {

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

    public Map.Entry<K, V> higherOrFirstEntry(K key){
        readWriteLock.readLock().lock();
        try {
            Map.Entry<K, V> entry = super.higherEntry(key);
            if (entry == null) {
                return super.firstEntry();
            }
            return entry;
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

    public Map.Entry<K, V> ceilingOrFirstEntry(K key) {
        readWriteLock.readLock().lock();
        try {
            Map.Entry<K, V> entry = super.ceilingEntry(key);
            if (entry == null) {
                return super.firstEntry();
            }
            return entry;
        } finally {
            readWriteLock.readLock().unlock();
        }
    }
}
