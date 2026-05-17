<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'rga_zones')]
#[ORM\Index(name: 'rga_zones_geom_idx', columns: ['geometry'], flags: ['spatial'])]
class RgaZone
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $niveauAlea = null;

    #[ORM\Column(type: 'geometry', options: ['geometry_type' => 'MULTIPOLYGON', 'srid' => 4326])]
    private string $geometry;

    public function getId(): ?int { return $this->id; }
    public function getNiveauAlea(): ?string { return $this->niveauAlea; }
    public function setNiveauAlea(?string $niveauAlea): static { $this->niveauAlea = $niveauAlea; return $this; }
    public function getGeometry(): string { return $this->geometry; }
    public function setGeometry(string $geometry): static { $this->geometry = $geometry; return $this; }
}
