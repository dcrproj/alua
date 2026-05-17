<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260517000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Tables monuments_historiques (ABF Mérimée) et rga_zones (retrait-gonflement des argiles)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS monuments_historiques (
                id           SERIAL       PRIMARY KEY,
                reference    VARCHAR(20)  NOT NULL UNIQUE,
                denomination VARCHAR(200),
                titre        TEXT,
                commune      VARCHAR(200),
                commune_code VARCHAR(50),
                departement  VARCHAR(3),
                protection   VARCHAR(20)  NOT NULL,
                geometry     geometry(Point, 4326)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS mh_geom_idx    ON monuments_historiques USING GIST (geometry)');
        $this->addSql('CREATE INDEX IF NOT EXISTS mh_commune_idx ON monuments_historiques (commune_code)');

        $this->addSql("
            CREATE TABLE IF NOT EXISTS rga_zones (
                id          SERIAL PRIMARY KEY,
                niveau_alea VARCHAR(50),
                geometry    geometry(MultiPolygon, 4326)
            )
        ");
        $this->addSql('CREATE INDEX IF NOT EXISTS rga_zones_geom_idx ON rga_zones USING GIST (geometry)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS monuments_historiques');
        $this->addSql('DROP TABLE IF EXISTS rga_zones');
    }
}
