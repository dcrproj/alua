<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table sitadel_permis (autorisations urbanisme)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("
            CREATE TABLE IF NOT EXISTS sitadel_permis (
                id               SERIAL PRIMARY KEY,
                num_dau          VARCHAR(20)  NOT NULL UNIQUE,
                type_dau         VARCHAR(3)   NOT NULL,
                etat_dau         SMALLINT,
                commune_code     VARCHAR(5),
                an_depot         SMALLINT,
                date_autorisation DATE,
                date_doc          DATE,
                date_daact        DATE,
                nature_projet     SMALLINT,
                nb_logements_crees   SMALLINT  DEFAULT 0,
                nb_logements_demolis SMALLINT  DEFAULT 0,
                surf_hab_creee       INTEGER   DEFAULT 0,
                surf_loc_creee       INTEGER   DEFAULT 0,
                sec_cadastre1    VARCHAR(3),
                num_cadastre1    VARCHAR(6),
                sec_cadastre2    VARCHAR(3),
                num_cadastre2    VARCHAR(6),
                sec_cadastre3    VARCHAR(3),
                num_cadastre3    VARCHAR(6),
                updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        ");

        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_commune_idx     ON sitadel_permis (commune_code)');
        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_an_depot_idx    ON sitadel_permis (an_depot)');
        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_ttl_idx         ON sitadel_permis (updated_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_cad1_idx        ON sitadel_permis (commune_code, sec_cadastre1, num_cadastre1) WHERE sec_cadastre1 IS NOT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_cad2_idx        ON sitadel_permis (commune_code, sec_cadastre2, num_cadastre2) WHERE sec_cadastre2 IS NOT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS sitadel_cad3_idx        ON sitadel_permis (commune_code, sec_cadastre3, num_cadastre3) WHERE sec_cadastre3 IS NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS sitadel_permis');
    }
}
