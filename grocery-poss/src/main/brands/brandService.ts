import { BrandRecord, CreateBrandInput, UpdateBrandInput } from '../../shared/brands'
import { BrandRepository } from './brandRepository'

interface NormalizedBrandInput {
  name: string
  description: string
}

export class BrandService {
  constructor(private readonly brands: BrandRepository) {}

  listBrands(): BrandRecord[] {
    return this.brands.list()
  }

  getBrand(id: number): BrandRecord {
    this.assertValidId(id)

    const brand = this.brands.findById(id)

    if (!brand) {
      throw new Error('Brand not found.')
    }

    return brand
  }

  createBrand(input: CreateBrandInput): BrandRecord {
    const brand = this.normalizeCreateInput(input)
    this.assertUniqueName(brand.name)

    return this.brands.create(brand)
  }

  updateBrand(id: number, input: UpdateBrandInput): BrandRecord {
    this.assertValidId(id)

    const existingBrand = this.brands.findById(id)

    if (!existingBrand) {
      throw new Error('Brand not found.')
    }

    const brand = this.normalizeUpdateInput(input, existingBrand)
    this.assertUniqueName(brand.name, id)

    return this.brands.update(id, brand)
  }

  deleteBrand(id: number): void {
    this.assertValidId(id)

    if (!this.brands.findById(id)) {
      throw new Error('Brand not found.')
    }

    this.brands.delete(id)
  }

  private normalizeCreateInput(input: CreateBrandInput): NormalizedBrandInput {
    return {
      name: this.normalizeRequiredText(input.name, 'Brand name'),
      description: this.normalizeOptionalText(input.description)
    }
  }

  private normalizeUpdateInput(
    input: UpdateBrandInput,
    existingBrand: BrandRecord
  ): NormalizedBrandInput {
    return {
      name:
        input.name === undefined
          ? existingBrand.name
          : this.normalizeRequiredText(input.name, 'Brand name'),
      description:
        input.description === undefined
          ? existingBrand.description
          : this.normalizeOptionalText(input.description)
    }
  }

  private assertUniqueName(name: string, currentBrandId?: number): void {
    const existingBrand = this.brands.findByName(name)

    if (existingBrand && existingBrand.id !== currentBrandId) {
      throw new Error('Brand name is already used.')
    }
  }

  private normalizeRequiredText(value: string | undefined, fieldName: string): string {
    const normalizedValue = value?.trim() ?? ''

    if (!normalizedValue) {
      throw new Error(`${fieldName} is required.`)
    }

    return normalizedValue
  }

  private normalizeOptionalText(value: string | undefined): string {
    return value?.trim() ?? ''
  }

  private assertValidId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Brand id is invalid.')
    }
  }
}
