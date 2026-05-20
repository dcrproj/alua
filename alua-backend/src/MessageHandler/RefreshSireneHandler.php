<?php

declare(strict_types=1);

namespace App\MessageHandler;

use App\Message\RefreshSireneMessage;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class RefreshSireneHandler
{
    public function __construct(private readonly KernelInterface $kernel) {}

    public function __invoke(RefreshSireneMessage $message): void
    {
        $application = new Application($this->kernel);
        $application->setAutoExit(false);

        $application->run(
            new ArrayInput(['command' => 'app:import:sirene']),
            new NullOutput()
        );
    }
}
