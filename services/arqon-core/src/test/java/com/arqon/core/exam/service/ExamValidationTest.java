package com.arqon.core.exam.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.arqon.common.error.ArqonException;
import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.Snapshot;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ExamValidationTest {

    private final Snapshot snap = new Snapshot("t", 60, 100, 0, 50, List.of("JAVA"), List.of());
    private final Snapshot.Item single = new Snapshot.Item(UUID.randomUUID(), 1, 1, false, "q", "b",
            List.of(new Snapshot.Opt("a", true), new Snapshot.Opt("b", false)), false, List.of(), Map.of(), List.of(), 0);
    private final Snapshot.Item code = new Snapshot.Item(UUID.randomUUID(), 1, 1, true, "c", "b", List.of(), false, List.of("JAVA"), Map.of(), List.of(), 0);

    @Test
    void acceptsValidAnswers() {
        assertThatCode(() -> ExamService.validate(single, snap, new Answer(List.of(1), null, null))).doesNotThrowAnyException();
        assertThatCode(() -> ExamService.validate(single, snap, new Answer(List.of(), null, null))).doesNotThrowAnyException();
        assertThatCode(() -> ExamService.validate(code, snap, new Answer(null, "JAVA", "class A {}"))).doesNotThrowAnyException();
    }

    @Test
    void rejectsBadMcqAnswers() {
        assertThatThrownBy(() -> ExamService.validate(single, snap, new Answer(List.of(5), null, null))).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> ExamService.validate(single, snap, new Answer(List.of(0, 1), null, null))).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> ExamService.validate(single, snap, new Answer(List.of(-1), null, null))).isInstanceOf(ArqonException.class);
    }

    @Test
    void rejectsBadCodingAnswers() {
        assertThatThrownBy(() -> ExamService.validate(code, snap, new Answer(null, "PYTHON", "x"))).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> ExamService.validate(code, snap, new Answer(null, null, "x"))).isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> ExamService.validate(code, snap, new Answer(null, "JAVA", "x".repeat(ExamService.MAX_CODE_CHARS + 1)))).isInstanceOf(ArqonException.class);
    }
}
