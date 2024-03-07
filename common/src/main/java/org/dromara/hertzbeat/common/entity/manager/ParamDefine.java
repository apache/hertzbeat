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

package org.dromara.hertzbeat.common.entity.manager;

import org.dromara.hertzbeat.common.entity.alerter.JsonMapAttributeConverter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Monitoring parameter definitions
 * 监控参数定义
 * @author tomsun28
 */
@Entity
@Table(name = "hzb_param_define")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Parameter structure definition entity | 参数结构定义实体")
@EntityListeners(AuditingEntityListener.class)
public class ParamDefine {

    /**
     * Parameter Structure ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(title = "参数结构ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    /**
     * Monitoring application type name
     * 监控应用类型名称
     */
    @Schema(title = "监控类型", example = "TanCloud", accessMode = READ_WRITE)
    private String app;

    /**
     * Parameter field external display name
     * zh-CN: 端口
     * en-US: Port
     * 参数字段对外显示名称
     */
    @Schema(description = "参数字段显示国际化名称", example = "{zh-CN: '端口'}", accessMode = READ_WRITE)
    @Convert(converter = JsonMapAttributeConverter.class)
    @SuppressWarnings("JpaAttributeTypeInspection")
    @Column(length = 2048)
    private Map<String, String> name;

    /**
     * Parameter Field Identifier
     * 参数字段标识符
     */
    @Schema(title = "参数字段标识符", example = "port", accessMode = READ_WRITE)
    private String field;

    /**
     * Field type, style (mostly map the input tag type attribute)
     * 字段类型,样式(大部分映射input标签type属性)
     */
    @Schema(title = "字段类型,样式(大部分映射input标签type属性)", example = "number", accessMode = READ_WRITE)
    private String type;

    /**
     * Is it mandatory true-required false-optional
     * 是否是必输项 true-必填 false-可选
     */
    @Schema(title = "是否是必输项 true-必填 false-可选", example = "true", accessMode = READ_WRITE)
    private boolean required = false;

    /**
     * Parameter Default Value
     * 参数默认值
     */
    @Schema(title = "参数默认值", example = "12", accessMode = READ_WRITE)
    private String defaultValue;

    /**
     * Parameter input box prompt information
     * 参数输入框提示信息
     */
    @Schema(title = "参数输入框提示信息", example = "请输入密码", accessMode = READ_WRITE)
    private String placeholder;

    /**
     * When type is number, use range to represent the range eg: 0-233
     * 当type为number时,用range表示范围 eg: 0-233
     */
    @Schema(title = "当type为number时,用range区间表示范围", example = "[0,233]", accessMode = READ_WRITE)
    @Column(name = "param_range")
    private String range;

    /**
     * When type is text, use limit to indicate the limit size of the string. The maximum is 255
     * 当type为text时,用limit表示字符串限制大小.最大255
     */
    @Schema(title = "当type为text时,用limit表示字符串限制大小.最大255", example = "30", accessMode = READ_WRITE)
    @Column(name = "param_limit")
    private Short limit;

    /**
     * When the type is radio radio box, checkbox checkbox, options represents a list of optional values
     * 当type为radio单选框,checkbox复选框时,options表示可选项值列表
     * eg: {
     * "key1":"value1",
     * "key2":"value2"
     * }
     * key-值显示标签
     * value-真正值
     */
    @Schema(description = "当type为radio单选框,checkbox复选框时,option表示可选项值列表", example = "{key1,value1}", accessMode = READ_WRITE)
    @Column(name = "param_options", length = 2048)
    @Convert(converter = JsonOptionListAttributeConverter.class)
    private List<Option> options;

    /**
     * Valid when type is key-value, indicating the alias description of the key
     * 当type为key-value时有效,表示key的别名描述
     */
    @Schema(title = "当type为key-value时有效,表示key的别名描述", example = "Name", accessMode = READ_WRITE)
    private String keyAlias;

    /**
     * Valid when type is key-value, indicating the alias description of value type
     * 当type为key-value时有效,表示value的别名描述
     */
    @Schema(title = "当type为key-value时有效,表示value的别名描述", example = "Value", accessMode = READ_WRITE)
    private String valueAlias;

    /**
     * Is it an advanced hidden parameter true-yes false-no
     * 是否是高级隐藏参数 true-是 false-否
     */
    @Schema(title = "是否是高级隐藏参数 true-是 false-否", example = "true", accessMode = READ_WRITE)
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
     * Parameter option configuration
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static final class Option {
        /**
         * value display label
         * 值显示标签
         */
        private String label;
        /**
         * optional value
         * 可选值
         */
        private String value;
    }
}
