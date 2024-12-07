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

    public void handleRestCells(Consumer<ArrowCell> cellConsumer) {
        while (hasNextCell()) {
            cellConsumer.accept(nextCell());
        }
    }

    public <R> List<R> mapRestCells(Function<ArrowCell, R> function) {
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
