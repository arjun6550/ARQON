package com.arqon.core.exam.service;

import com.arqon.common.error.ArqonException;
import com.arqon.common.error.ErrorCode;
import com.arqon.common.tenant.RlsSession;
import com.arqon.core.assessment.AssessmentApi;
import com.arqon.core.exam.api.ExamViews.QuestionResult;
import com.arqon.core.exam.api.ExamViews.ResultDetail;
import com.arqon.core.exam.api.ExamViews.ResultRow;
import com.arqon.core.exam.domain.Answer;
import com.arqon.core.exam.domain.ExamSession;
import com.arqon.core.exam.domain.ExamSessionRepository;
import com.arqon.core.exam.domain.Snapshot;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Recruiter side: results of one tenant (RLS + token tenant; other tenants get 404). */
@Service
public class ResultsService {

    private final ExamSessionRepository sessions;
    private final AnswerStore answers;
    private final AssessmentApi assessments;
    private final RlsSession rls;

    public ResultsService(ExamSessionRepository sessions, AnswerStore answers, AssessmentApi assessments, RlsSession rls) {
        this.sessions = sessions;
        this.answers = answers;
        this.assessments = assessments;
        this.rls = rls;
    }

    @Transactional(readOnly = true)
    public Page<ResultRow> list(UUID tenant, UUID assessmentId, int page, int size) {
        rls.asTenant(tenant);
        assessments.find(tenant, assessmentId).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Assessment not found"));
        return sessions.findByAssessmentIdOrderByStartedAtDesc(assessmentId, PageRequest.of(page, size)).map(ResultRow::from);
    }

    @Transactional(readOnly = true)
    public ResultDetail detail(UUID tenant, UUID sessionId) {
        rls.asTenant(tenant);
        ExamSession s = sessions.findById(sessionId).orElseThrow(() -> new ArqonException(ErrorCode.NOT_FOUND, "Result not found"));
        var saved = answers.load(s.getId());
        List<QuestionResult> out = new ArrayList<>();
        for (Snapshot.Sec sec : s.getSnapshot().sections()) {
            for (Snapshot.Item i : sec.items()) {
                Answer a = saved.get(i.questionId());
                if (i.coding()) {
                    out.add(new QuestionResult(i.questionId(), i.title(), true, i.points(), null, null, null, null,
                            a == null ? null : a.language(), a == null ? null : a.code()));
                } else {
                    List<Integer> correct = new ArrayList<>();
                    for (int k = 0; k < i.options().size(); k++) if (i.options().get(k).correct()) correct.add(k);
                    out.add(new QuestionResult(i.questionId(), i.title(), false, i.points(), s.isOpen() ? null : Grader.mcqCorrect(i, a),
                            a == null ? List.of() : a.selected(), correct, i.options().stream().map(Snapshot.Opt::text).toList(), null, null));
                }
            }
        }
        return new ResultDetail(ResultRow.from(s), out);
    }
}
