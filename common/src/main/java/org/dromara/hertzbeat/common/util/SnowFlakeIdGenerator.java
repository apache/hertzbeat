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

import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentityGenerator;

import java.io.Serializable;

/**
 * Snowflake Algorithm Generator Tool
 * @author tomsun28
 */
public class SnowFlakeIdGenerator extends IdentityGenerator {

    private static final SnowFlakeIdWorker ID_WORKER;

    static {
        ID_WORKER = new SnowFlakeIdWorker();
    }

    @Override
    public Serializable generate(SharedSessionContractImplementor s, Object obj) throws HibernateException {
        Serializable id = s.getEntityPersister(null, obj).getClassMetadata().getIdentifier(obj, s);

        if (id != null && Long.valueOf(id.toString()) > 0) {
            return id;
        } else {
            return SnowFlakeIdGenerator.generateId();
        }
    }

    public static long generateId() {
        return ID_WORKER.nextId();
    }
}
