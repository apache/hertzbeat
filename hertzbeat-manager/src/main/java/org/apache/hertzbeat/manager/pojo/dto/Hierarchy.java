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

package org.apache.hertzbeat.manager.pojo.dto;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hierarchical structure
 * eg: Monitoring Type metrics Information Hierarchy Relationship
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Schema(description = "Monitor Hierarchy")
public class Hierarchy {

    /**
     * Category value
     */
    @Schema(description = "Category Value", example = "os", accessMode = READ_WRITE)
    String category;

    /**
     * Attribute value
     */
    @Schema(description = "Attribute value", example = "linux", accessMode = READ_WRITE)
    String value;

    /**
     * Attribute internationalization tag
     */
    @Schema(description = "Attribute internationalization tag", example = "Linux system", accessMode = READ_WRITE)
    String label;

    /**
     * Is it a leaf node
     */
    @Schema(description = "Is it a leaf node", example = "true", accessMode = READ_WRITE)
    Boolean isLeaf = false;

    /**
     * Is hide this app type in main menus layout
     */
    @Schema(description = "Is hide this app in main menus layout, only for app type, default true.", example = "true")
    Boolean hide = true;
    
    /**
     * For leaf metric
     * metric type 0-number: number 1-string: string
     */
    @Schema(description = "metric type 0-number: number 1-string: string")
    private Byte type;
    
    /**
     * metric unit
     */
    @Schema(description = "metric unit")
    private String unit;

    /**
     * Next level of association
     */
    @Schema(description = "Next Hierarchy", accessMode = READ_WRITE)
    private List<Hierarchy> children;
}
