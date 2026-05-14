<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260505000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create mutations_dvf and mutations_dvf_lots tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE mutations_dvf (
            id UUID NOT NULL,
            id_mutation VARCHAR(20) NOT NULL,
            date_mutation DATE NOT NULL,
            nature_mutation VARCHAR(80) DEFAULT NULL,
            valeur_fonciere NUMERIC(15, 2) DEFAULT NULL,
            code_commune VARCHAR(5) NOT NULL,
            nom_commune VARCHAR(255) DEFAULT NULL,
            code_departement VARCHAR(3) NOT NULL,
            nombre_lots SMALLINT DEFAULT NULL,
            source VARCHAR(10) NOT NULL DEFAULT \'DVF\',
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_DVF_ID_MUTATION ON mutations_dvf (id_mutation)');
        $this->addSql('CREATE INDEX idx_mutations_dvf_commune ON mutations_dvf (code_commune)');
        $this->addSql('CREATE INDEX idx_mutations_dvf_date ON mutations_dvf (date_mutation)');
        $this->addSql('CREATE INDEX idx_mutations_dvf_dept ON mutations_dvf (code_departement)');

        $this->addSql('CREATE TABLE mutations_dvf_lots (
            id UUID NOT NULL,
            mutation_dvf_id UUID NOT NULL,
            id_parcelle VARCHAR(14) DEFAULT NULL,
            parcelle_id UUID DEFAULT NULL,
            adresse_numero VARCHAR(10) DEFAULT NULL,
            adresse_nom_voie VARCHAR(255) DEFAULT NULL,
            code_postal VARCHAR(5) DEFAULT NULL,
            code_type_local VARCHAR(3) DEFAULT NULL,
            type_local VARCHAR(100) DEFAULT NULL,
            surface_reelle_bati NUMERIC(10, 2) DEFAULT NULL,
            nombre_pieces_principales SMALLINT DEFAULT NULL,
            code_nature_culture VARCHAR(5) DEFAULT NULL,
            nature_culture VARCHAR(100) DEFAULT NULL,
            surface_terrain NUMERIC(12, 2) DEFAULT NULL,
            surface_carrez NUMERIC(10, 2) DEFAULT NULL,
            longitude DOUBLE PRECISION DEFAULT NULL,
            latitude DOUBLE PRECISION DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_mutations_dvf_lots_mutation ON mutations_dvf_lots (mutation_dvf_id)');
        $this->addSql('CREATE INDEX idx_mutations_dvf_lots_parcelle ON mutations_dvf_lots (id_parcelle)');
        $this->addSql('ALTER TABLE mutations_dvf_lots ADD CONSTRAINT FK_DVF_LOTS_MUTATION FOREIGN KEY (mutation_dvf_id) REFERENCES mutations_dvf (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mutations_dvf_lots DROP CONSTRAINT FK_DVF_LOTS_MUTATION');
        $this->addSql('DROP TABLE mutations_dvf_lots');
        $this->addSql('DROP TABLE mutations_dvf');
    }
}
