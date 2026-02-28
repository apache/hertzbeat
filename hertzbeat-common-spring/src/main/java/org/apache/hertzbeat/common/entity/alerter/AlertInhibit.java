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

package org.apache.hertzbeat.common.entity.alerter;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.manager.JsonStringListAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * alert inhibit rule
 */
@Entity
@Table(name = "hzb_alert_inhibit")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alert Inhibit Rule Entity")
@EntityListeners(AuditingEntityListener.class)
public class AlertInhibit {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Inhibit Rule ID", example = "1")
    private Long id;

    @Schema(title = "Inhibit Rule Name", example = "inhibit_high_cpu")
    @Size(max = 100)
    @NotNull
    private String name;

    /**
     * Source alert labels that must match for the inhibit rule to be active
     * Example: severity=critical,instance=web-01
     */
    @Schema(title = "Source Alert Match Labels")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> sourceLabels;

    /**
     * Target alert labels that must match to be inhibited
     * Example: severity=warning,instance=web-01  
     */
    @Schema(title = "Target Alert Match Labels")
    @Convert(converter = JsonMapAttributeConverter.class)
    @Column(length = 2048)
    private Map<String, String> targetLabels;

    /**
     * Labels that must have the same value in the source and target alert for the inhibit rule to be active
     * Example: ["instance", "job"]
     */
    @Schema(title = "Equal Labels")
    @Convert(converter = JsonStringListAttributeConverter.class)
    @Column(length = 2048)
    private List<String> equalLabels;

    @Schema(title = "Whether to enable this policy", example = "true")
    private Boolean enable;

    @Schema(title = "The creator of this record", example = "tom")
    @CreatedBy
    private String creator;

    @Schema(title = "This record was last modified by", example = "tom")
    @LastModifiedBy
    private String modifier;

    @Schema(title = "This record creation time (millisecond timestamp)")
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record the latest modification time (timestamp in milliseconds)")
    @LastModifiedDate
    private LocalDateTime gmtUpdate;
}
