package org.dromara.hertzbeat.common.util.prometheus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * prometheus label entity
 *
 *
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Label {
    private String name;
    private String value;
}
