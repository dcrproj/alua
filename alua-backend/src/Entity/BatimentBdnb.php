<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'batiment_bdnb')]
#[ORM\UniqueConstraint(name: 'batiment_bdnb_unique', columns: ['parcelle_id', 'batiment_groupe_id'])]
#[ORM\Index(name: 'batiment_bdnb_parcelle_idx', columns: ['parcelle_id'])]
class BatimentBdnb
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 14)]
    private string $parcelleId;

    #[ORM\Column(length: 22)]
    private string $batimentGroupeId;

    #[ORM\Column(nullable: true)]
    private ?int $anneeConstruction = null;

    #[ORM\Column(nullable: true)]
    private ?int $nbLogements = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $usageNiveau1 = null;

    #[ORM\Column(length: 20)]
    private string $millesime = '2025-07-a';

    public function getId(): ?int { return $this->id; }
    public function getParcelleId(): string { return $this->parcelleId; }
    public function setParcelleId(string $parcelleId): static { $this->parcelleId = $parcelleId; return $this; }
    public function getBatimentGroupeId(): string { return $this->batimentGroupeId; }
    public function setBatimentGroupeId(string $batimentGroupeId): static { $this->batimentGroupeId = $batimentGroupeId; return $this; }
    public function getAnneeConstruction(): ?int { return $this->anneeConstruction; }
    public function setAnneeConstruction(?int $anneeConstruction): static { $this->anneeConstruction = $anneeConstruction; return $this; }
    public function getNbLogements(): ?int { return $this->nbLogements; }
    public function setNbLogements(?int $nbLogements): static { $this->nbLogements = $nbLogements; return $this; }
    public function getUsageNiveau1(): ?string { return $this->usageNiveau1; }
    public function setUsageNiveau1(?string $usageNiveau1): static { $this->usageNiveau1 = $usageNiveau1; return $this; }
    public function getMillesime(): string { return $this->millesime; }
    public function setMillesime(string $millesime): static { $this->millesime = $millesime; return $this; }
}
