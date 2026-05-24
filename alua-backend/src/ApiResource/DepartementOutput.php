<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\DepartementStateProvider;

#[ApiResource(
    operations: [new Get(provider: DepartementStateProvider::class)],
    uriTemplate: '/departements/{slug}',
    shortName: 'Departement',
)]
final class DepartementOutput
{
    public string $code;
    public ?string $slug         = null;
    public ?string $nom          = null;
    public ?string $codeRegion   = null;
    public ?string $nomRegion    = null;
    public ?string $slugRegion   = null;
    public int     $nbTransactions = 0;
    public ?float  $prixMedianM2 = null;
    public int     $nbDpes       = 0;
    public array   $distributionDpe = [];  // {A:n, …}
    public array   $evolutionPrix   = [];  // [{annee, nbVentes, prixMedianM2}]
    public array   $communes        = [];  // [{codeInsee, nom, slug, population}] top 20
}
