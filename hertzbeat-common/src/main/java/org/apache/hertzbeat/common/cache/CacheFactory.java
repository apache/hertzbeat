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

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;

/**
 * common cache factory
 */
public final class CacheFactory {
    private CacheFactory() {}

    private static final CommonCacheService<String, Object> COMMON_CACHE =
            new CaffeineCacheServiceImpl<>(1, 1000, Duration.ofDays(1), false);
    
    /**
     * get notice cache
     * @return caffeine cache
     */
    @SuppressWarnings("unchecked")
    public static List<NoticeRule> getNoticeCache() {
        return (List<NoticeRule>) COMMON_CACHE.get(CommonConstants.CACHE_NOTICE_RULE);
    }

    /**
     * set notice cache
     * @param noticeRules notice rules
     */
    public static void setNoticeCache(List<NoticeRule> noticeRules) {
        COMMON_CACHE.put(CommonConstants.CACHE_NOTICE_RULE, noticeRules);
    }

    /**
     * clear notice cache
     */
    public static void clearNoticeCache() {
        COMMON_CACHE.remove(CommonConstants.CACHE_NOTICE_RULE);
    }
    
    /**
     * get alert silence cache
     * @return caffeine cache
     */
    @SuppressWarnings("unchecked")
    public static List<AlertSilence> getAlertSilenceCache() {
        return (List<AlertSilence>) COMMON_CACHE.get(CommonConstants.CACHE_ALERT_SILENCE);
    }

    /**
     * set alert silence cache
     * @param alertSilences alert silences
     */
    public static void setAlertSilenceCache(List<AlertSilence> alertSilences) {
        COMMON_CACHE.put(CommonConstants.CACHE_ALERT_SILENCE, alertSilences);
    }

    /**
     * clear alert silence cache
     */
    public static void clearAlertSilenceCache() {
        COMMON_CACHE.remove(CommonConstants.CACHE_ALERT_SILENCE);
    }

    /**
     * get alert define cache
     * @return caffeine cache
     */
    @SuppressWarnings("unchecked")
    public static List<AlertDefine> getAlertDefineCache() {
        return (List<AlertDefine>) COMMON_CACHE.get(CommonConstants.CACHE_ALERT_DEFINE);
    }

    /**
     * set alert define cache
     * @param alertDefines alert defines
     */
    public static void setAlertDefineCache(List<AlertDefine> alertDefines) {
        COMMON_CACHE.put(CommonConstants.CACHE_ALERT_DEFINE, alertDefines);
    }
    
    /**
     * clear alert define cache
     */
    public static void clearAlertDefineCache() {
        COMMON_CACHE.remove(CommonConstants.CACHE_ALERT_DEFINE);
    }
}
