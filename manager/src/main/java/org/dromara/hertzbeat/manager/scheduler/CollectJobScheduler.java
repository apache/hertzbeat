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

package org.dromara.hertzbeat.manager.scheduler;

import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Collection job management
 * 调度采集job管理
 */
@Service
public class CollectJobScheduler implements CollectJobSchedule {
    
    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job) {
        
        return null;
    }
    
    @Override
    public List<CollectRep.MetricsData> collectSyncJobData(Job job, String collector) {
        return null;
    }
    
    @Override
    public long addAsyncCollectJob(Job job) {
        return 0;
    }
    
    @Override
    public long addAsyncCollectJob(Job job, String collector) {
        return 0;
    }
    
    @Override
    public long updateAsyncCollectJob(Job modifyJob) {
        return 0;
    }
    
    @Override
    public long updateAsyncCollectJob(Job modifyJob, String collector) {
        return 0;
    }
    
    @Override
    public void cancelAsyncCollectJob(Long jobId) {
        
    }
}
