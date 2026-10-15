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

package org.apache.hertzbeat.common.observability.query;

import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ArithmeticFormulaValidatorTest {
    @Test
    void retainsBoundedGrammarAndRejectsOtherReferences() {
        ArithmeticFormulaValidator.validate("100*b/a+pow(abs(a),2)+log2(a)+log10(maximum(a,b))", Set.of("a", "b"));
        for (String source : new String[] {"", " ", "a+c", "pow(a)", "log2(a,b)", "a;exit()", "a".repeat(257),
                "(".repeat(25) + "a" + ")".repeat(25)}) {
            assertThrows(IllegalArgumentException.class, () -> ArithmeticFormulaValidator.validate(source, Set.of("a", "b")));
        }
    }
}
