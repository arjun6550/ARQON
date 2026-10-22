package com.arqon.core;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/** Keeps the monolith modular: modules may only use each other's published API, so they stay extractable. */
@AnalyzeClasses(packages = "com.arqon.core", importOptions = ImportOption.DoNotIncludeTests.class)
class ModuleBoundaryTest {

    @ArchTest
    static final ArchRule identityUsesOrganizationOnlyThroughItsPublishedApi = noClasses()
            .that().resideInAPackage("com.arqon.core.identity..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.arqon.core.organization.api..",
                    "com.arqon.core.organization.domain..",
                    "com.arqon.core.organization.service..");

    @ArchTest
    static final ArchRule organizationDoesNotDependOnIdentity = noClasses()
            .that().resideInAPackage("com.arqon.core.organization..")
            .should().dependOnClassesThat().resideInAPackage("com.arqon.core.identity..");

    @ArchTest
    static final ArchRule questionBankIsIndependentOfOtherModules = noClasses()
            .that().resideInAPackage("com.arqon.core.questionbank..")
            .should().dependOnClassesThat().resideInAnyPackage("com.arqon.core.identity..", "com.arqon.core.organization..", "com.arqon.core.assessment..");

    @ArchTest
    static final ArchRule assessmentUsesQuestionBankOnlyThroughItsPublishedApi = noClasses()
            .that().resideInAPackage("com.arqon.core.assessment..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.arqon.core.identity..", "com.arqon.core.organization..",
                    "com.arqon.core.questionbank.api..", "com.arqon.core.questionbank.domain..", "com.arqon.core.questionbank.service..");

    @ArchTest
    static final ArchRule otherModulesDoNotReachIntoQuestionBankOrAssessment = noClasses()
            .that().resideInAnyPackage("com.arqon.core.identity..", "com.arqon.core.organization..")
            .should().dependOnClassesThat().resideInAnyPackage("com.arqon.core.questionbank..", "com.arqon.core.assessment..");

    @ArchTest
    static final ArchRule invitationUsesAssessmentOnlyThroughItsPublishedApi = noClasses()
            .that().resideInAPackage("com.arqon.core.invitation..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.arqon.core.identity..", "com.arqon.core.organization..", "com.arqon.core.questionbank..",
                    "com.arqon.core.assessment.api..", "com.arqon.core.assessment.domain..", "com.arqon.core.assessment.service..");

    @ArchTest
    static final ArchRule nobodyReachesIntoInvitations = noClasses()
            .that().resideInAnyPackage("com.arqon.core.identity..", "com.arqon.core.organization..",
                    "com.arqon.core.questionbank..", "com.arqon.core.assessment..")
            .should().dependOnClassesThat().resideInAPackage("com.arqon.core.invitation..");

    @ArchTest
    static final ArchRule examUsesOtherModulesOnlyThroughPublishedApis = noClasses()
            .that().resideInAPackage("com.arqon.core.exam..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.arqon.core.identity..", "com.arqon.core.organization..",
                    "com.arqon.core.questionbank.api..", "com.arqon.core.questionbank.domain..", "com.arqon.core.questionbank.service..",
                    "com.arqon.core.assessment.api..", "com.arqon.core.assessment.domain..", "com.arqon.core.assessment.service..",
                    "com.arqon.core.invitation.api..", "com.arqon.core.invitation.domain..", "com.arqon.core.invitation.service..",
                    "com.arqon.core.invitation.mail..", "com.arqon.core.invitation.config..");

    @ArchTest
    static final ArchRule nobodyReachesIntoExam = noClasses()
            .that().resideInAnyPackage("com.arqon.core.identity..", "com.arqon.core.organization..", "com.arqon.core.questionbank..",
                    "com.arqon.core.assessment..", "com.arqon.core.invitation..")
            .should().dependOnClassesThat().resideInAPackage("com.arqon.core.exam..");
}
