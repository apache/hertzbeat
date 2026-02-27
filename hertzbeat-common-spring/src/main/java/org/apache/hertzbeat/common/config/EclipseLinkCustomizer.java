/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.config;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.persistence.config.SessionCustomizer;
import org.eclipse.persistence.descriptors.ClassDescriptor;
import org.eclipse.persistence.mappings.DatabaseMapping;
import org.eclipse.persistence.sessions.Session;

/**
 * change column name that from upper-case to lower-case-with-underscore
 */
@Slf4j
public class EclipseLinkCustomizer implements SessionCustomizer {
    
    @Override
    public void customize(Session session) throws Exception {
        for (ClassDescriptor descriptor : session.getDescriptors().values()) {
            for (DatabaseMapping mapping : descriptor.getMappings()) {
                if (mapping.isDirectToFieldMapping()) {
                    // update the column name to lower case with underscore
                    if (!mapping.getField().getName().equalsIgnoreCase(mapping.getAttributeName())) {
                        // already custom define the column name, ignore
                        continue;
                    }
                    // todo here i try to change column name that from upper-case to lower-case-with-underscore
                    // but failed, when update name, something relate exception happen more
                    mapping.getField().setName(convertCamelCase(mapping.getAttributeName()));
                }
            }
        }
        
    }
    
    private String convertCamelCase(String camelCase) {
        StringBuilder result = new StringBuilder();
        if (camelCase != null && !camelCase.isEmpty()) {
            result.append(Character.toLowerCase(camelCase.charAt(0)));
            for (int i = 1; i < camelCase.length(); i++) {
                char currentChar = camelCase.charAt(i);
                if (Character.isUpperCase(currentChar)) {
                    result.append('_').append(Character.toLowerCase(currentChar));
                } else {
                    result.append(currentChar);
                }
            }
        }
        return result.toString();
    }
}
