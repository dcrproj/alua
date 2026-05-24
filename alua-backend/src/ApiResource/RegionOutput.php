<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\RegionStateProvider;

#[ApiResource(
    operations: [new Get(provider: RegionStateProvider::class)],
    uriTemplate: '/regions/{slug}',
    shortName: 'Region',
)]
final class RegionOutput
{
    public string $code;
    public ?string $slug           = null;
    public ?string $nom            = null;
    public int     $nbTransactions = 0;
    public ?float  $prixMedianM2   = null;
    public int     $nbDpes         = 0;
    public array   $distributionDpe  = [];  // {A:n, …}
    public array   $evolutionPrix    = [];  // [{annee, nbVentes, prixMedianM2}]
    public array   $departements     = [];  // [{code, nom, slug, prixMedianM2}]
}
