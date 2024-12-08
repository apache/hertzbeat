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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 */
public class RowWrapper {
    private final Row currentRow;
    private final Iterator<Row> rowIterator;
    @Getter
    private final List<Field> fieldList;
    private int index;

    public RowWrapper(Row row, Iterator<Row> rowIterator, List<Field> fieldList) {
        this.currentRow = row;
        this.rowIterator = rowIterator;
        this.fieldList = fieldList;
        this.index = 0;
    }

    public boolean hasNextRow() {
        return rowIterator.hasNext();
    }

    public RowWrapper nextRow() {
        return new RowWrapper(rowIterator.next(), rowIterator, fieldList);
    }

    public ArrowCell nextCell() {
        if (!hasNextCell() || currentRow == null) {
            throw new NoSuchElementException("No more cells in current row");
        }

        return new ArrowCell(fieldList.get(index++), currentRow);
    }

    public void foreach(Consumer<ArrowCell> cellConsumer) {
        while (hasNextCell()) {
            cellConsumer.accept(nextCell());
        }
    }

    public <R> List<R> map(Function<ArrowCell, R> function) {
        List<R> result = new ArrayList<>();

        while (hasNextCell()) {
            result.add(function.apply(nextCell()));
        }

        return result;
    }

    public boolean hasNextCell() {
        return index < fieldList.size();
    }

}
