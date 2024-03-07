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

package org.dromara.hertzbeat.common.cache;

import java.time.Duration;

/**
 * common cache factory
 * @author ceilzcx
 */
public class CacheFactory {
    private CacheFactory() {}

    private static final CommonCacheService<String, Object> NOTICE_CACHE =
            new CaffeineCacheServiceImpl<>(10, 1000, Duration.ofDays(1), false);
    
    private static final CommonCacheService<String, Object> ALERT_SILENCE_CACHE =
            new CaffeineCacheServiceImpl<>(10, 1000, Duration.ofDays(1), false);
    
    private static final CommonCacheService<String, Object> ALERT_CONVERGE_CACHE =
            new CaffeineCacheServiceImpl<>(10, 1000, Duration.ofDays(1), false);
    
    /**
     * get notice cache
     * @return caffeine cache
     */
    public static CommonCacheService<String, Object> getNoticeCache() {
        return NOTICE_CACHE;
    }
    
    /**
     * get alert silence cache
     * @return caffeine cache
     */
    public static CommonCacheService<String, Object> getAlertSilenceCache() {
        return ALERT_SILENCE_CACHE;
    }

    /**
     * get alert converge cache
     * @return converge cache
     */
    public static CommonCacheService<String, Object> getAlertConvergeCache() {
        return ALERT_CONVERGE_CACHE;
    }
}
