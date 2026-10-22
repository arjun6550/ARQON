package com.arqon.core.exam.service;

import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.ExamResult;
import com.arqon.core.exam.domain.Snapshot;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Pure scoring rules. MCQ: all-or-nothing, the selected set must equal the correct set. Coding is not evaluated (placeholder). */
final class Grader {

    private Grader() {}

    static boolean mcqCorrect(Snapshot.Item item, Answer answer) {
        if (answer == null || answer.selected() == null) return false;
        Set<Integer> correct = new HashSet<>();
        for (int i = 0; i < item.options().size(); i++) {
            if (item.options().get(i).correct()) correct.add(i);
        }
        return correct.equals(new HashSet<>(answer.selected()));
    }

    static ExamResult grade(Snapshot snap, Map<UUID, Answer> answers) {
        int mcqScore = 0, mcqMax = 0, codingMax = 0, codingSubmitted = 0, codingQuestions = 0;
        for (Snapshot.Sec sec : snap.sections()) {
            for (Snapshot.Item item : sec.items()) {
                Answer a = answers.get(item.questionId());
                if (item.coding()) {
                    codingMax += item.points();
                    codingQuestions++;
                    if (a != null && a.code() != null && !a.code().isBlank()) codingSubmitted++;
                } else {
                    mcqMax += item.points();
                    if (mcqCorrect(item, a)) mcqScore += item.points();
                }
            }
        }
        double mcqPercent = mcqMax == 0 ? 0 : 100.0 * mcqScore / mcqMax;
        double provisional = Math.round(mcqPercent * snap.mcqWeight()) / 100.0; // coding contributes 0 until it is evaluated
        String codingStatus = codingQuestions == 0 ? "NONE" : "NOT_EVALUATED";
        Boolean passed = codingQuestions == 0 ? provisional >= snap.passPercentage() : null;
        return new ExamResult(mcqScore, mcqMax, Math.round(mcqPercent * 100) / 100.0, codingMax, codingSubmitted, codingQuestions,
                codingStatus, provisional, passed);
    }
}
