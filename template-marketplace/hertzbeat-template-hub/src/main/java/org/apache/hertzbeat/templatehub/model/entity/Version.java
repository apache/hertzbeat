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

package org.apache.hertzbeat.templatehub.model.entity;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Entity
@Table(name = "version")
public class Version implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    @Schema(description = "template id")
    private Integer template;

    @Column(nullable = false)
    @Schema(description = "Version name, modification is not allowed")
    private String version;

    @Column(nullable = false)
    @Schema(description = "Version description")
    private String description;

    @Column(nullable = false)
    private Integer download;

    @Column(nullable = false)
    private Integer star;

    @Column(nullable = false,name = "create_time")
    private String createTime;

    @Column(nullable = false,name = "off_shelf")
    private Integer offShelf;

    @Column(nullable = false,name = "is_del")
    private Integer isDel;


}
