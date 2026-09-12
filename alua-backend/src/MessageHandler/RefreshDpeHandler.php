<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\RefreshDpeMessage;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class RefreshDpeHandler
{
    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly LoggerInterface $logger,
    ) {}

    public function __invoke(RefreshDpeMessage $message): void
    {
        $dept = $message->departmentCode;
        $application = new Application($this->kernel);
        $application->setAutoExit(false);

        $output = new BufferedOutput();
        $exitCode = $application->run(
            new ArrayInput([
                'command'          => 'app:import:dpe',
                '--department'     => $dept,
                '--source'         => 'existant',
                '--skip-linking'   => true,
            ]),
            $output
        );

        if ($exitCode !== 0) {
            $this->logger->error('RefreshDpeHandler failed for dept {dept}', [
                'dept'     => $dept,
                'exitCode' => $exitCode,
                'output'   => substr($output->fetch(), -2000),
            ]);
            throw new \RuntimeException(sprintf('DPE import failed for dept %s (exit %d)', $dept, $exitCode));
        }

        $this->logger->info('RefreshDpeHandler done for dept {dept}', ['dept' => $dept]);
    }
}
