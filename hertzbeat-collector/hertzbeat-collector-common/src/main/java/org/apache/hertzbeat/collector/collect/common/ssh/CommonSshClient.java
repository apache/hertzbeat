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

package org.apache.hertzbeat.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.ClientBuilder;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.keyverifier.AcceptAllServerKeyVerifier;
import org.apache.sshd.common.NamedFactory;
import org.apache.sshd.common.PropertyResolverUtils;
import org.apache.sshd.common.kex.BuiltinDHFactories;
import org.apache.sshd.core.CoreModuleProperties;
import org.apache.sshd.server.forward.AcceptAllForwardingFilter;

/**
 * common ssh pool client
 */
@Slf4j
public class CommonSshClient {

    private static final SshClient SSH_CLIENT;
    
    static {
        SSH_CLIENT = SshClient.setUpDefaultClient();
        // accept all server key verifier, will print warn log : Server at {} presented unverified {} key: {}
        AcceptAllServerKeyVerifier verifier = AcceptAllServerKeyVerifier.INSTANCE;
        SSH_CLIENT.setServerKeyVerifier(verifier);
        // set connection heartbeat interval time 2000ms, wait for heartbeat response timeout 300_000ms
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_INTERVAL.getName(), 2000);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_NO_REPLY_MAX.getName(), 30);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.SOCKET_KEEPALIVE.getName(), true);
        // set support all KeyExchange
        SSH_CLIENT.setKeyExchangeFactories(NamedFactory.setUpTransformedFactories(
                false,
                BuiltinDHFactories.VALUES,
                ClientBuilder.DH2KEX
        ));
        SSH_CLIENT.setForwardingFilter(new AcceptAllForwardingFilter());
        // todo when connect AlibabaCloud ubuntu server, custom signature factories will cause error, why?
        // SSH_CLIENT.setSignatureFactories(new ArrayList<>(BuiltinSignatures.VALUES));
        SSH_CLIENT.start();
    }

    public static SshClient getSshClient() {
        return SSH_CLIENT;
    }
}
