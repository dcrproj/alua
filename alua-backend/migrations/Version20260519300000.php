<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519300000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Crée la table sirene_etablissements';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE sirene_etablissements (
                siret        VARCHAR(14)  NOT NULL,
                siren        VARCHAR(9)   NOT NULL,
                enseigne     VARCHAR(255),
                denomination VARCHAR(255),
                naf_code     VARCHAR(6),
                commune_code VARCHAR(5),
                ban_id       VARCHAR(24),
                code_postal  VARCHAR(5),
                date_creation VARCHAR(10),
                est_siege    BOOLEAN      NOT NULL DEFAULT FALSE,
                updated_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                PRIMARY KEY (siret)
            )
        ");

        $this->addSql('CREATE INDEX sirene_ban_id_idx   ON sirene_etablissements (ban_id)');
        $this->addSql('CREATE INDEX sirene_commune_idx  ON sirene_etablissements (commune_code)');
        $this->addSql('CREATE INDEX sirene_siren_idx    ON sirene_etablissements (siren)');
        $this->addSql('CREATE INDEX sirene_ttl_idx      ON sirene_etablissements (updated_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS sirene_etablissements');
    }
}
