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
