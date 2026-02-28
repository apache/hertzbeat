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

package org.apache.hertzbeat.common.cache;

/**
 * common cache service
 */
public interface CommonCacheService<K, V> {

    /**
     * get cache by key use clazz
     * @param key key
     * @return object
     */
    V get(K key);

    /**
     * set cache
     * @param key key
     * @param value value
     */
    void put(K key, V value);

    /**
     * set cache and return oldValue if present
     * @param key key
     * @param value value
     * @return old value
     */
    V putAndGetOld(K key, V value);

    /**
     * if contain cache by key
     * @param key key
     * @return true is contain
     */
    boolean containsKey(K key);

    /**
     * remove cache
     * @param key key
     * @return old value
     */
    V remove(K key);

    /**
     * clear cache
     * @return is clear success
     */
    boolean clear();
}
