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

package org.apache.hertzbeat.remoting;

import io.netty.channel.Channel;
import java.util.List;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.remoting.netty.NettyHook;
import org.apache.hertzbeat.remoting.netty.NettyRemotingProcessor;

/**
 * remoting server interface
 */
public interface RemotingServer extends RemotingService {

    /**
     * register remoting processor by type
     * @param messageType type
     * @param processor remoting processor
     */
    void registerProcessor(ClusterMsg.MessageType messageType, NettyRemotingProcessor processor);

    /**
     * send message to client
     * @param channel client channel
     * @param request request message
     */
    void sendMsg(Channel channel, ClusterMsg.Message request);

    /**
     * send message to client and receive client message
     * @param channel client channel
     * @param request request message
     * @param timeoutMillis timeout millis
     * @return response message
     */
    ClusterMsg.Message sendMsgSync(Channel channel, ClusterMsg.Message request, int timeoutMillis);

    /**
     * register hook.
     * @param nettyHookList hook list
     */
    void registerHook(List<NettyHook> nettyHookList);
}
