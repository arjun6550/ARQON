package com.arqon.security;

/** Fine-grained permissions. Authorities are exposed to Spring Security as "PERM_<NAME>". */
public enum Permission {
    ORGANIZATION_CREATE,
    ORGANIZATION_READ_ALL,
    ORGANIZATION_READ_OWN,
    USER_CREATE_ANY_TENANT,
    USER_CREATE,
    USER_READ,
    QUESTION_READ,
    QUESTION_WRITE,
    ASSESSMENT_READ,
    ASSESSMENT_WRITE,
    ASSESSMENT_PUBLISH,
    INVITATION_READ,
    INVITATION_WRITE,
    RESULT_READ;

    public String authority() {
        return "PERM_" + name();
    }
}
