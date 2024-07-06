package org.apache.hertzbeat.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test for {@link MapCapUtil}
 */
class MapCapUtilTest {

	@Test
	public void testCalInitMap() {
		int size = 0;
		int expectedCapacity = (int) Math.ceil(size / 0.75);
		int actualCapacity = MapCapUtil.calInitMap(size);

		assertEquals(expectedCapacity, actualCapacity);

		size = 10;
		expectedCapacity = (int) Math.ceil(size / 0.75);
		actualCapacity = MapCapUtil.calInitMap(size);

		assertEquals(expectedCapacity, actualCapacity);
	}

}
