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

package org.apache.hertzbeat.collector.collect.ipmi2.cache;


import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiConnection;

/**
 * ipmi connect session
 */
public class IpmiConnect extends AbstractConnection<IpmiConnection> {

    private final IpmiConnection ipmiConnection;

    public IpmiConnect(IpmiConnection ipmiConnection) {
        this.ipmiConnection = ipmiConnection;
    }

    @Override
    public IpmiConnection getConnection() {
        return ipmiConnection;
    }

    @Override
    public void closeConnection() throws Exception {
        if (ipmiConnection != null) {
            ipmiConnection.close();
        }
    }

}
