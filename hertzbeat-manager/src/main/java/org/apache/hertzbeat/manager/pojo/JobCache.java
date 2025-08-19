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

package org.apache.hertzbeat.manager.pojo;

import org.apache.hertzbeat.common.entity.job.Job;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Utility class for caching {@link Job} objects in memory.
 * <p>
 * This class provides static methods to store, retrieve, and remove {@code Job} instances
 * using a thread-safe {@link ConcurrentHashMap}. It is intended to be used as a simple
 * in-memory cache for job data within the manager component.
 * <p>
 * Usage:
 * <pre>
 *     JobCache.put(job);
 *     Job job = JobCache.get(jobId);
 *     JobCache.remove(jobId);
 * </pre>
 */
public class JobCache {
    private static final Map<Long, Job> jobContentCache = new ConcurrentHashMap<>(16);

    public static Job get(Long jobId) {
        return jobContentCache.get(jobId);
    }

    public static void put(Job job) {
        jobContentCache.put(job.getId(), job);
    }

    public static void remove(Long jobId) {
        jobContentCache.remove(jobId);
    }
}
