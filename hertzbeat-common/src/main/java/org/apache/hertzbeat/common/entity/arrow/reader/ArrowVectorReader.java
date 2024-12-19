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


import org.apache.arrow.vector.types.pojo.Field;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;

import java.util.List;

/**
 * <p>Used for reading Apache Arrow data bytes.
 * <p>After creating ArrowVectorReader, data structures will be organized like:
 * <p>RowWrapper 1 -- ArrowCell 1 -> ArrowCell 2 -> ArrowCell ...
 * <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|
 * <p>RowWrapper 2 -- ArrowCell 1 -> ArrowCell 2 -> ArrowCell ...
 * <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|
 * <p>RowWrapper 3 -- ArrowCell 1 -> ArrowCell 2 -> ArrowCell ...
 * <p>
 * <p>
 * <p>Before operating this structure, you should call {@link ArrowVectorReader#readRow()} to get a {@link RowWrapper}.
 * Then you can use it like a iterator.
 */
public interface ArrowVectorReader extends AutoCloseable {
    /**
     * Get a RowWrapper
     * @return RowWrapper
     */
    RowWrapper readRow();

    /**
     * Returns all fields in this ArrowVectorReader.
     */
    List<Field> getAllFields();

    /**
     * Returns the number of RowWrapper in this ArrowVectorReader.
     */
    long getRowCount();
}
