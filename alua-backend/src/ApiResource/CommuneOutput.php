<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\CommuneStateProvider;

#[ApiResource(
    operations: [new Get(provider: CommuneStateProvider::class)],
    uriTemplate: '/communes/{code}',
    shortName: 'Commune',
)]
final class CommuneOutput
{
    public string $code;
    public ?string $nom = null;
    public int $nbParcelles = 0;
    public int $nbTransactions = 0;
    public ?float $prixMedianM2 = null;
    public int $nbDpes = 0;
    public array $distributionDpe = [];  // {A:n, B:n, C:n, D:n, E:n, F:n, G:n}
    public array $evolutionPrix = [];    // [{annee, nbVentes, prixMedianM2}]
}
