export class Money {
  constructor(public readonly amount: string) {
    if (isNaN(Number(amount))) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }
  }

  toNumber(): number {
    return parseFloat(this.amount);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  isGreaterThan(other: Money): boolean {
    return this.toNumber() > other.toNumber();
  }

  static fromNumber(value: number): Money {
    return new Money(value.toFixed(2));
  }

  static zero(): Money {
    return new Money('0.00');
  }
}
