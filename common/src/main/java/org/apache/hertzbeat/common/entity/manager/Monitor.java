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

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.CascadeType;
import jakarta.persistence.ConstraintMode;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.support.valid.HostValid;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Monitor Entity
 */
@Entity
@Table(name = "hzb_monitor", indexes = {
        @Index(name = "monitor_query_index", columnList = "app"),
        @Index(name = "monitor_query_index", columnList = "host"),
        @Index(name = "monitor_query_index", columnList = "name")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Monitor Entity")
@EntityListeners(AuditingEntityListener.class)
public class Monitor {

    /**
     * Monitor ID
     */
    @Id
    @Schema(title = "Monitor task ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Job ID
     */
    @Schema(title = "Collect task ID", example = "43243543543", accessMode = READ_ONLY)
    private Long jobId;

    /**
     * Monitor Name
     */
    @Schema(title = "task name", example = "Api-TanCloud.cn", accessMode = READ_WRITE)
    @Size(max = 100)
    private String name;

    /**
     * Type of monitoring: linux, mysql, jvm...
     */
    @Schema(title = "Type of monitoring", example = "TanCloud", accessMode = READ_WRITE)
    @Size(max = 100)
    private String app;

    /**
     * Monitored peer host: ipv4, ipv6, domain name
     */
    @Schema(title = "The host to monitor", example = "192.167.25.11", accessMode = READ_WRITE)
    @Size(max = 100)
    @HostValid
    private String host;

    /**
     * Monitoring collection interval time, in seconds
     */
    @Schema(title = "Monitoring of the acquisition interval time in seconds", example = "600", accessMode = READ_WRITE)
    @Min(10)
    private Integer intervals;

    /**
     * Monitoring status 0: Paused, 1: Up, 2: Down
     */
    @Schema(title = "Task status 0: Paused, 1: Up, 2: Down", accessMode = READ_WRITE)
    @Min(0)
    @Max(4)
    private byte status;

    /**
     * Monitoring note description
     */
    @Schema(title = "Monitor note description", example = "Availability monitoring of the SAAS website TanCloud", accessMode = READ_WRITE)
    @Size(max = 255)
    private String description;

    /**
     * The creator of this record
     */
    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    /**
     * This record was last modified by
     */
    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    /**
     * Record create time
     */
    @Schema(title = "Record create time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time (timestamp in milliseconds)
     */
    @Schema(title = "Record modify time", example = "2024-07-02T20:09:34.903217", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    /**
     * For a many-to-many join, you need to set up a third join intermediate table, JoinTable
     * JoinTable name is the intermediate table name of the association relationship
     *           joinColumns: The foreign key fields of the intermediate table relate the primary key fields of the table corresponding
     *           to the current entity class
     *           inverseJoinColumn：The foreign key fields of the intermediate table relate to the primary key fields of the other table
     *           JoinColumn  name The associated field name of the intermediate table
     *                       referencedColumnName The mapping field name of the association table
     */
    @ManyToMany(targetEntity = Tag.class, cascade = CascadeType.MERGE, fetch = FetchType.EAGER)
    @JoinTable(name = "hzb_tag_monitor_bind",
        foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
        inverseForeignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
        joinColumns = {@JoinColumn(name = "monitor_id", referencedColumnName = "id")},
        inverseJoinColumns = {@JoinColumn(name = "tag_id", referencedColumnName = "id")})
    private List<Tag> tags;
}
