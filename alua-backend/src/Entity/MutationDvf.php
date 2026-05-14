<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'mutations_dvf')]
#[ORM\Index(name: 'idx_mutations_dvf_commune', columns: ['code_commune'])]
#[ORM\Index(name: 'idx_mutations_dvf_date', columns: ['date_mutation'])]
#[ORM\Index(name: 'idx_mutations_dvf_dept', columns: ['code_departement'])]
class MutationDvf
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 20, unique: true)]
    private string $idMutation;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $dateMutation;

    #[ORM\Column(length: 80, nullable: true)]
    private ?string $natureMutation = null;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 2, nullable: true)]
    private ?string $valeurFonciere = null;

    #[ORM\Column(length: 5)]
    private string $codeCommune;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $nomCommune = null;

    #[ORM\Column(length: 3)]
    private string $codeDepartement;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $nombreLots = null;

    #[ORM\Column(length: 10)]
    private string $source = 'DVF';

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getIdMutation(): string { return $this->idMutation; }
    public function setIdMutation(string $idMutation): static { $this->idMutation = $idMutation; return $this; }
    public function getDateMutation(): \DateTimeImmutable { return $this->dateMutation; }
    public function setDateMutation(\DateTimeImmutable $dateMutation): static { $this->dateMutation = $dateMutation; return $this; }
    public function getNatureMutation(): ?string { return $this->natureMutation; }
    public function setNatureMutation(?string $natureMutation): static { $this->natureMutation = $natureMutation; return $this; }
    public function getValeurFonciere(): ?string { return $this->valeurFonciere; }
    public function setValeurFonciere(?string $valeurFonciere): static { $this->valeurFonciere = $valeurFonciere; return $this; }
    public function getCodeCommune(): string { return $this->codeCommune; }
    public function setCodeCommune(string $codeCommune): static { $this->codeCommune = $codeCommune; return $this; }
    public function getNomCommune(): ?string { return $this->nomCommune; }
    public function setNomCommune(?string $nomCommune): static { $this->nomCommune = $nomCommune; return $this; }
    public function getCodeDepartement(): string { return $this->codeDepartement; }
    public function setCodeDepartement(string $codeDepartement): static { $this->codeDepartement = $codeDepartement; return $this; }
    public function getNombreLots(): ?int { return $this->nombreLots; }
    public function setNombreLots(?int $nombreLots): static { $this->nombreLots = $nombreLots; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
