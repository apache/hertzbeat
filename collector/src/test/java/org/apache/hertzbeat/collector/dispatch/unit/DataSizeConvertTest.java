package org.apache.hertzbeat.collector.dispatch.unit;

import org.apache.hertzbeat.collector.dispatch.unit.impl.DataSizeConvert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link DataSizeConvert}
 */

class DataSizeConvertTest {

	private DataSizeConvert convert;

	@BeforeEach
	void setUp() {
		this.convert = new DataSizeConvert();
	}

	@Test
	void testConvert() {

		assertEquals("1", convert.convert("1024", "B", "KB"));
		assertEquals("1024", convert.convert("1024", "B", "B"));
		assertEquals("1", convert.convert("1024", "B", "kb"));
		assertEquals("1", convert.convert("1024", "b", "kb"));
		assertEquals("1", convert.convert("1024", "KB", "MB"));
		assertEquals("1", convert.convert("1024", "MB", "GB"));
		assertNull(convert.convert("", "B", "KB"));
		assertNull(convert.convert("1024", "INVALID", "KB"));
		assertNull(convert.convert("1024", "B", "INVALID"));

	}

	@Test
	void testCheckUnit() {
		assertTrue(convert.checkUnit("KB"));
		assertTrue(convert.checkUnit("kb"));
		assertTrue(convert.checkUnit("Kb"));
		assertTrue(convert.checkUnit("kB"));
		assertTrue(convert.checkUnit("MB"));
		assertTrue(convert.checkUnit("GB"));
		assertFalse(convert.checkUnit("INVALID"));
		assertFalse(convert.checkUnit(null));
		assertFalse(convert.checkUnit(""));
	}

}
