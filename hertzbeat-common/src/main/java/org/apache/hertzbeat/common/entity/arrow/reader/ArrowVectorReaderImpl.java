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

package org.apache.hertzbeat.common.entity.arrow.reader;

import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.BaseVariableWidthVector;
import org.apache.arrow.vector.VarCharVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.table.Row;
import org.apache.arrow.vector.table.Table;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.hertzbeat.common.entity.arrow.ArrowVector;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * implementation of ArrowVectorReader
 */
public class ArrowVectorReaderImpl implements ArrowVectorReader {
    private final ArrowVector arrowVector;
    private ArrowStreamReader streamReader;
    private final Table table;

    /**
     * todo to be deleted
     */
    @Deprecated
    public ArrowVectorReaderImpl(byte[] bytes) throws IOException {
        BufferAllocator bufferAllocator = new RootAllocator();
        this.streamReader = new ArrowStreamReader(new ByteArrayInputStream(bytes), bufferAllocator);
        this.streamReader.loadNextBatch();
        VectorSchemaRoot schemaRoot = this.streamReader.getVectorSchemaRoot();

        this.arrowVector = new ArrowVector(bufferAllocator, schemaRoot);
        this.table = new Table(schemaRoot);
    }

    public ArrowVectorReaderImpl(ArrowVector arrowVector) {
        this.arrowVector = arrowVector;
        this.table = new Table(arrowVector.getSchemaRoot());
    }

    @Override
    public RowWrapper readRow() {
        final Iterator<Row> rowIterator = table.iterator();
        
        if (!rowIterator.hasNext()) {
            throw new NoSuchElementException("No data found! ");
        }

        return new RowWrapper(null, rowIterator, getAllFields(), -1);
    }

    @Override
    public List<Field> getAllFields() {
        return arrowVector.getSchemaRoot().getFieldVectors().stream()
                .map(valueVectors -> (VarCharVector) valueVectors)
                .map(BaseVariableWidthVector::getField)
                .toList();
    }

    @Override
    public long getRowCount() {
        return this.table.getRowCount();
    }

    @Override
    public void close() throws IOException {
        close(false);
    }

    public void close(boolean closeSource) throws IOException {
        if (this.streamReader != null) {
            this.streamReader.close();
        }

        if (closeSource) {
            this.arrowVector.close();
        }
    }
}
