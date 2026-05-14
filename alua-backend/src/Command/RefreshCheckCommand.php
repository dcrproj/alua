<?php

declare(strict_types=1);

namespace App\Command;

use App\Message\RefreshDpeMessage;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Messenger\MessageBusInterface;

#[AsCommand(
    name: 'app:refresh:check',
    description: 'Dispatch refresh jobs for entities with expired TTL',
)]
class RefreshCheckCommand extends Command
{
    public function __construct(
        private readonly Connection $connection,
        private readonly MessageBusInterface $bus,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Refresh TTL check');

        // DPE : départements avec au moins un DPE expiré
        $departments = $this->connection->fetchFirstColumn(
            "SELECT DISTINCT code_departement
             FROM dpes
             WHERE ttl_expires_at IS NOT NULL
               AND ttl_expires_at < NOW()
               AND code_departement IS NOT NULL
             ORDER BY code_departement"
        );

        if (empty($departments)) {
            $io->success('Aucune entité expirée.');
            return Command::SUCCESS;
        }

        $io->text(sprintf('%d département(s) avec DPE expirés :', count($departments)));
        foreach ($departments as $dept) {
            $this->bus->dispatch(new RefreshDpeMessage($dept));
            $io->text(sprintf('  → RefreshDpeMessage dispatché pour le dept %s', $dept));
        }

        $io->success(sprintf('%d jobs de refresh dispatchés.', count($departments)));

        return Command::SUCCESS;
    }
}
