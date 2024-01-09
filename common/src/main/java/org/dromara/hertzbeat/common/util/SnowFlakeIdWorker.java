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

package org.dromara.hertzbeat.common.util;

import lombok.extern.slf4j.Slf4j;

import java.util.Random;

/**
 * SnowFlakeId Instance 
 * 注意 由于前端JS TS 在json解析大数会造成精度丢失 UUID 不能超过 9007199254740991（10进制）16进制为 0x1FFFFFFFFFFFFF (小于53bit)
 * 1位符号位+41位时间戳+4位机器ID+8位序列号 = 53位
 * Note that because the front-end JS TS parses large numbers in json, the precision will be lost.
 * UUID cannot exceed hexadecimal 0x1FFFFFFFFFFFFFF (less than 53bit)
 * @author from https://www.cnblogs.com/vchar/p/14857677.html
 *
 */
@Slf4j
public class SnowFlakeIdWorker {

    /**
     * 开始时间戳，单位毫秒；这里是2021-06-01
     */
    private static final long TW_EPOCH = 1622476800000L;

    /**
     * 机器 ID 所占的位数
     */
    private static final long WORKER_ID_BITS = 4L;

    /**
     * 支持的最大机器ID，0-15
     * <p>
     * PS. Twitter的源码是 -1L ^ (-1L << workerIdBits)；这里最后和-1进行异或运算，由于-1的二进制补码的特殊性，就相当于进行取反。
     */
    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS);

    /**
     * 序列在 ID 中占的位数
     */
    private static final long SEQUENCE_BITS = 8L;

    /**
     * 机器 ID 向左移位数
     */
    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS;

    /**
     * 时间截向左移位数
     */
    private static final long TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;

    /**
     * 生成序列的掩码最大值，256
     */
    private static final long SEQUENCE_MASK = ~(-1L << SEQUENCE_BITS);

    /**
     * 工作机器 ID(0~15)
     */
    private final long workerId;

    /**
     * 毫秒内序列(0~256)
     */
    private long sequence = 0L;

    /**
     * 上次生成 ID 的时间戳
     */
    private long lastTimestamp = -1L;

    /**
     * 创建 ID 生成器的方式: 使用工作机器的序号 范围是 [0, 15]
     *
     * @param workerId 工作机器 ID
     */
    public SnowFlakeIdWorker(long workerId) {
        if (workerId < 0 || workerId > MAX_WORKER_ID) {
            Random random = new Random(workerId);
            workerId = random.nextInt((int) MAX_WORKER_ID);
            log.warn("Worker ID can't be greater than {} or less than 0, use random: {}.", MAX_WORKER_ID, workerId);
        }
        this.workerId = workerId;
    }

    /**
     * 创建 ID 生成器的方式: 使用本地IP作为机器ID创建生成器
     */
    public SnowFlakeIdWorker() {
        int workerId = 0;
        String host = IpDomainUtil.getLocalhostIp();
        if (host == null) {
            Random random = new Random(workerId);
            workerId = random.nextInt((int) MAX_WORKER_ID);
        } else {
            workerId = host.hashCode() % (int) MAX_WORKER_ID;
            workerId = Math.abs(workerId);
        }
        this.workerId = workerId;
    }

    /**
     * get next id
     * thread safe
     * @return id with 15 length
     */
    public synchronized long nextId() {
        long timestamp = timeGen();
        if (lastTimestamp == timestamp) {
            // 同一时间生成的，则序号+1
            sequence = (sequence + 1) & SEQUENCE_MASK;
            // 毫秒内序列溢出：超过最大值
            if (sequence == 0) {
                // 阻塞到下一个毫秒，获得新的时间戳
                timestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            // 时间戳改变，毫秒内序列重置
            sequence = 0L;
        }
        // 上次生成 ID 的时间戳
        lastTimestamp = timestamp;

        // 移位并通过或运算拼到一起
        return ((timestamp - TW_EPOCH) << TIMESTAMP_LEFT_SHIFT)
                | (workerId << WORKER_ID_SHIFT)
                | sequence;
    }

    private long tilNextMillis(long lastTimestamp) {
        long timestamp = timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = timeGen();
        }
        return timestamp;
    }

    private long timeGen() {
        return System.currentTimeMillis();
    }

}
