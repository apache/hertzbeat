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

package org.apache.hertzbeat.manager.setup.installation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Permanent marker proving that setup completed for one local installation. */
@Entity
@Table(name = "hzb_installation")
public class InstallationRecord {
    static final short SINGLETON_ID = 1;

    @Id
    private Short id;
    @Column(name = "installation_fingerprint", nullable = false, length = 64, unique = true)
    private String fingerprint;
    @Column(nullable = false)
    private boolean complete;

    protected InstallationRecord() {
    }

    InstallationRecord(String fingerprint) {
        this.id = SINGLETON_ID;
        this.fingerprint = fingerprint;
        this.complete = true;
    }

    String fingerprint() {
        return fingerprint;
    }

    boolean complete() {
        return complete;
    }

    @Override
    public String toString() {
        return "InstallationRecord[complete=" + complete + "]";
    }
}
