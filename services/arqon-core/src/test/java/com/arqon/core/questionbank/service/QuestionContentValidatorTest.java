package com.arqon.core.questionbank.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.arqon.common.error.ArqonException;
import com.arqon.core.questionbank.domain.CodingSpec;
import com.arqon.core.questionbank.domain.Difficulty;
import com.arqon.common.domain.Language;
import com.arqon.core.questionbank.domain.McqOption;
import com.arqon.core.questionbank.domain.McqSpec;
import com.arqon.core.questionbank.domain.QuestionType;
import com.arqon.core.questionbank.domain.TestCase;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class QuestionContentValidatorTest {

    private QuestionDraft mcq(McqSpec spec) {
        return new QuestionDraft(QuestionType.MCQ, "t", "b", Difficulty.EASY, List.of(), spec, null, null);
    }

    private QuestionDraft coding(CodingSpec spec) {
        return new QuestionDraft(QuestionType.CODING, "t", "b", Difficulty.EASY, List.of(), null, spec, null);
    }

    private static McqOption o(String text, boolean correct) { return new McqOption(text, correct); }

    @Test
    void validSingleAnswerMcqPasses() {
        assertThatCode(() -> QuestionContentValidator.validate(mcq(new McqSpec(List.of(o("A", true), o("B", false)), false)))).doesNotThrowAnyException();
    }

    @Test
    void mcqNeedsACorrectOption() {
        assertThatThrownBy(() -> QuestionContentValidator.validate(mcq(new McqSpec(List.of(o("A", false), o("B", false)), false))))
                .isInstanceOf(ArqonException.class);
    }

    @Test
    void singleAnswerMcqRejectsTwoCorrectButMultiAnswerAllowsIt() {
        var two = List.of(o("A", true), o("B", true));
        assertThatThrownBy(() -> QuestionContentValidator.validate(mcq(new McqSpec(two, false)))).isInstanceOf(ArqonException.class);
        assertThatCode(() -> QuestionContentValidator.validate(mcq(new McqSpec(two, true)))).doesNotThrowAnyException();
    }

    @Test
    void mcqRejectsDuplicateOptionsAndMissingSpec() {
        assertThatThrownBy(() -> QuestionContentValidator.validate(mcq(new McqSpec(List.of(o("A", true), o(" a ", false)), false))))
                .isInstanceOf(ArqonException.class);
        assertThatThrownBy(() -> QuestionContentValidator.validate(mcq(null))).isInstanceOf(ArqonException.class);
    }

    @Test
    void mcqMustNotCarryCodingSpec() {
        var draft = new QuestionDraft(QuestionType.MCQ, "t", "b", Difficulty.EASY, List.of(),
                new McqSpec(List.of(o("A", true), o("B", false)), false),
                new CodingSpec(List.of(Language.JAVA), Map.of(), 1000, 128, List.of(new TestCase("1", "1", false, 1))), null);
        assertThatThrownBy(() -> QuestionContentValidator.validate(draft)).isInstanceOf(ArqonException.class);
    }

    @Test
    void codingRejectsStarterCodeForDisabledLanguage() {
        var spec = new CodingSpec(List.of(Language.JAVA), Map.of(Language.PYTHON, "print(1)"), 1000, 128, List.of(new TestCase("1", "1", false, 1)));
        assertThatThrownBy(() -> QuestionContentValidator.validate(coding(spec))).isInstanceOf(ArqonException.class);
    }

    @Test
    void validCodingPassesAndDuplicateLanguagesFail() {
        var ok = new CodingSpec(List.of(Language.JAVA, Language.PYTHON), Map.of(Language.JAVA, "class Main {}"), 2000, 256,
                List.of(new TestCase("1 2", "3", false, 1), new TestCase("5 7", "12", true, 3)));
        assertThatCode(() -> QuestionContentValidator.validate(coding(ok))).doesNotThrowAnyException();
        var dup = new CodingSpec(List.of(Language.JAVA, Language.JAVA), Map.of(), 2000, 256, List.of(new TestCase("1", "1", false, 1)));
        assertThatThrownBy(() -> QuestionContentValidator.validate(coding(dup))).isInstanceOf(ArqonException.class);
    }

    @Test
    void tagsAreNormalizedLowercaseTrimmedAndDeduplicated() {
        assertThat(QuestionService.normalizeTags(List.of(" Java ", "java", "SQL", " "))).containsExactly("java", "sql");
        assertThat(QuestionService.normalizeTags(null)).isEmpty();
    }
}
