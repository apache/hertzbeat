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

package org.apache.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * script protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ScriptProtocol implements CommonRequestProtocol, Protocol {
    /**
     * OS charset
     */
    private String charset;

    /**
     * Script working directory
     */
    private String workDirectory;

    /**
     * Script command
     */
    private String scriptCommand;

    /**
     * File name of script
     */
    private String scriptPath;

    /**
     * Response data parsing mode：oneRow, multiRow
     */
    private String parseType;

    /**
     * Script tool name, exp: bash, cmd, powershell
     */
    private String scriptTool;

    @Override
    public void setHost(String host) {
        this.workDirectory = host;
    }

    @Override
    public void setPort(String port) {
        this.scriptPath = port;
    }
}
