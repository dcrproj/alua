<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260525200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table risques_cache — cache PostgreSQL pour les réponses Géorisques (TTL 30 jours)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS risques_cache (
                id_parcelle VARCHAR(14) PRIMARY KEY,
                data        JSONB       NOT NULL,
                fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS risques_cache');
    }
}
