package org.apache.hertzbeat.common.entity.arrow;


import org.apache.arrow.vector.types.pojo.Field;

import java.util.List;

/**
 */
public interface ArrowVectorReader extends AutoCloseable {
    RowWrapper readRow();

    List<Field> getAllFields();

    long getRowCount();
}
