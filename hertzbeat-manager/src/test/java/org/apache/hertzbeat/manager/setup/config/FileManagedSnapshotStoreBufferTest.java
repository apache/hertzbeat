/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileManagedSnapshotStoreBufferTest {

    private static final String FILE_NAME = "managed-test.document";

    @TempDir
    private Path installationRoot;

    @Test
    void stageClearsEncodedBuffersAfterSuccessfulAndFailedPublication() throws Exception {
        CapturingCodec successCodec = new CapturingCodec();
        DiskPublisher successPublisher = new DiskPublisher();
        store(successCodec, successPublisher, path -> new byte[0])
                .stageCandidate("success", "generation-one");

        assertAllZero(successCodec.encoded().getFirst());
        assertEquals("success|generation-one", Files.readString(candidatePath(), StandardCharsets.UTF_8));

        CapturingCodec failureCodec = new CapturingCodec();
        DiskPublisher failurePublisher = new DiskPublisher(1);
        assertThrows(IOException.class, () -> store(failureCodec, failurePublisher, path -> new byte[0])
                .stageCandidate("failure", "generation-two"));

        assertAllZero(failureCodec.encoded().getFirst());
    }

    @Test
    void restoreKeepsOneBufferForBothPublishesAndClearsItAfterSuccessOrFailure() throws Exception {
        CapturingCodec successCodec = new CapturingCodec();
        DiskPublisher successPublisher = new DiskPublisher();
        store(successCodec, successPublisher, path -> new byte[0])
                .restoreActive(Optional.of("previous"), Optional.of("generation-one"));

        byte[] successDocument = successCodec.encoded().getFirst();
        assertAllZero(successDocument);
        assertEquals(List.of(activePath(), lastKnownGoodPath()), successPublisher.publishedTargets());
        assertEquals("previous|generation-one", Files.readString(activePath(), StandardCharsets.UTF_8));
        assertEquals("previous|generation-one", Files.readString(lastKnownGoodPath(), StandardCharsets.UTF_8));

        CapturingCodec failureCodec = new CapturingCodec();
        DiskPublisher failurePublisher = new DiskPublisher(2);
        assertThrows(IOException.class, () -> store(failureCodec, failurePublisher, path -> new byte[0])
                .restoreActive(Optional.of("failure"), Optional.of("generation-two")));

        byte[] failedDocument = failureCodec.encoded().getFirst();
        assertAllZero(failedDocument);
        assertEquals(List.of(activePath(), lastKnownGoodPath()), failurePublisher.publishedTargets());
    }

    @Test
    void promotionClearsCandidateActiveAndLastKnownGoodBuffersAfterSuccess() throws Exception {
        byte[] candidateDocument = document("next", "generation-two");
        byte[] activeDocument = document("previous", "generation-one");
        CapturingCodec codec = new CapturingCodec();
        DiskPublisher publisher = new DiskPublisher();
        FileManagedSnapshotStore<String> store = store(codec, publisher,
                path -> path.equals(candidatePath()) ? candidateDocument : activeDocument);

        store.promoteCandidate("next", "generation-two");

        byte[] lastKnownGoodDocument = codec.encoded().getFirst();
        assertAllZero(candidateDocument);
        assertAllZero(activeDocument);
        assertAllZero(lastKnownGoodDocument);
        assertEquals(List.of(lastKnownGoodPath(), activePath()), publisher.publishedTargets());
        assertEquals("next|generation-two", Files.readString(activePath(), StandardCharsets.UTF_8));
        assertEquals("previous|generation-one", Files.readString(lastKnownGoodPath(), StandardCharsets.UTF_8));
    }

    @Test
    void promotionClearsEveryBufferWhenLastKnownGoodPublicationFails() {
        byte[] candidateDocument = document("next", "generation-two");
        byte[] activeDocument = document("previous", "generation-one");
        CapturingCodec codec = new CapturingCodec();
        DiskPublisher publisher = new DiskPublisher(1);
        FileManagedSnapshotStore<String> store = store(codec, publisher,
                path -> path.equals(candidatePath()) ? candidateDocument : activeDocument);

        assertThrows(IOException.class, () -> store.promoteCandidate("next", "generation-two"));

        assertAllZero(candidateDocument);
        assertAllZero(activeDocument);
        assertAllZero(codec.encoded().getFirst());
    }

    @Test
    void promotionClearsEveryBufferWhenActivePublicationFails() {
        byte[] candidateDocument = document("next", "generation-two");
        byte[] activeDocument = document("previous", "generation-one");
        CapturingCodec codec = new CapturingCodec();
        DiskPublisher publisher = new DiskPublisher(2);
        FileManagedSnapshotStore<String> store = store(codec, publisher,
                path -> path.equals(candidatePath()) ? candidateDocument : activeDocument);

        assertThrows(IOException.class, () -> store.promoteCandidate("next", "generation-two"));

        assertAllZero(candidateDocument);
        assertAllZero(activeDocument);
        assertAllZero(codec.encoded().getFirst());
        assertEquals(List.of(lastKnownGoodPath(), activePath()), publisher.publishedTargets());
    }

    @Test
    void promotionClearsCandidateBeforeEnteringSuccessfulRemove() throws Exception {
        byte[] candidateDocument = document("next", "generation-two");
        AtomicBoolean removeObservedClearCandidate = new AtomicBoolean();
        DiskPublisher publisher = new DiskPublisher(-1, null,
                ignored -> removeObservedClearCandidate.set(allZero(candidateDocument)));
        FileManagedSnapshotStore<String> store = store(
                new CapturingCodec(), publisher, candidateOnlyReader(candidateDocument));

        store.promoteCandidate("next", "generation-two");

        assertTrue(removeObservedClearCandidate.get());
        assertAllZero(candidateDocument);
    }

    @Test
    void promotionClearsCandidateBeforeEnteringFailedRemove() {
        byte[] candidateDocument = document("next", "generation-two");
        AtomicBoolean removeObservedClearCandidate = new AtomicBoolean();
        IOException removeFailure = new IOException("injected removal failure");
        DiskPublisher publisher = new DiskPublisher(-1, removeFailure,
                ignored -> removeObservedClearCandidate.set(allZero(candidateDocument)));
        FileManagedSnapshotStore<String> store = store(
                new CapturingCodec(), publisher, candidateOnlyReader(candidateDocument));

        IOException thrown = assertThrows(IOException.class,
                () -> store.promoteCandidate("next", "generation-two"));

        assertEquals(removeFailure, thrown);
        assertTrue(removeObservedClearCandidate.get());
        assertAllZero(candidateDocument);
    }

    @Test
    void validationAndDecodeFailuresClearReaderOwnedBuffers() {
        byte[] validationDocument = document("candidate", "generation-one");
        FileManagedSnapshotStore<String> validatingStore = store(
                new CapturingCodec(), new DiskPublisher(), path -> validationDocument);

        assertThrows(IOException.class,
                () -> validatingStore.promoteCandidate("unexpected", "generation-one"));
        assertAllZero(validationDocument);

        byte[] corruptDocument = document("corrupt", "generation-two");
        CapturingCodec corruptCodec = new CapturingCodec(true);
        CandidateRead<String> result = store(corruptCodec, new DiskPublisher(), path -> corruptDocument)
                .readCandidate();

        assertEquals(CandidateState.CORRUPT, result.state());
        assertAllZero(corruptDocument);
    }

    private FileManagedSnapshotStore<String> store(
            ManagedDocumentCodec<String> codec,
            ManagedFileIo.Publisher publisher,
            ManagedFileIo.Reader reader) {
        return new FileManagedSnapshotStore<>(
                installationRoot, FILE_NAME, false, codec, publisher, reader);
    }

    private Path candidatePath() {
        return installationRoot.resolve("data/config/" + FILE_NAME + ".candidate");
    }

    private Path activePath() {
        return installationRoot.resolve("data/config/" + FILE_NAME);
    }

    private Path lastKnownGoodPath() {
        return installationRoot.resolve("data/config/" + FILE_NAME + ".last-known-good");
    }

    private ManagedFileIo.Reader candidateOnlyReader(byte[] candidateDocument) {
        return path -> {
            if (path.equals(candidatePath())) {
                return candidateDocument;
            }
            throw new NoSuchFileException(path.toString());
        };
    }

    private static byte[] document(String value, String generation) {
        return (value + "|" + generation).getBytes(StandardCharsets.UTF_8);
    }

    private static void assertAllZero(byte[] content) {
        assertTrue(content.length > 0);
        assertArrayEquals(new byte[content.length], content);
    }

    private static boolean allZero(byte[] content) {
        for (byte value : content) {
            if (value != 0) {
                return false;
            }
        }
        return true;
    }

    private static final class CapturingCodec implements ManagedDocumentCodec<String> {
        private final List<byte[]> encoded = new ArrayList<>();
        private final boolean failDecode;

        private CapturingCodec() {
            this(false);
        }

        private CapturingCodec(boolean failDecode) {
            this.failDecode = failDecode;
        }

        @Override
        public byte[] encode(String value, String generation) {
            byte[] document = document(value, generation);
            encoded.add(document);
            return document;
        }

        @Override
        public Decoded<String> decode(byte[] content) throws DocumentException {
            if (failDecode) {
                throw DocumentException.corrupt();
            }
            String[] fields = new String(content, StandardCharsets.UTF_8).split("\\|", -1);
            return new Decoded<>(fields[0], fields[1]);
        }

        private List<byte[]> encoded() {
            return encoded;
        }
    }

    private static final class DiskPublisher implements ManagedFileIo.Publisher {
        private final List<Path> publishedTargets = new ArrayList<>();
        private final int failingPublish;
        private final IOException removeFailure;
        private final Consumer<Path> removeObserver;

        private DiskPublisher() {
            this(-1, null, ignored -> { });
        }

        private DiskPublisher(int failingPublish) {
            this(failingPublish, null, ignored -> { });
        }

        private DiskPublisher(int failingPublish, IOException removeFailure, Consumer<Path> removeObserver) {
            this.failingPublish = failingPublish;
            this.removeFailure = removeFailure;
            this.removeObserver = removeObserver;
        }

        @Override
        public void publish(Path target, byte[] content, boolean ownerOnly) throws IOException {
            assertFalse(allZero(content));
            publishedTargets.add(target);
            if (publishedTargets.size() == failingPublish) {
                throw new IOException("injected publication failure");
            }
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        }

        @Override
        public void remove(Path target) throws IOException {
            removeObserver.accept(target);
            if (removeFailure != null) {
                throw removeFailure;
            }
            Files.deleteIfExists(target);
        }

        private List<Path> publishedTargets() {
            return publishedTargets;
        }
    }
}
