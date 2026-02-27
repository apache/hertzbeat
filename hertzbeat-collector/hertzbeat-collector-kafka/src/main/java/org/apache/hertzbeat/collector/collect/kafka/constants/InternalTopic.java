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

package org.apache.hertzbeat.collector.collect.kafka.constants;

import java.util.HashSet;
import java.util.Set;

/**
 * SupportedCommand
 */
public enum InternalTopic {

    CONSUMER_OFFSET("__consumer_offsets");

    private static Set<String> INTERNAL_TOPIC = new HashSet<>();

    static {
        // O(1) complexity, using static to load all system placeholders
        for (InternalTopic placeholder : InternalTopic.values()) {
            INTERNAL_TOPIC.add(placeholder.getCommand());
        }
    }

    private final String key;

    InternalTopic(String command) {
        this.key = command;
    }

    public String getCommand() {
        return key;
    }

    public static boolean isInternalTopic(String str) {
        return INTERNAL_TOPIC.contains(str);
    }

    public static InternalTopic fromCommand(String command) {
        for (InternalTopic supportedCommand : InternalTopic.values()) {
            if (supportedCommand.getCommand().equals(command)) {
                return supportedCommand;
            }
        }
        throw new IllegalArgumentException("No enum constant for command: " + command);
    }
}
