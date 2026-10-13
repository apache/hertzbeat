/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class MetadataMigrationSessionTest {

    @Test
    void rollbackFailureInvalidatesTargetWithoutEnablingAutoCommit() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("PostgreSQL");
        doThrow(new SQLException("private rollback diagnostic")).when(target).rollback();
        MetadataMigrationSession session = new MetadataMigrationSession(source, target);
        session.begin(MetadataDatabaseKind.POSTGRESQL);

        assertThatThrownBy(session::close)
                .isInstanceOfSatisfying(MetadataMigrationException.class, exception -> {
                    assertThat(exception.code())
                            .isEqualTo(MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN);
                    assertThat(exception).hasNoCause();
                });

        verify(target).close();
        verify(target, never()).setAutoCommit(true);
    }

    @Test
    void partialBeginRestoresSourceWhenTargetTransactionCannotStart() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("MySQL");
        doThrow(new SQLException("private target diagnostic")).when(target).setAutoCommit(false);
        MetadataMigrationSession session = new MetadataMigrationSession(source, target);

        assertThatThrownBy(() -> session.begin(MetadataDatabaseKind.MYSQL)).isInstanceOf(SQLException.class);
        assertThatThrownBy(session::close).isInstanceOf(MetadataMigrationException.class).hasNoCause();

        InOrder sourceOrder = inOrder(source);
        sourceOrder.verify(source).setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
        sourceOrder.verify(source).setReadOnly(true);
        sourceOrder.verify(source).setAutoCommit(false);
        sourceOrder.verify(source).rollback();
        sourceOrder.verify(source).setAutoCommit(true);
        sourceOrder.verify(source).setReadOnly(false);
        sourceOrder.verify(source).setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        verify(target).close();
    }

    @Test
    void committedRowsRemainSuccessWhenCallerConnectionCannotBeRestored() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("MySQL");
        doThrow(new SQLException("private cleanup diagnostic")).when(target).setAutoCommit(true);
        MetadataMigrationSession session = new MetadataMigrationSession(source, target);
        session.begin(MetadataDatabaseKind.MYSQL);
        session.commit();

        session.close();

        verify(target).commit();
        verify(target).close();
        verify(target, never()).rollback();
    }

    @Test
    void commitExceptionHasAnExplicitOutcomeUnknownCodeAndNeverRollsBackBlindly() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("PostgreSQL");
        doThrow(new SQLException("private commit diagnostic")).when(target).commit();
        MetadataMigrationSession session = new MetadataMigrationSession(source, target);
        session.begin(MetadataDatabaseKind.POSTGRESQL);

        assertThatThrownBy(session::commit)
                .isInstanceOfSatisfying(MetadataMigrationException.class, exception -> {
                    assertThat(exception.code()).isEqualTo(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN);
                    assertThat(exception).hasNoCause();
                });
        session.close();

        verify(target, never()).rollback();
        verify(target, never()).setAutoCommit(true);
        verify(target).close();
    }

    @Test
    void rollbackOutcomeUnknownTakesPriorityOverBodyFailure() throws Exception {
        Connection source = connection("H2");
        Connection target = connection("MySQL");
        doThrow(new SQLException("private rollback diagnostic")).when(target).rollback();
        Throwable failure = catchThrowable(() -> {
            try (MetadataMigrationSession session = new MetadataMigrationSession(source, target)) {
                session.begin(MetadataDatabaseKind.MYSQL);
                throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
            }
        });

        assertThat(failure).isInstanceOf(MetadataMigrationException.class);
        assertThat(JdbcMetadataMigration.cleanupFailure((Exception) failure).code())
                .isEqualTo(MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN);
    }

    private static Connection connection(String product) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn(product);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.getTransactionIsolation()).thenReturn(Connection.TRANSACTION_READ_COMMITTED);
        when(connection.isReadOnly()).thenReturn(false);
        return connection;
    }
}
