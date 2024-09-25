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

package org.apache.hertzbeat.collector.collect.ipmi2.client;

import java.io.IOException;
import org.apache.hertzbeat.collector.collect.ipmi2.client.handler.IpmiHandler;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.CloseSessionRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.CloseSessionResponse;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * IpmiConnection used for sending ipmi request
 */
public class IpmiConnection implements AutoCloseable {

    IpmiSession session;

    UdpConnection udpConnection;

    IpmiHandlerManager handlerManager = new IpmiHandlerManager();

    private volatile boolean active = true;

    IpmiConnection(IpmiSession session, UdpConnection udpConnection) {
        this.session = session;
        this.udpConnection = udpConnection;
    }

    public void getResource(CollectRep.MetricsData.Builder builder, Metrics metrics) throws IOException {
        IpmiHandler handler = handlerManager.getHandler(metrics.getName());
        if (handler == null) {
            throw new RuntimeException("no handler for " + metrics.getIpmi().getType());
        }
        handler.handler(session, udpConnection, builder, metrics);
    }


    @Override
    public void close() throws IOException {
        udpConnection.get(session,  new CloseSessionRequest(session.getSystemSessionId()), CloseSessionResponse.class);
        udpConnection.close();
        session = null;
        active = false;
    }

    public boolean isActive() {
        return this.active;
    }
}
