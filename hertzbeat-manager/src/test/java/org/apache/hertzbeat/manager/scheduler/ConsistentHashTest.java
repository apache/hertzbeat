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
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link ConsistentHash}
 */
public class ConsistentHashTest {

    private ConsistentHash consistentHash;

    @BeforeEach
    void setUp() {
        consistentHash = new ConsistentHash();
    }

    @Test
    void testAddNode() {
        String job1 = "job1";
        long jobId1 = SnowFlakeIdGenerator.generateId();
        String job2 = "job2";
        long jobId2 = SnowFlakeIdGenerator.generateId();
        String job3 = "job3";
        long jobId3 = SnowFlakeIdGenerator.generateId();
        ConsistentHash.Node node1 = new ConsistentHash.Node("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        ConsistentHash.Node node2 = new ConsistentHash.Node("node2", "public", "192.168.0.2", System.currentTimeMillis(), (byte) 10);
        consistentHash.addNode(node1);
        consistentHash.dispatchJob(job1, jobId1);
        consistentHash.dispatchJob(job2, jobId2);
        consistentHash.dispatchJob(job3, jobId3);
        consistentHash.addNode(node2);
        assertTrue(node2.getAssignJobs().getAddingJobs().containsAll(node1.getAssignJobs().getRemovingJobs()));
        assertTrue(node2.getAssignJobs().getAddingJobs().containsAll(node2.getAssignJobs().getRemovingJobs()));
        assertSame(consistentHash.getNode("node1"), node1);
        assertSame(consistentHash.getNode("node2"), node2);
    }

    @Test
    void testDispatchJob() {
        String job1 = "job1";
        long jobId1 = SnowFlakeIdGenerator.generateId();
        ConsistentHash.Node res1 = consistentHash.dispatchJob(job1, jobId1);
        assertNull(res1);
        ConsistentHash.Node node1 = new ConsistentHash.Node("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        consistentHash.addNode(node1);
        String job2 = "job2";
        long jobId2 = SnowFlakeIdGenerator.generateId();
        ConsistentHash.Node res2 = consistentHash.dispatchJob(job2, jobId2);
        assertSame(res2, node1);
        assertTrue(consistentHash.getDispatchJobCache().isEmpty());
    }

    @Test
    void testRemoveNode() {
        String job1 = "job1";
        long jobId1 = SnowFlakeIdGenerator.generateId();
        String job2 = "job2";
        long jobId2 = SnowFlakeIdGenerator.generateId();
        String job3 = "job3";
        long jobId3 = SnowFlakeIdGenerator.generateId();
        ConsistentHash.Node node1 = new ConsistentHash.Node("node1", "public", "192.168.0.1", System.currentTimeMillis(), (byte) 10);
        ConsistentHash.Node node2 = new ConsistentHash.Node("node2", "public", "192.168.0.2", System.currentTimeMillis(), (byte) 10);
        consistentHash.addNode(node1);
        consistentHash.addNode(node2);
        consistentHash.dispatchJob(job1, jobId1);
        consistentHash.dispatchJob(job2, jobId2);
        consistentHash.dispatchJob(job3, jobId3);
        consistentHash.removeNode(node2.getIdentity());
        assertTrue(node1.getAssignJobs().getAddingJobs().containsAll(node2.getAssignJobs().getRemovingJobs()));
        assertSame(consistentHash.getNode("node1"), node1);
        assertNull(consistentHash.getNode("node2"));
        consistentHash.removeNode(node1.getIdentity());
        assertEquals(3, consistentHash.getDispatchJobCache().size());
    }

}
 
