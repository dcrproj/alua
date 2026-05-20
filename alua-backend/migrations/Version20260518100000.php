<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Tables coproprietes + coproprietes_parcelles (RNIC)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS coproprietes (
                no_immatriculation       VARCHAR(20)  PRIMARY KEY,
                commune_code             VARCHAR(5),
                nom                      VARCHAR(100),
                lon                      DOUBLE PRECISION,
                lat                      DOUBLE PRECISION,
                nb_lots_total            INTEGER,
                nb_lots_habitation       INTEGER,
                nb_lots_stationnement    INTEGER,
                periode_construction     VARCHAR(50),
                type_syndic              VARCHAR(30),
                syndicat_cooperatif      BOOLEAN,
                date_immatriculation     DATE,
                ttl_expires_at           TIMESTAMP NOT NULL
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS coproprietes_commune_idx ON coproprietes (commune_code)');
        $this->addSql('CREATE INDEX IF NOT EXISTS coproprietes_ttl_idx ON coproprietes (ttl_expires_at)');

        $this->addSql("
            CREATE TABLE IF NOT EXISTS coproprietes_parcelles (
                no_immatriculation  VARCHAR(20)  NOT NULL REFERENCES coproprietes (no_immatriculation) ON DELETE CASCADE,
                parcelle_id         VARCHAR(14)  NOT NULL,
                PRIMARY KEY (no_immatriculation, parcelle_id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS coproprietes_parcelles_pid_idx ON coproprietes_parcelles (parcelle_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS coproprietes_parcelles');
        $this->addSql('DROP TABLE IF EXISTS coproprietes');
    }
}
