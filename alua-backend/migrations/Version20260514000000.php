<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260514000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ttl_expires_at to dpes + create messenger_messages table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE dpes ADD COLUMN ttl_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_dpes_ttl ON dpes (ttl_expires_at)');

        // Table Symfony Messenger (transport Doctrine)
        $this->addSql('CREATE TABLE messenger_messages (
            id BIGSERIAL NOT NULL,
            body TEXT NOT NULL,
            headers TEXT NOT NULL,
            queue_name VARCHAR(190) NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            available_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            delivered_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX IDX_75EA56E0FB7336F0 ON messenger_messages (queue_name)');
        $this->addSql('CREATE INDEX IDX_75EA56E0E3BD61CE ON messenger_messages (available_at)');
        $this->addSql('CREATE INDEX IDX_75EA56E016BA31DB ON messenger_messages (delivered_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_dpes_ttl');
        $this->addSql('ALTER TABLE dpes DROP COLUMN ttl_expires_at');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
