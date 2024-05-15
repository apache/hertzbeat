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
import org.apache.hertzbeat.common.entity.alerter.JsonMapAttributeConverter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Monitoring parameter definitions
 */
@Entity
@Table(name = "hzb_param_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Parameter structure definition entity")
@EntityListeners(AuditingEntityListener.class)
public class ParamDefine {

    /**
     * Parameter Structure ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "Parameter structure ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Monitoring application type name
     */
    @Schema(title = "Type of monitoring", example = "TanCloud", accessMode = READ_WRITE)
    private String app;

    /**
     * Parameter field external display name
     * Port
     */
    @Schema(description = "The parameter field displays the internationalized name", example = "{zh-CN: '端口'}",
            accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @SuppressWarnings("JpaAttributeTypeInspection")
    @Column(length = 2048)
    private Map<String, String> name;

    /**
     * Parameter Field Identifier
     */
    @Schema(title = "Parameter field identifier", example = "port", accessMode = READ_WRITE)
    private String field;

    /**
     * Field type, style (mostly map the input tag type attribute)
     */
    @Schema(title = "Field type, style (mostly map the input tag type attribute)", example = "number", accessMode = READ_WRITE)
    private String type;

    /**
     * Is it mandatory true-required false-optional
     */
    @Schema(title = "Is it mandatory true-required false-optional", example = "true", accessMode = READ_WRITE)
    private boolean required = false;

    /**
     * Parameter Default Value
     */
    @Schema(title = "Parameter default values", example = "12", accessMode = READ_WRITE)
    private String defaultValue;

    /**
     * Parameter input box prompt information
     */
    @Schema(title = "Parameter input field prompt information", example = "enter your password", accessMode = READ_WRITE)
    private String placeholder;

    /**
     * When type is number, use range to represent the range eg: 0-233
     */
    @Schema(title = "When type is number, the range is represented by the range interval", example = "[0,233]", accessMode = READ_WRITE)
    @Column(name = "param_range")
    private String range;

    /**
     * When type is text, use limit to indicate the limit size of the string. The maximum is 255
     */
    @Schema(title = "When type is text, use limit to indicate the limit size of the string. The maximum is 255",
            example = "30", accessMode = READ_WRITE)
    @Column(name = "param_limit")
    private Short limit;

    /**
     * When the type is radio radio box, checkbox checkbox, options represents a list of optional values
     * eg: {
     * "key1":"value1",
     * "key2":"value2"
     * }
     * key-Value display label
     * value-True value
     */
    @Schema(description = "When the type is radio radio box, checkbox checkbox, options represents a list of optional values",
            example = "{key1,value1}", accessMode = READ_WRITE)
    @Column(name = "param_options", length = 2048)
    @Convert(converter = JsonOptionListAttributeConverter.class)
    private List<Option> options;

    /**
     * Valid when type is key-value, indicating the alias description of the key
     */
    @Schema(title = "Valid when type is key-value, indicating the alias description of the key", example = "Name", accessMode = READ_WRITE)
    private String keyAlias;

    /**
     * Valid when type is key-value, indicating the alias description of value type
     */
    @Schema(title = "Valid when type is key-value, indicating the alias description of value type", example = "Value", accessMode = READ_WRITE)
    private String valueAlias;

    /**
     * Is it an advanced hidden parameter true-yes false-no
     */
    @Schema(title = "Is it an advanced hidden parameter true-yes false-no", example = "true", accessMode = READ_WRITE)
    private boolean hide = false;

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
    @Schema(title = "Record create time", example = "1612198922000", accessMode = READ_ONLY)
    @CreatedDate
    private LocalDateTime gmtCreate;

    /**
     * Record the latest modification time
     */
    @Schema(title = "Record modify time", example = "1612198444000", accessMode = READ_ONLY)
    @LastModifiedDate
    private LocalDateTime gmtUpdate;

    /**
     *  Depends on which parameters
     */
    @Schema(title = "Depends on which parameters", example = "{field:[value1, value2, ...]}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    private Map<String, List<Object>> depend;

    /**
     * Parameter option configuration
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static final class Option {
        /**
         * value display label
         */
        private String label;
        /**
         * optional value
         */
        private String value;
    }
}
