<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Tables stats_departements et stats_regions — agrégats pré-calculés pour les pages région/département';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS stats_departements (
                code_departement  VARCHAR(3)     PRIMARY KEY,
                nb_communes_total INTEGER        NOT NULL DEFAULT 0,
                population_totale BIGINT,
                nb_parcelles      BIGINT         NOT NULL DEFAULT 0,
                nb_transactions   BIGINT         NOT NULL DEFAULT 0,
                nb_dpes           BIGINT         NOT NULL DEFAULT 0,
                prix_median_m2    NUMERIC(10,2),
                evolution_prix    JSONB          NOT NULL DEFAULT '[]',
                distribution_dpe  JSONB          NOT NULL DEFAULT '{}',
                computed_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
        ");

        $this->addSql("
            CREATE TABLE IF NOT EXISTS stats_regions (
                code_region       VARCHAR(3)     PRIMARY KEY,
                nb_communes       INTEGER        NOT NULL DEFAULT 0,
                population_totale BIGINT,
                nb_parcelles      BIGINT         NOT NULL DEFAULT 0,
                nb_transactions   BIGINT         NOT NULL DEFAULT 0,
                nb_dpes           BIGINT         NOT NULL DEFAULT 0,
                prix_median_m2    NUMERIC(10,2),
                evolution_prix    JSONB          NOT NULL DEFAULT '[]',
                computed_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
            )
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS stats_departements');
        $this->addSql('DROP TABLE IF EXISTS stats_regions');
    }
}
