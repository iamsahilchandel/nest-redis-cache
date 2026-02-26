export class Slug {
  constructor(public readonly value: string) {
    if (!Slug.isValid(value)) {
      throw new Error(`Invalid slug: "${value}"`);
    }
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }

  static fromName(name: string): Slug {
    const slugValue = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return new Slug(slugValue);
  }

  static isValid(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  }
}
