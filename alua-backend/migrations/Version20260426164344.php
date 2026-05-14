<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260426164344 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create addresses table (BAN) with PostGIS geometry';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE addresses (id UUID NOT NULL, ban_id VARCHAR(20) NOT NULL, numero VARCHAR(10) DEFAULT NULL, voie VARCHAR(255) DEFAULT NULL, code_postal VARCHAR(5) DEFAULT NULL, commune VARCHAR(255) DEFAULT NULL, commune_code VARCHAR(5) DEFAULT NULL, geometry geometry(POINT, 4326) NOT NULL, source VARCHAR(20) NOT NULL, last_updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, ttl_expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_6FCA75161255CD1D ON addresses (ban_id)');
        $this->addSql('CREATE INDEX idx_addresses_ban_id ON addresses (ban_id)');
        $this->addSql('CREATE INDEX idx_addresses_commune ON addresses (commune_code)');
        $this->addSql('CREATE INDEX idx_addresses_geometry ON addresses USING GIST (geometry)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE addresses');
    }
}
