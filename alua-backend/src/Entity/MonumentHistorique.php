<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'monuments_historiques')]
#[ORM\Index(name: 'mh_geom_idx',    columns: ['geometry'], flags: ['spatial'])]
#[ORM\Index(name: 'mh_commune_idx', columns: ['commune_code'])]
class MonumentHistorique
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20, unique: true)]
    private string $reference;

    #[ORM\Column(length: 200, nullable: true)]
    private ?string $denomination = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $titre = null;

    #[ORM\Column(length: 200, nullable: true)]
    private ?string $commune = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $communeCode = null;

    #[ORM\Column(length: 3, nullable: true)]
    private ?string $departement = null;

    /** 'classé' ou 'inscrit' */
    #[ORM\Column(length: 20)]
    private string $protection;

    #[ORM\Column(type: 'geometry', options: ['geometry_type' => 'POINT', 'srid' => 4326])]
    private string $geometry;

    public function getId(): ?int { return $this->id; }
    public function getReference(): string { return $this->reference; }
    public function setReference(string $reference): static { $this->reference = $reference; return $this; }
    public function getDenomination(): ?string { return $this->denomination; }
    public function setDenomination(?string $denomination): static { $this->denomination = $denomination; return $this; }
    public function getTitre(): ?string { return $this->titre; }
    public function setTitre(?string $titre): static { $this->titre = $titre; return $this; }
    public function getCommune(): ?string { return $this->commune; }
    public function setCommune(?string $commune): static { $this->commune = $commune; return $this; }
    public function getCommuneCode(): ?string { return $this->communeCode; }
    public function setCommuneCode(?string $communeCode): static { $this->communeCode = $communeCode; return $this; }
    public function getDepartement(): ?string { return $this->departement; }
    public function setDepartement(?string $departement): static { $this->departement = $departement; return $this; }
    public function getProtection(): string { return $this->protection; }
    public function setProtection(string $protection): static { $this->protection = $protection; return $this; }
    public function getGeometry(): string { return $this->geometry; }
    public function setGeometry(string $geometry): static { $this->geometry = $geometry; return $this; }
}
