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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.common.constants.CollectorStatus;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.manager.pojo.CollectorNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ConsistentHashCollectorKeeper}
 */
public class ConsistentHashCollectorKeeperTest {

    private ConsistentHashCollectorKeeper consistentHashCollectorKeeper;

    @BeforeEach
    void setUp() {
        consistentHashCollectorKeeper = new ConsistentHashCollectorKeeper();
    }

    @Test
    void testAddNode() {
        long jobId1 = SnowFlakeIdGenerator.generateId();
        long jobId2 = SnowFlakeIdGenerator.generateId();
        long jobId3 = SnowFlakeIdGenerator.generateId();
        CollectorNode node1 = new CollectorNode("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        CollectorNode node2 = new CollectorNode("node2", "public", "192.168.0.2", System.currentTimeMillis(), (byte) 10);
        consistentHashCollectorKeeper.addNode(node1);
        consistentHashCollectorKeeper.determineNode(jobId1);
        consistentHashCollectorKeeper.determineNode(jobId2);
        consistentHashCollectorKeeper.determineNode(jobId3);
        consistentHashCollectorKeeper.addNode(node2);
        assertTrue(node2.getAssignJobs().getAddingJobs().containsAll(node1.getAssignJobs().getRemovingJobs()));
        assertTrue(node2.getAssignJobs().getAddingJobs().containsAll(node2.getAssignJobs().getRemovingJobs()));
        assertSame(consistentHashCollectorKeeper.getNode("node1"), node1);
        assertSame(consistentHashCollectorKeeper.getNode("node2"), node2);
    }

    @Test
    void testDispatchJob() {
        long jobId1 = SnowFlakeIdGenerator.generateId();
        CollectorNode res1 = consistentHashCollectorKeeper.determineNode(jobId1);
        assertNull(res1);
        CollectorNode node1 = new CollectorNode("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        consistentHashCollectorKeeper.addNode(node1);
        long jobId2 = SnowFlakeIdGenerator.generateId();
        CollectorNode res2 = consistentHashCollectorKeeper.determineNode(jobId2);
        assertSame(res2, node1);
        assertTrue(consistentHashCollectorKeeper.getDispatchJobCache().isEmpty());
    }

    @Test
    void testRemoveNode() {
        CollectorNode node1 = new CollectorNode("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        CollectorNode node2 = new CollectorNode("node2", "public", "192.168.0.2", System.currentTimeMillis(), (byte) 10);
        consistentHashCollectorKeeper.addNode(node1);
        consistentHashCollectorKeeper.addNode(node2);

        long jobId1 = SnowFlakeIdGenerator.generateId();
        long jobId2 = SnowFlakeIdGenerator.generateId();
        long jobId3 = SnowFlakeIdGenerator.generateId();
        long jobId4 = SnowFlakeIdGenerator.generateId();
        consistentHashCollectorKeeper.addJob(Job.builder().id(jobId1).monitorId(jobId1).build(), null);
        consistentHashCollectorKeeper.addJob(Job.builder().id(jobId2).monitorId(jobId2).build(), null);
        consistentHashCollectorKeeper.addJob(Job.builder().id(jobId3).monitorId(jobId3).build(), null);
        consistentHashCollectorKeeper.addJob(Job.builder().id(jobId4).monitorId(jobId4).build(), null);


        consistentHashCollectorKeeper.changeStatus(node2.getIdentity(), CollectorStatus.OFFLINE);
        assertTrue(node1.getAssignJobs().getAddingJobs().containsAll(node2.getAssignJobs().getRemovingJobs()));
        assertSame(consistentHashCollectorKeeper.getNode("node1"), node1);
        assertNull(consistentHashCollectorKeeper.getNode("node2"));
        consistentHashCollectorKeeper.changeStatus(node1.getIdentity(), CollectorStatus.OFFLINE);
        assertEquals(4, consistentHashCollectorKeeper.getDispatchJobCache().size());
    }

}
 
