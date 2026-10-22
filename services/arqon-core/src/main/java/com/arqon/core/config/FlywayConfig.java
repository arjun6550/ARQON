package com.arqon.core.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.orm.jpa.EntityManagerFactoryDependsOnPostProcessor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * One Flyway run PER MODULE, each with its own schema, migration folder and history table, so modules stay
 * independently extractable. JPA starts only after both have migrated.
 */
@Configuration
@EnableConfigurationProperties(MigrationProperties.class)
class FlywayConfig {

    @Bean(initMethod = "migrate")
    Flyway identityFlyway(MigrationProperties props) {
        return build(props, "identity");
    }

    @Bean(initMethod = "migrate")
    Flyway orgFlyway(MigrationProperties props) {
        return build(props, "org");
    }

    @Bean(initMethod = "migrate")
    Flyway qbankFlyway(MigrationProperties props) {
        return build(props, "qbank");
    }

    @Bean(initMethod = "migrate")
    Flyway assessmentFlyway(MigrationProperties props) {
        return build(props, "assessment");
    }

    @Bean(initMethod = "migrate")
    Flyway invitationFlyway(MigrationProperties props) {
        return build(props, "invitation");
    }

    @Bean(initMethod = "migrate")
    Flyway examFlyway(MigrationProperties props) {
        return build(props, "exam");
    }

    @Bean
    static EntityManagerFactoryDependsOnPostProcessor flywayBeforeJpa() {
        return new EntityManagerFactoryDependsOnPostProcessor("identityFlyway", "orgFlyway", "qbankFlyway", "assessmentFlyway", "invitationFlyway", "examFlyway");
    }

    private static Flyway build(MigrationProperties p, String schema) {
        return Flyway.configure()
                .dataSource(p.url(), p.user(), p.password())
                .schemas(schema)
                .defaultSchema(schema)
                .createSchemas(true)
                .locations("classpath:db/migration/" + schema)
                .load();
    }
}
