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

package org.apache.hertzbeat.manager.service.importtask;

/** Identifies deterministic import parsing or content-shape rejection. */
public final class InvalidImportContentException extends IllegalArgumentException {

    public static final String MESSAGE = "Monitor import content is invalid.";
    public static final String YAML_MESSAGE = "Monitor YAML import content is invalid.";

    public InvalidImportContentException() {
        super(MESSAGE);
    }

    private InvalidImportContentException(String message) {
        super(message);
    }

    public static InvalidImportContentException forYaml() {
        return new InvalidImportContentException(YAML_MESSAGE);
    }
}
