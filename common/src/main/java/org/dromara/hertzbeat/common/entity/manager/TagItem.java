package org.dromara.hertzbeat.common.entity.manager;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

/**
 * tag item
 *
 * @author tom
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
public class TagItem {

    @Schema(title = "Tag Name")
    @NotBlank
    private String name;

    @Schema(title = "Tag Value")
    private String value;

}
