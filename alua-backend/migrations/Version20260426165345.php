<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260426165345 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create parcelles, parcelles_history, parcelles_addresses tables with PostGIS indexes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE parcelles (id UUID NOT NULL, id_parcelle VARCHAR(14) NOT NULL, commune_code VARCHAR(5) NOT NULL, section VARCHAR(2) NOT NULL, numero VARCHAR(4) NOT NULL, contenance INT DEFAULT NULL, centroid geometry(POINT, 4326) DEFAULT NULL, source VARCHAR(50) NOT NULL, last_updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, ttl_expires_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_4F15F60E95B5C063 ON parcelles (id_parcelle)');
        $this->addSql('CREATE INDEX idx_parcelles_commune ON parcelles (commune_code)');
        $this->addSql('CREATE INDEX idx_parcelles_id_parcelle ON parcelles (id_parcelle)');
        $this->addSql('CREATE INDEX idx_parcelles_centroid ON parcelles USING GIST (centroid)');

        $this->addSql('CREATE TABLE parcelles_history (id UUID NOT NULL, changed_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, changed_fields JSON NOT NULL, source VARCHAR(50) NOT NULL, import_batch_id UUID DEFAULT NULL, parcelle_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_C86ED0574433ED66 ON parcelles_history (parcelle_id)');
        $this->addSql('ALTER TABLE parcelles_history ADD CONSTRAINT FK_C86ED0574433ED66 FOREIGN KEY (parcelle_id) REFERENCES parcelles (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql('CREATE TABLE parcelles_addresses (parcelle_id UUID NOT NULL, address_id UUID NOT NULL, PRIMARY KEY (parcelle_id, address_id))');
        $this->addSql('ALTER TABLE parcelles_addresses ADD CONSTRAINT FK_PA_PARCELLE FOREIGN KEY (parcelle_id) REFERENCES parcelles (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE parcelles_addresses ADD CONSTRAINT FK_PA_ADDRESS FOREIGN KEY (address_id) REFERENCES addresses (id) ON DELETE CASCADE NOT DEFERRABLE');

        // Doctrine veut changer le type geometry — on recrée le GIST index après l'ALTER
        $this->addSql('DROP INDEX idx_addresses_geometry');
        $this->addSql('ALTER TABLE addresses ALTER geometry TYPE geometry(POINT, 4326)');
        $this->addSql('CREATE INDEX idx_addresses_geometry ON addresses USING GIST (geometry)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE parcelles_addresses');
        $this->addSql('ALTER TABLE parcelles_history DROP CONSTRAINT FK_C86ED0574433ED66');
        $this->addSql('DROP TABLE parcelles');
        $this->addSql('DROP TABLE parcelles_history');
        $this->addSql('DROP INDEX idx_addresses_geometry');
        $this->addSql('ALTER TABLE addresses ALTER geometry TYPE geometry(GEOMETRY, 0)');
        $this->addSql('CREATE INDEX idx_addresses_geometry ON addresses USING GIST (geometry)');
    }
}
