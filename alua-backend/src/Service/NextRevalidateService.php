<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Invalide le cache ISR Next.js après un import de données.
 * Appel en loopback (127.0.0.1) seulement — l'endpoint /api/revalidate n'est pas exposé à l'extérieur.
 */
final class NextRevalidateService
{
    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly LoggerInterface $logger,
        #[Autowire(env: 'NEXT_URL')]
        private readonly string $nextUrl,
        #[Autowire(env: 'REVALIDATE_SECRET')]
        private readonly string $secret,
    ) {}

    /**
     * @param string[] $tags  Ex: ['dvf', 'communes']
     */
    public function revalidateTags(array $tags): void
    {
        if (empty($tags)) {
            return;
        }

        try {
            $response = $this->http->request('POST', rtrim($this->nextUrl, '/') . '/api/revalidate', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                    'Content-Type'  => 'application/json',
                ],
                'json'    => ['tags' => $tags],
                'timeout' => 10.0,
            ]);

            $status = $response->getStatusCode();
            if ($status !== 200) {
                $this->logger->warning('Next.js revalidation returned HTTP {status}', [
                    'status' => $status,
                    'tags'   => $tags,
                    'body'   => $response->getContent(false),
                ]);
            } else {
                $this->logger->info('Next.js cache revalidated', ['tags' => $tags]);
            }
        } catch (\Throwable $e) {
            // Ne pas faire échouer l'import si Next.js est inaccessible
            $this->logger->error('Next.js revalidation failed: {message}', [
                'message' => $e->getMessage(),
                'tags'    => $tags,
            ]);
        }
    }
}
