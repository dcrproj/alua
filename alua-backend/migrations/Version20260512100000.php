<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create dpes table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE dpes (
            id UUID NOT NULL,
            numero_dpe VARCHAR(26) NOT NULL,
            source VARCHAR(15) NOT NULL,
            date_etablissement DATE NOT NULL,
            date_fin_validite DATE DEFAULT NULL,
            etiquette_dpe VARCHAR(1) DEFAULT NULL,
            etiquette_ges VARCHAR(1) DEFAULT NULL,
            conso_primaire NUMERIC(10, 2) DEFAULT NULL,
            emission_ges NUMERIC(10, 2) DEFAULT NULL,
            type_batiment VARCHAR(50) DEFAULT NULL,
            surface_habitable NUMERIC(10, 2) DEFAULT NULL,
            periode_construction VARCHAR(20) DEFAULT NULL,
            type_energie_chauffage VARCHAR(100) DEFAULT NULL,
            identifiant_ban VARCHAR(26) DEFAULT NULL,
            address_id UUID DEFAULT NULL,
            code_departement VARCHAR(3) DEFAULT NULL,
            code_commune VARCHAR(5) DEFAULT NULL,
            longitude DOUBLE PRECISION DEFAULT NULL,
            latitude DOUBLE PRECISION DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_DPE_NUMERO ON dpes (numero_dpe)');
        $this->addSql('CREATE INDEX idx_dpes_commune ON dpes (code_commune)');
        $this->addSql('CREATE INDEX idx_dpes_dept ON dpes (code_departement)');
        $this->addSql('CREATE INDEX idx_dpes_etiquette ON dpes (etiquette_dpe)');
        $this->addSql('CREATE INDEX idx_dpes_ban ON dpes (identifiant_ban)');
        $this->addSql('CREATE INDEX idx_dpes_address ON dpes (address_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE dpes');
    }
}
