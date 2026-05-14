<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260512000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add address_id to mutations_dvf_lots';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mutations_dvf_lots ADD COLUMN address_id UUID DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_mutations_dvf_lots_address ON mutations_dvf_lots (address_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_mutations_dvf_lots_address');
        $this->addSql('ALTER TABLE mutations_dvf_lots DROP COLUMN address_id');
    }
}
