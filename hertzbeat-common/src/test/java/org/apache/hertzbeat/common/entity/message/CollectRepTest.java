package org.apache.hertzbeat.common.entity.message;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test case for {@link CollectRep}
 */
public class CollectRepTest {

    @ParameterizedTest
    @CsvSource(value = {
            "name, name, true",
            "name1, name3, false",
    })
    void testFieldEquals(String name1, String name2, boolean result) {
        CollectRep.Field field1 = new CollectRep.Field();
        field1.setName(name1);
        CollectRep.Field field2 = new CollectRep.Field();
        field2.setName(name2);
       
        assertEquals(field1.equals(field2), result);
    }

}
