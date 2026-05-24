<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260520200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Crée la table poi_cache (POI OSM par parcelle, TTL 90 jours)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE poi_cache (
                id_parcelle VARCHAR(14) NOT NULL PRIMARY KEY,
                data        JSONB       NOT NULL,
                fetched_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            )
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS poi_cache');
    }
}
