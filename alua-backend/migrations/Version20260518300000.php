<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518300000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Champs RNIC complémentaires sur coproprietes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE coproprietes
            ADD COLUMN IF NOT EXISTS representant_legal      VARCHAR(200),
            ADD COLUMN IF NOT EXISTS date_reglement          DATE,
            ADD COLUMN IF NOT EXISTS nb_lots_principaux      INTEGER,
            ADD COLUMN IF NOT EXISTS type_syndicat_copro     VARCHAR(60),
            ADD COLUMN IF NOT EXISTS nb_asl                  INTEGER,
            ADD COLUMN IF NOT EXISTS nb_aful                 INTEGER,
            ADD COLUMN IF NOT EXISTS nb_unions_syndicat      INTEGER,
            ADD COLUMN IF NOT EXISTS residence_service       BOOLEAN
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE coproprietes
            DROP COLUMN IF EXISTS representant_legal,
            DROP COLUMN IF EXISTS date_reglement,
            DROP COLUMN IF EXISTS nb_lots_principaux,
            DROP COLUMN IF EXISTS type_syndicat_copro,
            DROP COLUMN IF EXISTS nb_asl,
            DROP COLUMN IF EXISTS nb_aful,
            DROP COLUMN IF EXISTS nb_unions_syndicat,
            DROP COLUMN IF EXISTS residence_service
        ');
    }
}
