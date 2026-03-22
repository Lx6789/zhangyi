// data_migration/useDataExport.js
import * as XLSX from 'xlsx'
import businessDataService from '@/services/business-data.service.js'
import { personalSavingCache, groupSavingCache, savingService } from '@/services'
import notificationService from '@/services/utils/notification.service.js'

export function Export() {
    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // 格式化金额
    const formatMoney = (num) => {
        if (num === undefined || num === null) return '0.00'
        return parseFloat(num).toFixed(2)
    }

    // 获取收支数据
    const getIncomeExpenseData = async (userId, options, dateRange) => {
        const data = []
        const records = await businessDataService.getAllBusinessRecords()

        // 按日期筛选
        let filteredRecords = [...records]
        if (dateRange.start) {
            filteredRecords = filteredRecords.filter(r => r.date >= dateRange.start)
        }
        if (dateRange.end) {
            filteredRecords = filteredRecords.filter(r => r.date <= dateRange.end)
        }

        // 按类型筛选
        if (!options.incomeExpenseType.personal && options.incomeExpenseType.business) {
            filteredRecords = filteredRecords.filter(r => r.businessType === 'business')
        } else if (options.incomeExpenseType.personal && !options.incomeExpenseType.business) {
            filteredRecords = filteredRecords.filter(r => r.businessType !== 'business')
        }

        for (const record of filteredRecords) {
            data.push({
                '日期': record.date,
                '类型': record.type,
                '分类': record.category,
                '子分类/项目': record.subtype || record.source || '',
                '金额': formatMoney(record.amount),
                '支付/收款方式': record.paymentMethod || '',
                '供应商/客户': record.supplier || record.customerName || '',
                '备注': record.note || '',
                '业务类型': record.businessType === 'business' ? '生意记账' : '个人记账'
            })
        }

        data.sort((a, b) => a['日期'].localeCompare(b['日期']))
        return data
    }

    // 获取个人存钱数据
    const getPersonalSavingData = async (userId) => {
        const data = []
        try {
            await personalSavingCache.init(userId)
            const plans = await personalSavingCache.getAllPlans(userId)
            const activePlans = plans.filter(p => p.deleted !== 1)

            for (const plan of activePlans) {
                const records = await personalSavingCache.getDepositRecords(
                    userId,
                    plan.id,
                    { page: 1, size: 500 }
                )

                for (const record of records.records || []) {
                    data.push({
                        '计划名称': plan.name,
                        '计划类型': plan.type || '日常储蓄',
                        '目标金额': formatMoney(plan.targetAmount),
                        '存入金额': formatMoney(record.amount),
                        '存入时间': formatDate(record.depositTime),
                        '存后余额': formatMoney(record.afterAmount),
                        '备注': record.note || ''
                    })
                }
            }
        } catch (error) {
            console.error('获取个人存钱数据失败:', error)
        }

        data.sort((a, b) => a['存入时间'].localeCompare(b['存入时间']))
        return data
    }

    // 获取多人存钱数据
    const getGroupSavingData = async (userId) => {
        const data = []
        try {
            await groupSavingCache.init(userId)
            const response = await savingService.getGroupSavingsList({}, false)
            const plans = response.code === 200 ? (response.data || []) : []

            for (const plan of plans) {
                const result = await groupSavingCache.getDepositRecords(
                    userId,
                    plan.id,
                    { page: 1, size: 500 }
                )

                for (const record of result?.records || []) {
                    data.push({
                        '计划名称': plan.name,
                        '计划类型': plan.type || '日常储蓄',
                        '目标金额': formatMoney(plan.targetAmount),
                        '当前总额': formatMoney(plan.currentAmount),
                        '存入成员': record.memberName || `用户${record.memberId}`,
                        '存入金额': formatMoney(record.amount),
                        '存入时间': formatDate(record.depositTime),
                        '该成员累计': formatMoney(record.afterAmount),
                        '备注': record.note || ''
                    })
                }
            }
        } catch (error) {
            console.error('获取多人存钱数据失败:', error)
        }

        data.sort((a, b) => a['存入时间'].localeCompare(b['存入时间']))
        return data
    }

    // 获取库存数据
    const getInventoryData = async () => {
        const data = []
        try {
            const items = await businessDataService.getAllInventory()
            for (const item of items) {
                data.push({
                    '商品名称': item.productName || '',
                    '分类': item.category || '',
                    '库存数量': item.quantity || 0,
                    '单位': item.unit || '',
                    '进货价': formatMoney(item.purchasePrice),
                    '售价': formatMoney(item.sellingPrice),
                    '过期日期': item.expiryDate || '',
                    '状态': item.status || '正常',
                    '备注': item.note || ''
                })
            }
        } catch (error) {
            console.error('获取库存数据失败:', error)
        }
        return data
    }

    // 获取商品数据
    const getProductsData = async () => {
        const data = []
        try {
            const products = await businessDataService.getAllProducts()
            for (const product of products) {
                data.push({
                    '商品名称': product.name || '',
                    '分类': product.category || '',
                    '单位': product.unit || '',
                    '默认进价': formatMoney(product.defaultPurchasePrice),
                    '默认售价': formatMoney(product.defaultPrice),
                    '备注': product.note || ''
                })
            }
        } catch (error) {
            console.error('获取商品数据失败:', error)
        }
        return data
    }

    // 获取商品分类数据
    const getCategoriesData = async () => {
        const data = []
        try {
            const categories = await businessDataService.getAllCategories()
            for (const category of categories) {
                data.push({
                    '分类名称': category.name,
                    '图标': category.icon || '',
                    '排序': category.sortOrder || 0,
                    '是否默认': category.isDefault ? '是' : '否'
                })
            }
        } catch (error) {
            console.error('获取分类数据失败:', error)
        }
        return data
    }

    // 获取供应商数据
    const getSuppliersData = async () => {
        const data = []
        try {
            const suppliers = await businessDataService.getAllSuppliers()
            for (const supplier of suppliers) {
                data.push({
                    '供应商名称': supplier.name,
                    '联系人': supplier.contact || '',
                    '电话': supplier.phone || '',
                    '地址': supplier.address || '',
                    '备注': supplier.note || ''
                })
            }
        } catch (error) {
            console.error('获取供应商数据失败:', error)
        }
        return data
    }

    // 获取客户数据
    const getCustomersData = async () => {
        const data = []
        try {
            const customers = JSON.parse(localStorage.getItem('customers') || '[]')
            for (const customer of customers) {
                data.push({
                    '客户名称': customer.name,
                    '客户类型': customer.type === 'company' ? '企业' : '个人',
                    '联系人': customer.contact || '',
                    '电话': customer.phone || '',
                    '地址': customer.address || '',
                    '信用额度': formatMoney(customer.creditLimit),
                    '当前欠款': formatMoney(customer.currentDebt),
                    '备注': customer.note || ''
                })
            }
        } catch (error) {
            console.error('获取客户数据失败:', error)
        }
        return data
    }

    // 导出为 Excel
    const exportToExcel = async (userId, options, dateRange, onProgress) => {
        const workbook = XLSX.utils.book_new()
        const sheets = []

        // 导出收支数据
        if (options.incomeExpense) {
            if (onProgress) onProgress('正在导出收支数据...')
            const data = await getIncomeExpenseData(userId, options, dateRange)
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '收支记录')
                sheets.push('收支记录')
            }
        }

        // 导出个人存钱数据
        if (options.saving && options.savingType.personal) {
            if (onProgress) onProgress('正在导出个人存钱数据...')
            const data = await getPersonalSavingData(userId)
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '个人存钱记录')
                sheets.push('个人存钱记录')
            }
        }

        // 导出多人存钱数据
        if (options.saving && options.savingType.group) {
            if (onProgress) onProgress('正在导出多人存钱数据...')
            const data = await getGroupSavingData(userId)
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '多人存钱记录')
                sheets.push('多人存钱记录')
            }
        }

        // 导出库存数据
        if (options.inventory) {
            if (onProgress) onProgress('正在导出库存数据...')
            const data = await getInventoryData()
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '库存数据')
                sheets.push('库存数据')
            }
        }

        // 导出商品数据
        if (options.products) {
            if (onProgress) onProgress('正在导出商品数据...')
            const data = await getProductsData()
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '商品数据')
                sheets.push('商品数据')
            }
        }

        // 导出商品分类
        if (options.categories) {
            if (onProgress) onProgress('正在导出商品分类...')
            const data = await getCategoriesData()
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '商品分类')
                sheets.push('商品分类')
            }
        }

        // 导出供应商
        if (options.suppliers) {
            if (onProgress) onProgress('正在导出供应商...')
            const data = await getSuppliersData()
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '供应商')
                sheets.push('供应商')
            }
        }

        // 导出客户
        if (options.customers) {
            if (onProgress) onProgress('正在导出客户...')
            const data = await getCustomersData()
            if (data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, '客户')
                sheets.push('客户')
            }
        }

        return { workbook, sheets }
    }

    return {
        exportToExcel,
        formatDate,
        formatMoney
    }
}