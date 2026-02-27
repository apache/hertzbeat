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

package org.apache.hertzbeat.common.entity.arrow;

import lombok.Getter;
import org.apache.arrow.vector.table.Row;
import org.apache.arrow.vector.types.pojo.Field;

import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Stream;

/**
 * A wrapper of row, which contains row info, fields info in this row and each cell of field.
 * When using RowWrapper, it is necessary to call {@link RowWrapper#hasNextRow()} and {@link RowWrapper#nextRow()}
 */
public class RowWrapper {
    private final Row currentRow;
    private final Iterator<Row> rowIterator;
    @Getter
    private final List<Field> fieldList;
    @Getter
    private int rowIndex;
    private int fieldIndex;

    public RowWrapper(Row row, Iterator<Row> rowIterator, List<Field> fieldList, int rowIndex) {
        this.currentRow = row;
        this.rowIterator = rowIterator;
        this.fieldList = fieldList;
        this.fieldIndex = 0;
        this.rowIndex = rowIndex;
    }

    public boolean hasNextRow() {
        return rowIterator.hasNext();
    }

    public RowWrapper nextRow() {
        return new RowWrapper(rowIterator.next(), rowIterator, fieldList, ++rowIndex);
    }

    /**
     * <p>Get next cell in current row.
     * <p>RowWrapper maintain a field index internally, which means cannot back to previous cell after call this method.
     * However, you can use {@link RowWrapper#resetCellIndex()} to reset field index to the beginning.
     * @return ArrowCell
     */
    public ArrowCell nextCell() {
        if (!hasNextCell() || currentRow == null) {
            throw new NoSuchElementException("No more cells in current row");
        }
        return new ArrowCell(fieldList.get(fieldIndex++), currentRow);
    }

    public Stream<ArrowCell> cellStream() {
        return fieldList.stream().map(field -> new ArrowCell(field, currentRow));
    }

    public boolean hasNextCell() {
        return fieldIndex < fieldList.size();
    }

    public void resetCellIndex() {
        this.fieldIndex = 0;
    }
}
