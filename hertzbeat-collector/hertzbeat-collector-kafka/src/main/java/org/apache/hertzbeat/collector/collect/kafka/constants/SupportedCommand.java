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
public enum SupportedCommand {

    TOPIC_DESCRIBE("topic-describe"),
    TOPIC_LIST("topic-list"),
    TOPIC_OFFSET("topic-offset"),
    CONSUMER_DETAIL("consumer-detail");

    private static Set<String> SUPPORTED_COMMAND = new HashSet<>();

    static {
        // O(1) complexity, using static to load all system placeholders
        for (SupportedCommand placeholder : SupportedCommand.values()) {
            SUPPORTED_COMMAND.add(placeholder.getCommand());
        }
    }

    private final String key;

    SupportedCommand(String command) {
        this.key = command;
    }

    public String getCommand() {
        return key;
    }

    public static boolean isKafkaCommand(String str) {
        return SUPPORTED_COMMAND.contains(str);
    }

    public static SupportedCommand fromCommand(String command) {
        for (SupportedCommand supportedCommand : SupportedCommand.values()) {
            if (supportedCommand.getCommand().equals(command)) {
                return supportedCommand;
            }
        }
        throw new IllegalArgumentException("No enum constant for command: " + command);
    }
}
