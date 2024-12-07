package org.apache.hertzbeat.common.entity.arrow;

import lombok.Data;
import org.apache.arrow.vector.table.Row;
import org.apache.arrow.vector.types.pojo.Field;

import java.util.Map;

/**
 */
@Data
public class ArrowCell {
    private final String value;
    private final Field field;
    private final Map<String, String> metadata;

    public ArrowCell(Field field, Row row) {
        this.field = field;
        this.value = row.getVarCharObj(field.getName());
        this.metadata = field.getMetadata();
    }
}
