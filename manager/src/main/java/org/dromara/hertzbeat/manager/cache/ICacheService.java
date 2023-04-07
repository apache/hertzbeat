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

package org.dromara.hertzbeat.manager.cache;

/**
 * common cache
 * @author ceilzcx
 * @since 4/2/2023
 */
public interface ICacheService {

    /**
     * get cache by key
     * @param key key
     * @return cache object
     */
    Object get(Object key);

    /**
     * get cache by key use clazz
     * @param key key
     * @param clazz clazz
     * @return object
     * @param <T> t
     */
    <T> T get(Object key, Class<T> clazz);

    /**
     * set cache
     * @param key key
     * @param value value
     */
    void put(Object key, Object value);

    /**
     * if contain cache by key
     * @param key key
     * @return true is contain
     */
    boolean containsKey(Object key);

    /**
     * remove cache
     * @param key key
     */
    void remove(Object key);
}
