package org.apache.arrow.vector.table;

import static java.util.Arrays.asList;
import static org.junit.jupiter.api.Assertions.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.channels.Channels;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.IntVector;
import org.apache.arrow.vector.VarCharVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.arrow.vector.types.pojo.Schema;
import org.junit.jupiter.api.Test;

/**
 * test for arrow table
 */
class ArrowTableTest {

    @Test
    void testArrow() {
        BufferAllocator allocator = new RootAllocator();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("K1", "V1");
        metadata.put("K2", "V2");
        Field a = new Field("age", FieldType.nullable(new ArrowType.Int(32, true)), /*children*/ null);
        Field b = new Field("name", FieldType.nullable(new ArrowType.Utf8()), /*children*/ null);
        Schema schema = new Schema(asList(a, b), metadata);
        VectorSchemaRoot root = VectorSchemaRoot.create(schema, allocator);
        IntVector ageVector = (IntVector) root.getVector("age");
        VarCharVector nameVector = (VarCharVector) root.getVector("name");
        ageVector.allocateNew(3);
        ageVector.set(0, 10);
        ageVector.set(1, 20);
        ageVector.set(2, 30);
        nameVector.allocateNew(3);
        nameVector.set(0, "Dave".getBytes(StandardCharsets.UTF_8));
        nameVector.set(1, "Peter".getBytes(StandardCharsets.UTF_8));
        nameVector.set(2, "Mary".getBytes(StandardCharsets.UTF_8));
        root.setRowCount(3);

        assertEquals(3, root.getRowCount());
        Table t = new Table(root);
        assertEquals(3, t.getRowCount());
        Table t2 = t.slice(2);
        root.close();
        VectorSchemaRoot root2 = t.toVectorSchemaRoot();
        assertEquals(3, root2.getRowCount());
        assertEquals(0, t.getRowCount());
        assertEquals(1, t2.getRowCount());
        assertEquals(0, root.getRowCount());
    }

    @Test
    void testArrow3() {
        BufferAllocator allocator = new RootAllocator();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("K1", "V1");
        metadata.put("K2", "V2");
        Field a = new Field("age", FieldType.nullable(new ArrowType.Int(32, true)), /*children*/ null);
        Field b = new Field("name", FieldType.nullable(new ArrowType.Utf8()), /*children*/ null);
        Schema schema = new Schema(asList(a, b), metadata);
        VectorSchemaRoot root = VectorSchemaRoot.create(schema, allocator);
        IntVector ageVector = (IntVector) root.getVector("age");
        VarCharVector nameVector = (VarCharVector) root.getVector("name");
        ageVector.allocateNew(3);
        ageVector.set(0, 10);
        ageVector.set(1, 20);
        ageVector.set(2, 30);
        nameVector.allocateNew(3);
        nameVector.set(0, "Dave".getBytes(StandardCharsets.UTF_8));
        nameVector.set(1, "Peter".getBytes(StandardCharsets.UTF_8));
        nameVector.set(2, "Mary".getBytes(StandardCharsets.UTF_8));
        root.setRowCount(3);

        assertEquals(3, root.getRowCount());
        ArrowTable t = new ArrowTable(root);
        assertEquals(3, t.getRowCount());
        VectorSchemaRoot root1 = t.toVectorSchemaRoot();
        assertEquals(3, root1.getRowCount());
        assertEquals("V1", root1.getSchema().getCustomMetadata().get("K1"));
        ArrowTable t2 = new ArrowTable(root1);
        assertEquals(3, t2.getRowCount());
        assertEquals("V1", t2.getSchema().getCustomMetadata().get("K1"));
        VectorSchemaRoot root2 = t2.toVectorSchemaRoot();

        byte[] bytes = null;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ArrowStreamWriter writer = new ArrowStreamWriter(root2, null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            bytes = out.toByteArray();
        } catch (IOException e) {}
        assertEquals(3, root2.getRowCount());
        root2.close();
        BufferAllocator bufferAllocator = new RootAllocator();
        try (ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(bytes);
             ArrowStreamReader arrowStreamReader = new ArrowStreamReader(byteArrayInputStream, bufferAllocator)) {
            arrowStreamReader.loadNextBatch();
            VectorSchemaRoot schemaRoot = arrowStreamReader.getVectorSchemaRoot();
            assertEquals(3, schemaRoot.getRowCount());
            assertEquals(schemaRoot.getSchema().getCustomMetadata().get("K1"), "V1");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testArrow2() {
        BufferAllocator allocator = new RootAllocator();
        Map<String, String> metadata = new HashMap<>();
        metadata.put("K1", "V1");
        metadata.put("K2", "V2");
        Field a = new Field("age", FieldType.nullable(new ArrowType.Int(32, true)), /*children*/ null);
        Field b = new Field("name", FieldType.nullable(new ArrowType.Utf8()), /*children*/ null);
        Schema schema = new Schema(asList(a, b), metadata);
        VectorSchemaRoot root = VectorSchemaRoot.create(schema, allocator);
        IntVector ageVector = (IntVector) root.getVector("age");
        VarCharVector nameVector = (VarCharVector) root.getVector("name");
        ageVector.allocateNew(3);
        ageVector.set(0, 10);
        ageVector.set(1, 20);
        ageVector.set(2, 30);
        nameVector.allocateNew(3);
        nameVector.set(0, "Dave".getBytes(StandardCharsets.UTF_8));
        nameVector.set(1, "Peter".getBytes(StandardCharsets.UTF_8));
        nameVector.set(2, "Mary".getBytes(StandardCharsets.UTF_8));
        root.setRowCount(3);

        assertEquals(3, root.getRowCount());
        byte[] bytes = null;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ArrowStreamWriter writer = new ArrowStreamWriter(root, null, Channels.newChannel(out))) {
            writer.start();
            writer.writeBatch();
            writer.end();
            bytes = out.toByteArray();
        } catch (IOException e) {}
        assertEquals(3, root.getRowCount());
        root.close();
        BufferAllocator bufferAllocator = new RootAllocator();
        try (ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(bytes);
             ArrowStreamReader arrowStreamReader = new ArrowStreamReader(byteArrayInputStream, bufferAllocator)) {
            arrowStreamReader.loadNextBatch();
            VectorSchemaRoot schemaRoot = arrowStreamReader.getVectorSchemaRoot();
            assertEquals(3, schemaRoot.getRowCount());
            assertEquals(schemaRoot.getSchema().getCustomMetadata().get("K1"), "V1");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }
}
