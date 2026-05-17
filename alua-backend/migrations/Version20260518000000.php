<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table batiment_bdnb — groupes de bâtiments BDNB liés aux parcelles cadastrales';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS batiment_bdnb (
                id                   SERIAL       PRIMARY KEY,
                parcelle_id          VARCHAR(14)  NOT NULL,
                batiment_groupe_id   VARCHAR(22)  NOT NULL,
                annee_construction   INTEGER,
                nb_logements         INTEGER,
                usage_niveau_1       VARCHAR(100),
                millesime            VARCHAR(20)  NOT NULL DEFAULT '2025-07-a',
                UNIQUE (parcelle_id, batiment_groupe_id)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS batiment_bdnb_parcelle_idx ON batiment_bdnb (parcelle_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS batiment_bdnb');
    }
}
