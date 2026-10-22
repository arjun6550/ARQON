package com.arqon.security;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/** Role -> permission mapping. Extend per slice; the backend (not the frontend) enforces it. */
public final class RolePermissions {

    private static final Map<Role, Set<Permission>> MAP = new EnumMap<>(Role.class);

    static {
        MAP.put(Role.SUPER_ADMIN, EnumSet.allOf(Permission.class));
        MAP.put(Role.ORG_ADMIN, EnumSet.of(Permission.ORGANIZATION_READ_OWN, Permission.USER_CREATE, Permission.USER_READ,
                Permission.QUESTION_READ, Permission.QUESTION_WRITE,
                Permission.ASSESSMENT_READ, Permission.ASSESSMENT_WRITE, Permission.ASSESSMENT_PUBLISH,
                Permission.INVITATION_READ, Permission.INVITATION_WRITE, Permission.RESULT_READ));
        MAP.put(Role.RECRUITER, EnumSet.of(Permission.ORGANIZATION_READ_OWN, Permission.QUESTION_READ, Permission.QUESTION_WRITE,
                Permission.ASSESSMENT_READ, Permission.ASSESSMENT_WRITE, Permission.ASSESSMENT_PUBLISH,
                Permission.INVITATION_READ, Permission.INVITATION_WRITE, Permission.RESULT_READ));
        MAP.put(Role.PROCTOR, EnumSet.of(Permission.ORGANIZATION_READ_OWN));
        MAP.put(Role.CANDIDATE, EnumSet.noneOf(Permission.class));
    }

    private RolePermissions() {}

    public static Set<Permission> of(Role role) {
        return Set.copyOf(MAP.getOrDefault(role, Set.of()));
    }
}
