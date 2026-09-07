import { CategoryRecord, CreateCategoryInput, UpdateCategoryInput } from '../../shared/categories'
import { CategoryRepository } from './categoryRepository'

interface NormalizedCategoryInput {
  name: string
  description: string
}

export class CategoryService {
  constructor(private readonly categories: CategoryRepository) {}

  listCategories(): CategoryRecord[] {
    return this.categories.list()
  }

  getCategory(id: number): CategoryRecord {
    this.assertValidId(id)

    const category = this.categories.findById(id)

    if (!category) {
      throw new Error('Category not found.')
    }

    return category
  }

  createCategory(input: CreateCategoryInput): CategoryRecord {
    const category = this.normalizeCreateInput(input)
    this.assertUniqueName(category.name)

    return this.categories.create(category)
  }

  updateCategory(id: number, input: UpdateCategoryInput): CategoryRecord {
    this.assertValidId(id)

    const existingCategory = this.categories.findById(id)

    if (!existingCategory) {
      throw new Error('Category not found.')
    }

    const category = this.normalizeUpdateInput(input, existingCategory)
    this.assertUniqueName(category.name, id)

    return this.categories.update(id, category)
  }

  deleteCategory(id: number): void {
    this.assertValidId(id)

    if (!this.categories.findById(id)) {
      throw new Error('Category not found.')
    }

    this.categories.delete(id)
  }

  private normalizeCreateInput(input: CreateCategoryInput): NormalizedCategoryInput {
    return {
      name: this.normalizeRequiredText(input.name, 'Category name'),
      description: this.normalizeOptionalText(input.description)
    }
  }

  private normalizeUpdateInput(
    input: UpdateCategoryInput,
    existingCategory: CategoryRecord
  ): NormalizedCategoryInput {
    return {
      name:
        input.name === undefined
          ? existingCategory.name
          : this.normalizeRequiredText(input.name, 'Category name'),
      description:
        input.description === undefined
          ? existingCategory.description
          : this.normalizeOptionalText(input.description)
    }
  }

  private assertUniqueName(name: string, currentCategoryId?: number): void {
    const existingCategory = this.categories.findByName(name)

    if (existingCategory && existingCategory.id !== currentCategoryId) {
      throw new Error('Category name is already used.')
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
      throw new Error('Category id is invalid.')
    }
  }
}
