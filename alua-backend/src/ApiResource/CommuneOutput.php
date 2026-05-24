<?php

declare(strict_types=1);

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\CommuneStateProvider;

#[ApiResource(
    operations: [new Get(provider: CommuneStateProvider::class)],
    uriTemplate: '/communes/{slug}',
    shortName: 'Commune',
)]
final class CommuneOutput
{
    public string $code;
    public ?string $slug           = null;
    public ?string $nom            = null;
    public ?string $codeDepartement = null;
    public ?string $nomDepartement  = null;
    public ?string $slugDepartement = null;
    public ?string $codeRegion      = null;
    public ?string $nomRegion       = null;
    public ?string $slugRegion      = null;
    public int $nbParcelles = 0;
    public int $nbTransactions = 0;
    public ?float $prixMedianM2 = null;
    public int $nbDpes = 0;
    public array $distributionDpe = [];  // {A:n, B:n, C:n, D:n, E:n, F:n, G:n}
    public array $evolutionPrix = [];    // [{annee, nbVentes, prixMedianM2}]
    public array $transactions = [];     // [{idMutation, date, valeurFonciere, nature, typeLocal, surfaceBati, surfaceCarrez, nombrePieces, idParcelle}]
    public bool $transactionsTruncated = false;
}
