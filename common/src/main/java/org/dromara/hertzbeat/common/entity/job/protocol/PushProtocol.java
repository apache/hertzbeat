package org.dromara.hertzbeat.common.entity.job.protocol;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dromara.hertzbeat.common.entity.dto.Field;

import java.util.List;

/**
 * push protocol definition
 *
 * @author vinci
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PushProtocol {
    private String host;
    private String port;
    private String uri = "/api/push";
    private List<Field> fields;
}
