// services/business/category.service.js
import businessDataService from '@/services/cache/business-cache.service.js'

/**
 * 分类管理业务服务
 */
class CategoryService {
    /**
     * 获取所有分类（带排序）
     */
    async getAllCategories() {
        const categories = await businessDataService.getAllCategories()
        return categories.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1
            if (!a.isDefault && b.isDefault) return 1
            return (a.sortOrder || 999) - (b.sortOrder || 999)
        })
    }

    /**
     * 添加分类
     */
    async addCategory(category) {
        if (!category.name) throw new Error('分类名称不能为空')

        const existingCategories = await this.getAllCategories()
        const exists = existingCategories.some(
            c => c.name.toLowerCase() === category.name.trim().toLowerCase()
        )
        if (exists) throw new Error('该分类已存在')

        if (!category.sortOrder) {
            const maxSortOrder = Math.max(...existingCategories.map(c => c.sortOrder || 0), 0)
            category.sortOrder = maxSortOrder + 1
        }
        if (!category.icon) category.icon = 'fas fa-tag'

        return businessDataService.addCategory(category)
    }

    /**
     * 更新分类
     */
    async updateCategory(id, data) {
        const categories = await businessDataService.getAllCategories()
        const category = categories.find(c => c.id === id)

        if (!category) throw new Error('分类不存在')

        if (data.name && data.name !== category.name) {
            const exists = categories.some(
                c => c.id !== id && c.name.toLowerCase() === data.name.trim().toLowerCase()
            )
            if (exists) throw new Error('该分类名称已存在')
        }

        return businessDataService.updateCategory(id, data)
    }

    /**
     * 删除分类
     */
    async deleteCategory(id) {
        const categories = await businessDataService.getAllCategories()
        const category = categories.find(c => c.id === id)

        if (!category) throw new Error('分类不存在')
        if (category.isDefault) throw new Error('默认分类不能删除')

        const products = await businessDataService.getAllProducts()
        const hasProducts = products.some(p => p.category === category.name)
        if (hasProducts) throw new Error('该分类下还有商品，无法删除')

        return businessDataService.deleteCategory(id)
    }

    /**
     * 初始化默认分类
     */
    async initDefaultCategories() {
        const categories = await businessDataService.getAllCategories()
        if (categories.length > 0) return

        const defaultCategories = [
            { name: '蔬菜', icon: 'fas fa-carrot', sortOrder: 1, isDefault: true },
            { name: '水果', icon: 'fas fa-apple-alt', sortOrder: 2, isDefault: true },
            { name: '粮油', icon: 'fas fa-seedling', sortOrder: 3, isDefault: true },
            { name: '调味品', icon: 'fas fa-mortar-pestle', sortOrder: 4, isDefault: true },
            { name: '早餐', icon: 'fas fa-bread-slice', sortOrder: 5, isDefault: true },
            { name: '日用品', icon: 'fas fa-tshirt', sortOrder: 6, isDefault: true },
            { name: '其他', icon: 'fas fa-tag', sortOrder: 99, isDefault: true }
        ]

        await businessDataService.addCategories(defaultCategories)
    }

    /**
     * 检查分类名称是否重复
     */
    async isCategoryNameDuplicate(name, excludeId = null) {
        const categories = await this.getAllCategories()
        return categories.some(c =>
            c.id !== excludeId && c.name.toLowerCase() === name.trim().toLowerCase()
        )
    }

    /**
     * 获取分类统计信息
     */
    async getCategoryStats(categoryId) {
        const categories = await this.getAllCategories()
        const category = categories.find(c => c.id === categoryId)

        if (!category) return { productCount: 0, categoryName: '' }

        const products = await businessDataService.getAllProducts()
        const productCount = products.filter(p => p.category === category.name).length

        return { categoryName: category.name, productCount, isDefault: category.isDefault }
    }

    /**
     * 获取分类选项（用于快速添加）
     */
    getCategoryOptions(categories) {
        if (!categories || categories.length === 0) {
            return this.getDefaultCategories()
        }
        return categories.map(c => ({
            id: c.id,
            name: c.name,
            isDefault: c.isDefault || false,
            sortOrder: c.sortOrder || 999
        })).sort((a, b) => a.sortOrder - b.sortOrder)
    }

    /**
     * 获取默认分类列表
     */
    getDefaultCategories() {
        return [
            { id: 'default-1', name: '蔬菜', isDefault: true, sortOrder: 1 },
            { id: 'default-2', name: '水果', isDefault: true, sortOrder: 2 },
            { id: 'default-3', name: '粮油', isDefault: true, sortOrder: 3 },
            { id: 'default-4', name: '调味品', isDefault: true, sortOrder: 4 },
            { id: 'default-5', name: '日用品', isDefault: true, sortOrder: 5 },
            { id: 'default-6', name: '其他', isDefault: true, sortOrder: 99 }
        ]
    }
}

export default new CategoryService()