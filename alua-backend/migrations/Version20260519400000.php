<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519400000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Élargit sirene_etablissements.ban_id à VARCHAR(24)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sirene_etablissements ALTER COLUMN ban_id TYPE VARCHAR(24)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sirene_etablissements ALTER COLUMN ban_id TYPE VARCHAR(15)');
    }
}
