<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Doctrine\DBAL\Connection;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Fixe un statement_timeout PostgreSQL par requête HTTP.
 * Garantit qu'une requête SQL lente libère le worker PHP-FPM au bout de 15s max,
 * au lieu de bloquer indéfiniment et d'épuiser le pool PHP-FPM.
 */
final class DatabaseTimeoutSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly Connection $connection) {}

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onRequest', 255]];
    }

    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }
        try {
            // Tue la query si elle dépasse 15s — libère le worker, retourne une 500 propre
            // plutôt qu'un 503 (timeout Nginx sur socket FPM plein)
            $this->connection->executeStatement('SET statement_timeout = 15000');
        } catch (\Throwable) {
            // En cas d'échec de connexion au démarrage, on ignore silencieusement
        }
    }
}
