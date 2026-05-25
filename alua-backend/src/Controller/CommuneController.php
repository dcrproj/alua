<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class CommuneController extends AbstractController
{
    public function __construct(private readonly Connection $connection) {}

    #[Route('/api/communes/{slug}/voisines', methods: ['GET'])]
    public function voisines(string $slug): JsonResponse
    {
        // ST_DWithin en SRID 4326 natif (degrés) pour utiliser l'index GIST.
        // 0.001° ≈ 111m en latitude : communes limitrophes ont distance ~0.
        $rows = $this->connection->fetchAllAssociative(
            "SELECT c2.code_insee, c2.nom, c2.slug, c2.population
             FROM communes c1
             JOIN communes c2
               ON c2.code_insee != c1.code_insee
              AND ST_DWithin(c1.geometry, c2.geometry, 0.001)
             WHERE c1.slug = :slug OR c1.code_insee = :code
             ORDER BY c2.population DESC NULLS LAST
             LIMIT 8",
            ['slug' => $slug, 'code' => $slug]
        );

        $response = $this->json(array_map(fn(array $r) => [
            'code'       => $r['code_insee'],
            'nom'        => $r['nom'],
            'slug'       => $r['slug'],
            'population' => $r['population'] !== null ? (int) $r['population'] : null,
        ], $rows));

        $response->headers->set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return $response;
    }
}
