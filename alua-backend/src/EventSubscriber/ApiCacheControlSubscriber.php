<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Ajoute Cache-Control: public sur les endpoints API en lecture seule.
 * Permet à Symfony HttpCache (index.php) de servir les réponses en ~5ms
 * au lieu de mobiliser un worker PHP-FPM pendant 1–5s.
 * Compatible avec Nginx fastcgi_cache et Cloudflare si activés ultérieurement.
 */
final class ApiCacheControlSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::RESPONSE => 'onKernelResponse'];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if ($request->getMethod() !== 'GET') {
            return;
        }

        $path = $request->getPathInfo();
        if (!str_starts_with($path, '/api/')) {
            return;
        }

        $response = $event->getResponse();
        if (!$response->isSuccessful()) {
            return;
        }

        // Ne pas mettre en cache si explicitement privé ou no-store
        if ($response->headers->hasCacheControlDirective('private')
            || $response->headers->hasCacheControlDirective('no-store')) {
            return;
        }

        // POI OpenStreetMap : 90 jours (données très stables)
        if (str_ends_with($path, '/poi')) {
            $this->setPublicCache($event, 7_776_000);
            return;
        }

        // Risques, patrimoine, DPE, bâtiments : 24h
        if (preg_match('#/parcelles/[^/]+/(risques|patrimoine|dpes|batiment)$#', $path)) {
            $this->setPublicCache($event, 86_400);
            return;
        }

        // Transactions, permis, copropriétés, entreprises : 1h
        if (preg_match('#/parcelles/[^/]+/(transactions|coproprietes|permis|entreprises)$#', $path)) {
            $this->setPublicCache($event, 3_600);
            return;
        }

        // /api/parcelles/{id} (identité de la parcelle) : 1h
        if (preg_match('#/api/parcelles/[^/]+$#', $path)) {
            $this->setPublicCache($event, 3_600);
            return;
        }

        // Communes, départements, régions : 24h
        if (preg_match('#/api/(communes|departements|regions)/[^/]+$#', $path)) {
            $this->setPublicCache($event, 86_400);
            return;
        }

        // Index listings (régions, départements) : 24h
        if (preg_match('#/api/(regions|departements)-index$#', $path)) {
            $this->setPublicCache($event, 86_400);
        }
    }

    private function setPublicCache(ResponseEvent $event, int $ttl): void
    {
        $response = $event->getResponse();
        $response->setPublic();
        $response->setMaxAge($ttl);
        $response->setSharedMaxAge($ttl);
    }
}
