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
import java.security.SecureRandom;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage1;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage2;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage3;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RakpMessage4;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RmcpPlusOpenSessionRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload.RmcpPlusOpenSessionResponse;
import org.apache.hertzbeat.common.entity.job.protocol.IpmiProtocol;

/**
 * IpmiClient used to connect to a remote Ipmi server
 */
public class IpmiClient {

    UdpConnection connection;
    private final String host;
    private final Integer port;
    private final String username;
    private final String password;

    public IpmiClient(String host, Integer port, String username, String password) throws IOException {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        connection = new UdpConnection(host, port);
    }

    public static IpmiClient create(IpmiProtocol ipmiProtocol) throws IOException {
        return new IpmiClient(ipmiProtocol.getHost(), Integer.parseInt(ipmiProtocol.getPort()),
                ipmiProtocol.getUsername(), ipmiProtocol.getPassword());
    }

    public IpmiConnection connect() throws IOException {
        IpmiSession session = newSession(username, password);

        RmcpPlusOpenSessionResponse rmcpPlusOpenSessionResponse = connection.get(session, new RmcpPlusOpenSessionRequest(), RmcpPlusOpenSessionResponse.class);
        session.setSystemSessionId(rmcpPlusOpenSessionResponse.systemSessionId);

        session.generateConsoleRandomNumber();
        RakpMessage2 rakpMessage2 = connection.get(session, new RakpMessage1(), RakpMessage2.class);
        session.setSystemRandomNumber(rakpMessage2.systemRandom);
        session.setSystemGuid(rakpMessage2.systemGuid);


        session.generateSik();
        session.setK1(session.generateK(1));
        session.setK2(session.generateK(2));
        connection.get(session, new RakpMessage3(), RakpMessage4.class);

        session.setConnected(true);
        return new IpmiConnection(session, connection);
    }

    public IpmiSession newSession(String username, String password) {
        SecureRandom random = new SecureRandom();
        IpmiSession session = new IpmiSession(random.nextInt());
        session.setUserName(username);
        session.setPassword(password);
        return session;
    }

}
