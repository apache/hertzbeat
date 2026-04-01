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

import java.nio.charset.Charset;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.StringUtils;

/**
 * script protocol
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ScriptProtocol implements CommonRequestProtocol, Protocol {
    private static final Set<String> VALID_PARSE_TYPES = Set.of("oneRow", "multiRow", "netcat", "log");
    private static final Set<String> VALID_SCRIPT_TOOLS = Set.of("bash", "cmd", "powershell");

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

    @Override
    public boolean isInvalid() {
        if (StringUtils.isBlank(charset) || !isSupportedCharset(charset)) {
            return true;
        }
        if (StringUtils.isBlank(parseType) || !VALID_PARSE_TYPES.contains(parseType)) {
            return true;
        }
        if (StringUtils.isBlank(scriptTool) || !VALID_SCRIPT_TOOLS.contains(scriptTool)) {
            return true;
        }
        return StringUtils.isAllBlank(scriptCommand, scriptPath);
    }

    private boolean isSupportedCharset(String charsetName) {
        try {
            return Charset.isSupported(charsetName);
        } catch (Exception e) {
            return false;
        }
    }
}
