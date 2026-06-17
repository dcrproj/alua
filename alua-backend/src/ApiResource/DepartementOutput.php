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
    public string  $code;
    public ?string $slug             = null;
    public ?string $nom              = null;
    public ?string $codeRegion       = null;
    public ?string $nomRegion        = null;
    public ?string $slugRegion       = null;
    public array   $communes         = [];  // [{codeInsee, nom, slug, population}] top 50
    public int     $nbCommunesTotal  = 0;
    public ?int    $populationTotale = null;
    public int     $nbParcelles      = 0;
    public int     $nbTransactions   = 0;
    public int     $nbDpes           = 0;
    public ?float  $prixMedianM2     = null;
    public array   $evolutionPrix    = [];  // [{annee, nbVentes, prixMedianM2}]
    public array   $distributionDpe  = [];  // {A: n, B: n, …}
}
