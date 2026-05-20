<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518200000 extends AbstractMigration
{
    public function isTransactional(): bool
    {
        return false;
    }

    public function getDescription(): string
    {
        return 'Ajout colonne adresse_reference sur coproprietes (RNIC)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE coproprietes ADD COLUMN IF NOT EXISTS adresse_reference VARCHAR(200)');
        $this->addSql('CREATE INDEX CONCURRENTLY IF NOT EXISTS coproprietes_coords_idx ON coproprietes (lon, lat) WHERE lon IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS coproprietes_coords_idx');
        $this->addSql('ALTER TABLE coproprietes DROP COLUMN IF EXISTS adresse_reference');
    }
}
