package org.dromara.hertzbeat.common.entity.warehouse;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;

import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_ONLY;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * metrics history data entity
 * @author tom
 */
@Entity
@Table(name = "hzb_history", indexes = {
        @Index(name = "history_query_index", columnList = "monitorId"),
        @Index(name = "history_query_index", columnList = "app"),
        @Index(name = "history_query_index", columnList = "metrics"),
        @Index(name = "history_query_index", columnList = "metric")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Metrics History Data Entity | 指标数据历史实体")
public class History {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY, generator = "myid")
    @GenericGenerator(name = "myid", strategy = "org.dromara.hertzbeat.common.util.SnowFlakeIdGenerator")
    @Schema(description = "指标数据历史实体主键索引ID", example = "87584674384", accessMode = READ_ONLY)
    private Long id;

    @Schema(title = "Monitoring Id", example = "87432674336", accessMode = READ_WRITE)
    private Long monitorId;

    @Schema(title = "Monitoring Type mysql oracle db2")
    private String app;

    @Schema(title = "Monitoring Metrics innodb disk cpu")
    private String metrics;

    @Schema(title = "Monitoring Metric usage speed count")
    private String metric;
    
    @Column(length = 5000)
    private String instance;

    @Schema(title = "Metric Type 0: Number 1：String")
    private Byte metricType;

    @Schema(title = "Metric String Value")
    @Column(length = 2048)
    private String str;

    @Schema(title = "Metric Integer Value")
    private Integer int32;

    @Schema(title = "Metric Number Value")
    private Double dou;

    @Schema(title = "Collect Time")
    private Long time;

}
