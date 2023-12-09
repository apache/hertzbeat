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

package org.dromara.hertzbeat.common.entity.alerter;

import com.google.common.base.Objects;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.common.entity.manager.JsonTagListAttributeConverter;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.hibernate.validator.constraints.Length;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;


/**
 * Alarm Define Rule Entity
 * @author tom
 */
@Entity
@Table(name = "hzb_alert_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Alarm Threshold Entity | 告警阈值实体")
@EntityListeners(AuditingEntityListener.class)
public class AlertDefine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Threshold Id", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Monitoring Type", example = "linux", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String app;

    @Schema(title = "Monitoring Metrics", example = "cpu", accessMode = READ_WRITE)
    @Length(max = 100)
    @NotNull
    private String metric;

    @Schema(title = "Monitoring Metrics Field", example = "usage", accessMode = READ_WRITE)
    @Length(max = 100)
    private String field;

    @Schema(title = "Is Apply All Default | 是否是全局默认告警", example = "false", accessMode = READ_WRITE)
    private boolean preset;

    @Schema(title = "Alarm Threshold Expr | 告警阈值触发条件表达式", example = "usage>90", accessMode = READ_WRITE)
    @Length(max = 2048)
    @Column(length = 2048)
    private String expr;

    @Schema(title = "Alarm Level 0:High-Emergency-Critical Alarm 1:Medium-Critical-Critical Alarm 2:Low-Warning-Warning",
            example = "1", accessMode = READ_WRITE)
    @Min(0)
    @Max(2)
    private byte priority;

    @Schema(title = "Alarm Trigger Times | 阈值触发次数,即达到次数要求后才触发告警", example = "3", accessMode = READ_WRITE)
    @Min(0)
    @Max(10)
    private Integer times;
    
    @Schema(description = "Tags(status:success,env:prod)", example = "{name: key1, value: value1}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonTagListAttributeConverter.class)
    @Column(length = 2048)
    private List<TagItem> tags;

    @Schema(title = "Is Enable", example = "true", accessMode = READ_WRITE)
    private boolean enable = true;
    
    @Schema(title = "Is Send Alarm Recover Notice | 是否发送告警恢复通知", example = "false", accessMode = READ_WRITE)
    @Column(columnDefinition = "boolean default false")
    private boolean recoverNotice = false;

    @Schema(title = "Alarm Template | 告警通知内容模版", example = "linux {monitor_name}: {monitor_id} cpu usage high",
            accessMode = READ_WRITE)
    @Length(max = 2048)
    @Column(length = 2048)
    private String template;

    @Schema(title = "The creator of this record", example = "tom", accessMode = READ_ONLY)
    @CreatedBy
    private String creator;

    @Schema(title = "The modifier of this record", example = "tom", accessMode = READ_ONLY)
    @LastModifiedBy
    private String modifier;

    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof AlertDefine)) {
            return false;
        }
        AlertDefine that = (AlertDefine) o;
        return priority == that.priority && Objects.equal(app, that.app) && Objects.equal(metric, that.metric)
                && Objects.equal(field, that.field) && Objects.equal(expr, that.expr)
                && Objects.equal(times, that.times) && Objects.equal(template, that.template);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(app, metric, field, expr, priority, times, template);
    }
}
