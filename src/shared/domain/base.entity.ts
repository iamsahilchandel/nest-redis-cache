export abstract class BaseEntity<TId = number> {
  constructor(
    public readonly id: TId,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  equals(other: BaseEntity<TId>): boolean {
    if (!(other instanceof BaseEntity)) return false;
    return this.id === other.id;
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }
}
