<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260519200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Élargit les colonnes cadastrales de sitadel_permis';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sitadel_permis
            ALTER COLUMN sec_cadastre1 TYPE VARCHAR(5),
            ALTER COLUMN num_cadastre1 TYPE VARCHAR(10),
            ALTER COLUMN sec_cadastre2 TYPE VARCHAR(5),
            ALTER COLUMN num_cadastre2 TYPE VARCHAR(10),
            ALTER COLUMN sec_cadastre3 TYPE VARCHAR(5),
            ALTER COLUMN num_cadastre3 TYPE VARCHAR(10)
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sitadel_permis
            ALTER COLUMN sec_cadastre1 TYPE VARCHAR(3),
            ALTER COLUMN num_cadastre1 TYPE VARCHAR(6),
            ALTER COLUMN sec_cadastre2 TYPE VARCHAR(3),
            ALTER COLUMN num_cadastre2 TYPE VARCHAR(6),
            ALTER COLUMN sec_cadastre3 TYPE VARCHAR(3),
            ALTER COLUMN num_cadastre3 TYPE VARCHAR(6)
        ');
    }
}
