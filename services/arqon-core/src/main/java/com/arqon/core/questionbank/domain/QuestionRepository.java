package com.arqon.core.questionbank.domain;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    /** Tenant scoping is done by Row-Level Security. The casts let PostgreSQL type the optional (null) parameters. */
    @Query(value = """
            select q.* from qbank.questions q
            where q.status = 'ACTIVE'
              and (cast(:type as text) is null or q.type = cast(:type as text))
              and (cast(:difficulty as text) is null or q.difficulty = cast(:difficulty as text))
              and (cast(:tag as text) is null or q.tags @> to_jsonb(cast(:tag as text)))
              and (cast(:search as text) is null or lower(q.title) like lower(concat('%', cast(:search as text), '%')))
            order by q.updated_at desc, q.id
            """,
            countQuery = """
            select count(*) from qbank.questions q
            where q.status = 'ACTIVE'
              and (cast(:type as text) is null or q.type = cast(:type as text))
              and (cast(:difficulty as text) is null or q.difficulty = cast(:difficulty as text))
              and (cast(:tag as text) is null or q.tags @> to_jsonb(cast(:tag as text)))
              and (cast(:search as text) is null or lower(q.title) like lower(concat('%', cast(:search as text), '%')))
            """,
            nativeQuery = true)
    Page<Question> search(@Param("type") String type, @Param("difficulty") String difficulty,
                          @Param("tag") String tag, @Param("search") String search, Pageable pageable);
}
