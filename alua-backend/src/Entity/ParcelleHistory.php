<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity]
#[ORM\Table(name: 'parcelles_history')]
class ParcelleHistory
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Parcelle::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Parcelle $parcelle;

    #[ORM\Column]
    private \DateTimeImmutable $changedAt;

    #[ORM\Column(type: 'json')]
    private array $changedFields = [];

    #[ORM\Column(length: 50)]
    private string $source;

    #[ORM\Column(type: UuidType::NAME, nullable: true)]
    private ?Uuid $importBatchId = null;

    public function __construct(Parcelle $parcelle, array $changedFields, string $source)
    {
        $this->parcelle = $parcelle;
        $this->changedFields = $changedFields;
        $this->source = $source;
        $this->changedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid { return $this->id; }
    public function getParcelle(): Parcelle { return $this->parcelle; }
    public function getChangedAt(): \DateTimeImmutable { return $this->changedAt; }
    public function getChangedFields(): array { return $this->changedFields; }
    public function getSource(): string { return $this->source; }
    public function getImportBatchId(): ?Uuid { return $this->importBatchId; }
    public function setImportBatchId(?Uuid $importBatchId): static { $this->importBatchId = $importBatchId; return $this; }
}
