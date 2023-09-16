package org.dromara.hertzbeat.common.entity.push;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;

/**
 * push metrics entity
 *
 * @author vinci
 */
@Entity
@Table(name = "hzb_push_metrics", indexes = {
        @Index(name = "push_query_index", columnList = "monitorId"),
        @Index(name = "push_query_index", columnList = "time")
})
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class PushMetrics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long monitorId;
    private Long time;
    private String metrics;
}
