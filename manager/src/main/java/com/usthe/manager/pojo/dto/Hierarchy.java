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

package com.usthe.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Hierarchical structure
 * 层级关系结构
 * eg: Monitoring Type Indicator Group Indicator Information Hierarchy Relationship
 * eg: 监控类型指标组指标信息层级关系
 *
 * @author tom
 * @date 2021/12/12 16:23
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@Schema(description = "Monitor Hierarchy | 监控类型指标组指标信息层级关系")
public class Hierarchy {

    /**
     * Category value
     */
    @Schema(description = "类别值", example = "os", accessMode = READ_WRITE)
    String category;

    /**
     * Attribute value
     */
    @Schema(description = "属性值", example = "linux", accessMode = READ_WRITE)
    String value;

    /**
     * Attribute internationalization tag
     */
    @Schema(description = "属性国际化标签", example = "Linux系统", accessMode = READ_WRITE)
    String label;

    /**
     * Is it a leaf node
     */
    @Schema(description = "是否是叶子节点", example = "true", accessMode = READ_WRITE)
    Boolean isLeaf = false;

    /**
     * Next level of association
     */
    @Schema(description = "下一关联层级", accessMode = READ_WRITE)
    private List<Hierarchy> children;
}
