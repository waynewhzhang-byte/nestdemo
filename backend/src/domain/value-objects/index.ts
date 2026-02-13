export class ISBN {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): ISBN {
    const cleaned = value.replace(/[-\s]/g, "");
    if (!/^\d{10,13}$/.test(cleaned)) {
      throw new Error("Invalid ISBN format");
    }
    return new ISBN(cleaned);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

export class Money {
  private readonly amount: number;
  private readonly currency: string;

  private constructor(amount: number, currency: string = "USD") {
    this.amount = Math.round(amount * 100) / 100;
    this.currency = currency;
  }

  static create(amount: number, currency: string = "USD"): Money {
    if (amount < 0) {
      throw new Error("Amount cannot be negative");
    }
    return new Money(amount, currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot subtract different currencies");
    }
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error("Result cannot be negative");
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

export class DueDate {
  private readonly value: Date;

  private constructor(value: Date) {
    this.value = value;
  }

  static create(daysFromNow: number): DueDate {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(23, 59, 59, 999);
    return new DueDate(date);
  }

  static fromDate(date: Date): DueDate {
    return new DueDate(new Date(date));
  }

  static now(): DueDate {
    return new DueDate(new Date());
  }

  getValue(): Date {
    return this.value;
  }

  isOverdue(): boolean {
    return new Date() > this.value;
  }

  daysUntilDue(): number {
    const now = new Date();
    return Math.ceil(
      (this.value.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  addDays(days: number): DueDate {
    const newDate = new Date(this.value);
    newDate.setDate(newDate.getDate() + days);
    return new DueDate(newDate);
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
