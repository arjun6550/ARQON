package com.arqon.core.exam.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.Snapshot;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GraderTest {

    private static Snapshot.Item mcq(UUID id, int points, boolean multiple, boolean... correct) {
        List<Snapshot.Opt> opts = new java.util.ArrayList<>();
        for (int i = 0; i < correct.length; i++) opts.add(new Snapshot.Opt("o" + i, correct[i]));
        return new Snapshot.Item(id, 1, points, false, "q", "b", opts, multiple, List.of(), Map.of(), List.of(), 0);
    }

    private static Snapshot.Item coding(UUID id, int points) {
        return new Snapshot.Item(id, 1, points, true, "c", "b", List.of(), false, List.of("JAVA"), Map.of(), List.of(), 2);
    }

    private static Snapshot snap(int mcqW, int codeW, Snapshot.Sec... secs) {
        return new Snapshot("t", 60, mcqW, codeW, 50, List.of("JAVA"), List.of(secs));
    }

    @Test
    void mcqIsAllOrNothingOnTheExactSet() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        var s = snap(100, 0, new Snapshot.Sec("m", false, List.of(mcq(a, 10, true, true, false, true), mcq(b, 10, false, true, false))));
        var r = Grader.grade(s, Map.of(a, new Answer(List.of(0, 2), null, null), b, new Answer(List.of(1), null, null)));
        assertThat(r.mcqScore()).isEqualTo(10);
        assertThat(r.mcqMax()).isEqualTo(20);
        assertThat(r.mcqPercent()).isEqualTo(50.0);
        assertThat(r.passed()).as("50 >= 50 and no coding").isTrue();
        var partial = Grader.grade(s, Map.of(a, new Answer(List.of(0), null, null)));
        assertThat(partial.mcqScore()).isZero();
    }

    @Test
    void unansweredCountsAsWrong() {
        UUID a = UUID.randomUUID();
        var r = Grader.grade(snap(100, 0, new Snapshot.Sec("m", false, List.of(mcq(a, 5, false, true, false)))), Map.of());
        assertThat(r.mcqScore()).isZero();
        assertThat(r.passed()).isFalse();
    }

    @Test
    void codingIsNotEvaluatedSoTheTotalIsProvisionalAndPassIsUnknown() {
        UUID a = UUID.randomUUID(), c = UUID.randomUUID();
        var s = snap(40, 60, new Snapshot.Sec("m", false, List.of(mcq(a, 10, false, true, false))), new Snapshot.Sec("c", true, List.of(coding(c, 50))));
        var r = Grader.grade(s, Map.of(a, new Answer(List.of(0), null, null), c, new Answer(null, "JAVA", "class A {}")));
        assertThat(r.mcqPercent()).isEqualTo(100.0);
        assertThat(r.provisionalPercent()).isEqualTo(40.0);
        assertThat(r.codingStatus()).isEqualTo("NOT_EVALUATED");
        assertThat(r.codingSubmitted()).isEqualTo(1);
        assertThat(r.passed()).isNull();
    }
}
