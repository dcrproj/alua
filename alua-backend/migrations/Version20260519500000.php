<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519500000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la colonne geometry (Lambert 93 → WGS84) à sirene_etablissements';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sirene_etablissements ADD COLUMN geometry geometry(POINT, 4326)');
        $this->addSql('CREATE INDEX sirene_geometry_idx ON sirene_etablissements USING GIST (geometry)');
        $this->addSql('ALTER TABLE sirene_etablissements DROP COLUMN IF EXISTS ban_id');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS sirene_geometry_idx');
        $this->addSql('ALTER TABLE sirene_etablissements DROP COLUMN IF EXISTS geometry');
        $this->addSql('ALTER TABLE sirene_etablissements ADD COLUMN ban_id VARCHAR(24)');
    }
}
