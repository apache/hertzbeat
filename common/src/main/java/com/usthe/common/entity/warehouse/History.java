package com.usthe.common.entity.warehouse;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * metrics history
 *
 * @author tom
 * @date 2023/2/3 14:13
 */
@Entity
@Table(name = "hzb_history")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Metrics data history entity | 指标数据历史实体")
public class History {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "指标数据历史实体主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "监控ID", example = "87432674336", accessMode = READ_WRITE)
    private Long monitorId;

    @Schema(title = "监控类型 mysql oracle db2")
    private String app;

    @Schema(title = "指标集合名称 innodb disk cpu")
    private String metrics;

    @Schema(title = "指标名称 usage speed count")
    private String metric;

    @Schema(title = "实例")
    private String instance;

    @Schema(title = "字段类型 0: 数值 1：字符串")
    private Byte metricType;

    @Schema(title = "字符值")
    @Column(length = 1024)
    private String str;

    @Schema(title = "数值")
    private Double dou;

    @Schema(title = "采集时间戳")
    private Long time;

}
