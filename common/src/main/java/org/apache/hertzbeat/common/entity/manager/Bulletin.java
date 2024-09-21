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

package org.apache.hertzbeat.common.entity.manager;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Bulletin
 */
@Entity
@Data
@Schema(description = "Bulletin")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "hzb_bulletin")
public class Bulletin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Bulletin ID", example = "1")
    private Long id;

    @Schema(description = "Bulletin Name", example = "Bulletin1", accessMode = READ_WRITE)
    private String name;

    @Schema(description = "Monitor IDs", example = "1")
    @Column(name = "monitor_ids", length = 4096)
    @Convert(converter = JsonLongListAttributeConverter.class)
    private List<Long> monitorIds;

    @Schema(description = "Monitor Type eg: jvm, tomcat", example = "jvm", accessMode = READ_WRITE)
    private String app;

    @Schema(description = "Monitor Fields")
    @Column(name = "fields", length = 4096)
    @Convert(converter = JsonMapListAttributeConverter.class)
    private Map<String, List<String>> fields;

    @Schema(description = "Tags(status:success,env:prod)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_WRITE)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_WRITE)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "2024-07-02T20:09:34.903217", accessMode = READ_WRITE)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "2024-07-02T20:09:34.903217", accessMode = READ_WRITE)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
