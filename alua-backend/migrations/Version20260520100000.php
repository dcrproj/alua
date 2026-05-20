<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260520100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute numero_voie + libelle_voie à sirene_etablissements pour filtrage par adresse';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sirene_etablissements ADD COLUMN IF NOT EXISTS numero_voie VARCHAR(10)');
        $this->addSql('ALTER TABLE sirene_etablissements ADD COLUMN IF NOT EXISTS libelle_voie VARCHAR(100)');
        $this->addSql('CREATE INDEX IF NOT EXISTS sirene_voie_idx ON sirene_etablissements (commune_code, numero_voie)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS sirene_voie_idx');
        $this->addSql('ALTER TABLE sirene_etablissements DROP COLUMN IF EXISTS numero_voie');
        $this->addSql('ALTER TABLE sirene_etablissements DROP COLUMN IF EXISTS libelle_voie');
    }
}
