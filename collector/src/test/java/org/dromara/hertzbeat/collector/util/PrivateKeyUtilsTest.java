/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.dromara.hertzbeat.collector.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/7/9
 */
class PrivateKeyUtilsTest {

    @DisplayName("write key to ~/.ssh")
    @Test
    void writePrivateKey() throws IOException {
        var key = "-----BEGIN RSA PRIVATE KEY-----\n" +
                "MIIEogIBAAKCAQEA4ctFYk/xy89L6/6YFeeMrwCW9lCP/ThXMn+9G63s5bGn4oIN\n" +
                "8cEf/JYkmGw8vMP41IAP9dyH8ji2wIZSLeTPWucEK6P6jA01iIBQ95ng6RTsnQgL\n" +
                "h4pYHxlEaNHcXkjy5GlMdzaWadjdRevpThGR1VOtWFtK3yoC0c/te2Junu04f+11\n" +
                "cpk8QvmVfzrBUooVnG0/7oekwUy1c5sSl0qVoLzXOv4XG9w34cyvacFC30zv1Nl8\n" +
                "ASi2pmOBVx9njPvqQ7qZrDk0nwn+RZUmGh/PbmHxrBV7ZA5NjZcEnf2VGIfjGUVu\n" +
                "qE4VnkbvS4j03afV2rsp1yo74K+k/ZC6GCHB5QIBIwKCAQBG9r4I9I3SVxfcdJYy\n" +
                "xR2WFiDREgFeNkdKYqkl9NVsws5dIY9am8g5cQQv54DNnK1KGZ6dulaclXtD0nGZ\n" +
                "ZSs505OYr+EHcd2f7dBN0Uavp32QcD4jSLycD0FixZ0HsIbaEnceJxlUd1t8YBYf\n" +
                "2aLcpUUbxOulORbUOgjPAa286uDeQYN5IbdruDfvbuFFm7hBoGZoKLJ7FPcJ0U3A\n" +
                "14KRK+Z1oCYJIS0ubaHbhaPIVPPQEmTNHpsvxIJXfZtVy9+XIuBGmD3+Aq6SSFPC\n" +
                "A8mU1iKzzdRCXZwvPeUiivIIZc6DRXjhtJ2Lya/XndKidOT/QUj8Z+f9pWAonlzM\n" +
                "3PMXAoGBAPvzctkkDjUJjLyEuYQq8soYokS4n4ykFTP5oFgnodK/cYocbxTT6Tn9\n" +
                "vH7b6lK6ZAf+tZk8rcEeIO650pOvmaa1/OuZSxfcFUGBvOvYXiHF7zmkePh/pQgB\n" +
                "7Cl0RYrI52Cjbd9aCUIYK3A82qsUq30INGeOhMNrfaHn2pgx8xlDAoGBAOVsNctw\n" +
                "CHnLaIQX8eS+eUcQEm+NZppnDBJavdpP48ZZM/t5v/2fQ5ytbYqk0KEzIGu0dP8g\n" +
                "jfB76JbMvStvTfB+TrXsfhGyA3oJrEcG+3IUshsRU2sohT1ScY27z2VMLgilnWvF\n" +
                "7t49sQm9uB/yn669n8LIciHxDItOpvqgKdG3AoGBAO2NxA6PtZ+4jAIz/19bsbc7\n" +
                "zDIqaovrKe8tMMglXg/ZE0e0aLvdvqRkRAKU1Z51Ob5lLuDwEYoyWZCgk1gL90Vp\n" +
                "wpT+P3zlcyCBo39IWMDB8C8IydRbF/GbaaNtoKds92m+qWwwUd87XCf+3M0wvvI6\n" +
                "75TW1PLEbyOgFz8Khh8hAoGBAJbDc87Ul9sCAtp2Ip2hvWk2coPR8vfADz9C8cn5\n" +
                "/BShBOcVfipSt2b1n8GCP/TnFU4XgBVeiSkA9+4Rg6AzMzejdY1+JvWvfqCnRVM/\n" +
                "GkOnMzZb17tyZi+ck8OKC/IcHkAyUYFWL0GWQSOojvBsPQxt+0V8aEIwsHjNSSha\n" +
                "nyNpAoGAd0XqdByRxbWgg5ZsvM0tvrpMITpEZsGMG9VeQPGl0wsQvC2zw5QGLvz/\n" +
                "57YhofOOr0M3yElcFA9Imvek5CYZsyL8eIWGZyadfRiYvGOUyvDDO3BYRG4DmhyF\n" +
                "KVk3URjEuOCC29ORvZ/7HaCO9iuEbvAA/mrAtd7KdCA+3PzfEOw=\n" +
                "-----END RSA PRIVATE KEY-----";
        PrivateKeyUtils.writePrivateKey("127.0.0.1", key);
    }
}