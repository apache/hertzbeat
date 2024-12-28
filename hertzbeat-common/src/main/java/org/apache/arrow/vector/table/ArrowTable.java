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

package org.apache.arrow.vector.table;

import java.util.Iterator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.arrow.vector.FieldVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.dictionary.DictionaryProvider;
import org.apache.arrow.vector.types.pojo.Schema;
import org.apache.arrow.vector.util.TransferPair;

/**
 * <p>A temporary Arrow Table implementation that uses Arrow's FieldVectors to store data.</p>
 * <p>Instead of Table, due the table can not store the schema metadata, so we need to use ArrowTable to store the schema metadata.</p>
 * <p>todo Improve the upstream branch `table` to support schema metadata.</p>
 */
@Slf4j
public class ArrowTable extends BaseTable {
    
    /**
     * Constructs new instance with the given rowCount, and containing the schema and each of the
     * given vectors.
     *
     * @param fieldVectors the FieldVectors containing the table's data
     * @param rowCount     the number of rows in the table
     * @param provider     a dictionary provider, may be null if none of the vectors in the table are
     *                     encoded
     */
    public ArrowTable(List<FieldVector> fieldVectors, int rowCount, DictionaryProvider provider) {
        super(fieldVectors, rowCount, provider);
    }

    /**
     * Constructs a new instance containing the data from the argument. Vectors are shared between the
     * Table and VectorSchemaRoot. Direct modification of those vectors is unsafe and should be
     * avoided.
     *
     * @param vsr The VectorSchemaRoot providing data for this Table
     */
    public ArrowTable(VectorSchemaRoot vsr) {
        this(vsr.getFieldVectors(), vsr.getRowCount(), null);
        try {
            this.schema = Schema.fromJSON(vsr.getSchema().toJson());   
        } catch (Exception e) {
            log.error("Failed to parse arrow table schema from VectorSchemaRoot", e);
        }
        vsr.clear();
    }

    @Override
    public VectorSchemaRoot toVectorSchemaRoot() {
        List<FieldVector> fieldVectorList = fieldVectors.stream()
                .map(
                        v -> {
                            TransferPair transferPair = v.getTransferPair(v.getAllocator());
                            transferPair.transfer();
                            return (FieldVector) transferPair.getTo();
                        })
                .toList();
        VectorSchemaRoot vsr =
                new VectorSchemaRoot(schema, fieldVectorList, rowCount);
        clear();
        return vsr;
    }

    public FieldVector getVector(String columnName) {
        return super.getVector(columnName);
    }
    
    /** Returns a Row iterator for this Table. */
    public Iterator<Row> iterator() {

        return new Iterator<Row>() {

            private final Row row = new Row(ArrowTable.this);

            @Override
            public Row next() {
                row.next();
                return row;
            }

            @Override
            public boolean hasNext() {
                return row.hasNext();
            }
        };
    }
    
}
