/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.remoting.netty.codec;

import io.netty.buffer.ByteBuf;
import io.netty.channel.ChannelHandlerContext;
import io.netty.handler.codec.ByteToMessageCodec;
import org.apache.fory.Fory;
import org.apache.fory.ThreadSafeFory;
import org.apache.fory.config.Language;
import org.apache.hertzbeat.common.entity.message.ClusterMessage;

import java.util.List;

/**
 * Netty codec for ClusterMessage using Apache fory
 */
public class ForyCodec extends ByteToMessageCodec<ClusterMessage> {

    private static final ThreadSafeFory fory;

    static {
        // 1. Initialize Fory in XLANG mode
        fory = Fory.builder()
                .withLanguage(Language.XLANG)
                .requireClassRegistration(false)
                .buildThreadSafeFory();

        // 2. Register classes with specific names for Cross-Language compatibility (Java <-> Go)
        // These names (e.g., "ClusterMessage") must match the registration name in the Go client.
        fory.register(ClusterMessage.class, "ClusterMessage");
        fory.register(ClusterMessage.MessageType.class, "MessageType");
        fory.register(ClusterMessage.Direction.class, "Direction");
    }

    @Override
    protected void encode(ChannelHandlerContext ctx, ClusterMessage msg, ByteBuf out) {
        byte[] bytes = fory.serialize(msg);
        out.writeBytes(bytes);
    }

    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        byte[] bytes = new byte[in.readableBytes()];
        in.readBytes(bytes);
        Object obj = fory.deserialize(bytes);
        out.add(obj);
    }
}