// data_migration/useDataImport.js
import businessDataService from '@/services/business-data.service.js'
import { personalSavingCache, groupSavingCache, savingService } from '@/services'
import notificationService from '@/services/utils/notification.service.js'
import indexedDBService from '@/services/db/indexed-db.service.js'

export function Import() {
    // 解析导入的文件
    const parseImportFile = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result)
                    resolve(data)
                } catch (error) {
                    reject(new Error('文件解析失败，请确保是有效的 JSON 格式'))
                }
            }
            reader.onerror = () => reject(new Error('文件读取失败'))
            reader.readAsText(file)
        })
    }

    // 导入收支数据
    const importIncomeExpenseData = async (data) => {
        const records = data.incomeExpense || []
        let successCount = 0
        let failCount = 0

        for (const record of records) {
            try {
                // 根据业务类型选择对应的表
                if (record.businessType === '生意记账' || record.业务类型 === '生意记账') {
                    if (record.type === '收入' || record.类型 === '收入') {
                        await businessDataService.addIncomeRecord({
                            date: record.date || record.日期,
                            category: record.category || record.分类,
                            amount: parseFloat(record.amount || record.金额),
                            paymentMethod: record.paymentMethod || record.支付方式,
                            note: record.note || record.备注,
                            businessType: 'business'
                        })
                    } else {
                        await businessDataService.addExpenseRecord({
                            date: record.date || record.日期,
                            category: record.category || record.分类,
                            amount: parseFloat(record.amount || record.金额),
                            paymentMethod: record.paymentMethod || record.支付方式,
                            supplier: record.supplier || record.供应商,
                            note: record.note || record.备注,
                            businessType: 'business'
                        })
                    }
                } else {
                    await businessDataService.addDailyRecord({
                        date: record.date || record.日期,
                        type: record.type || record.类型,
                        category: record.category || record.分类,
                        amount: parseFloat(record.amount || record.金额),
                        note: record.note || record.备注,
                        businessType: 'personal'
                    })
                }
                successCount++
            } catch (error) {
                console.error('导入收支记录失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入个人存钱数据
    const importPersonalSavingData = async (userId, data) => {
        const plans = data.personalSaving || []
        let successCount = 0
        let failCount = 0

        try {
            await personalSavingCache.init(userId)

            for (const planData of plans) {
                try {
                    // 创建计划
                    const createResult = await personalSavingCache.createPlan(userId, {
                        name: planData.计划名称,
                        type: planData.计划类型 || '日常储蓄',
                        targetAmount: parseFloat(planData.目标金额),
                        currentAmount: parseFloat(planData.当前金额 || 0),
                        deadline: planData.截止日期,
                        reason: planData.理由 || ''
                    })

                    if (createResult.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error('导入个人存钱计划失败:', error)
                    failCount++
                }
            }
        } catch (error) {
            console.error('导入个人存钱数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 导入多人存钱数据
    const importGroupSavingData = async (userId, data) => {
        const plans = data.groupSaving || []
        let successCount = 0
        let failCount = 0

        try {
            await groupSavingCache.init(userId)

            for (const planData of plans) {
                try {
                    // 创建计划
                    const createResult = await savingService.createGroupSavings({
                        name: planData.计划名称,
                        type: planData.计划类型 || '日常储蓄',
                        targetAmount: parseFloat(planData.目标金额),
                        deadline: planData.截止日期,
                        reason: planData.理由 || '',
                        members: planData.成员 || []
                    })

                    if (createResult.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error('导入多人存钱计划失败:', error)
                    failCount++
                }
            }
        } catch (error) {
            console.error('导入多人存钱数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 导入商品数据
    const importProductsData = async (data) => {
        const products = data.products || []
        let successCount = 0
        let failCount = 0

        for (const product of products) {
            try {
                await businessDataService.addProduct({
                    name: product.商品名称,
                    category: product.分类,
                    unit: product.单位,
                    defaultPrice: parseFloat(product.默认售价) || 0,
                    defaultPurchasePrice: parseFloat(product.默认进价) || 0,
                    note: product.备注
                })
                successCount++
            } catch (error) {
                console.error('导入商品失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入库存数据
    const importInventoryData = async (data) => {
        const inventory = data.inventory || []
        let successCount = 0
        let failCount = 0

        for (const item of inventory) {
            try {
                await businessDataService.addInventoryItem({
                    productName: item.商品名称,
                    category: item.分类,
                    quantity: parseFloat(item.库存数量) || 0,
                    unit: item.单位,
                    purchasePrice: parseFloat(item.进货价) || 0,
                    sellingPrice: parseFloat(item.售价) || 0,
                    expiryDate: item.过期日期,
                    status: item.状态,
                    note: item.备注
                })
                successCount++
            } catch (error) {
                console.error('导入库存失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入商品分类
    const importCategoriesData = async (data) => {
        const categories = data.categories || []
        let successCount = 0
        let failCount = 0

        for (const category of categories) {
            try {
                await businessDataService.addCategory({
                    name: category.分类名称,
                    icon: category.图标,
                    sortOrder: category.排序,
                    isDefault: category.是否默认 === '是'
                })
                successCount++
            } catch (error) {
                console.error('导入分类失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入供应商
    const importSuppliersData = async (data) => {
        const suppliers = data.suppliers || []
        let successCount = 0
        let failCount = 0

        for (const supplier of suppliers) {
            try {
                await businessDataService.addSupplier({
                    name: supplier.供应商名称,
                    contact: supplier.联系人,
                    phone: supplier.电话,
                    address: supplier.地址,
                    note: supplier.备注
                })
                successCount++
            } catch (error) {
                console.error('导入供应商失败:', error)
                failCount++
            }
        }

        return { successCount, failCount }
    }

    // 导入客户
    const importCustomersData = async (data) => {
        const customers = data.customers || []
        let successCount = 0
        let failCount = 0

        try {
            const existingCustomers = JSON.parse(localStorage.getItem('customers') || '[]')

            for (const customer of customers) {
                try {
                    existingCustomers.push({
                        id: Date.now() + Math.random(),
                        name: customer.客户名称,
                        type: customer.客户类型 === '企业' ? 'company' : 'personal',
                        contact: customer.联系人,
                        phone: customer.电话,
                        address: customer.地址,
                        creditLimit: parseFloat(customer.信用额度) || 0,
                        currentDebt: parseFloat(customer.当前欠款) || 0,
                        note: customer.备注,
                        createTime: new Date().toISOString()
                    })
                    successCount++
                } catch (error) {
                    console.error('导入客户失败:', error)
                    failCount++
                }
            }

            localStorage.setItem('customers', JSON.stringify(existingCustomers))
        } catch (error) {
            console.error('导入客户数据失败:', error)
        }

        return { successCount, failCount }
    }

    // 清空当前用户数据
    const clearUserData = async (userId) => {
        try {
            // 清空业务数据
            await businessDataService.clearUserData()

            // 清空个人存钱数据
            await personalSavingCache.init(userId)
            await personalSavingCache.clearUserPlans(userId)

            // 清空多人存钱数据
            await groupSavingCache.init(userId)
            await groupSavingCache.clearUserCache(userId)

            return true
        } catch (error) {
            console.error('清空用户数据失败:', error)
            return false
        }
    }

    return {
        parseImportFile,
        importIncomeExpenseData,
        importPersonalSavingData,
        importGroupSavingData,
        importProductsData,
        importInventoryData,
        importCategoriesData,
        importSuppliersData,
        importCustomersData,
        clearUserData
    }
}