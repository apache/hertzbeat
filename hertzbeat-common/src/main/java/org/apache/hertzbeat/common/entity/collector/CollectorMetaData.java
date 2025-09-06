package org.apache.hertzbeat.common.entity.collector;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 *
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectorMetaData {
    private String identity;
    private String mode;
    private Date startTime;
}
