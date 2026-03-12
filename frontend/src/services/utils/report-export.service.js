// services/utils/report-export.service.js
import * as XLSX from 'xlsx'
import dateHelper from './date-helper.service.js'

/**
 * 报表导出服务
 * 提供各种报表的导出功能，支持 XLS 格式
 */
class ReportExportService {
    constructor() {
        this.defaultFileName = '报表导出'
    }

    /**
     * 格式化日期时间为文件名友好格式
     */
    formatDateTimeForFileName() {
        const now = new Date()
        const year = now.getFullYear()
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const day = now.getDate().toString().padStart(2, '0')
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const seconds = now.getSeconds().toString().padStart(2, '0')
        return `${year}${month}${day}_${hours}${minutes}${seconds}`
    }

    /**
     * 创建 Excel 工作簿
     */
    createWorkbook() {
        return XLSX.utils.book_new()
    }

    /**
     * 计算合计值
     */
    calculateTotals(data, columns) {
        const totals = {}

        // 初始化合计对象
        columns.forEach(col => {
            if (col.summary !== false) {  // 只有需要合计的列才计算
                totals[col.field] = 0
            }
        })

        // 累加数据
        data.forEach(item => {
            columns.forEach(col => {
                if (col.summary !== false) {
                    const value = this.getNestedValue(item, col.field)
                    const num = parseFloat(value)
                    if (!isNaN(num)) {
                        totals[col.field] += num
                    }
                }
            })
        })

        return totals
    }

    /**
     * 添加工作表到工作簿（带合计行）
     */
    addSheetToWorkbook(workbook, data, sheetName, columns, showTotals = true) {
        // 准备表头
        const headers = columns.map(col => col.header)

        // 准备数据行
        const rows = data.map(item => {
            return columns.map(col => {
                const value = this.getNestedValue(item, col.field)
                return this.formatValue(value, col.format)
            })
        })

        let worksheetData = [headers, ...rows]

        // 如果需要合计行
        if (showTotals && data.length > 0) {
            const totals = this.calculateTotals(data, columns)

            // 创建合计行
            const totalRow = columns.map(col => {
                if (col.summary === false) {
                    // 不需要合计的列，留空或显示"合计"
                    return col.field === 'date' ? '合计' : ''
                } else {
                    const total = totals[col.field] || 0
                    return this.formatValue(total, col.format)
                }
            })

            worksheetData.push(totalRow)
        }

        // 创建工作表
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

        // 设置列宽
        const colWidths = columns.map(col => ({ wch: col.width || 15 }))
        worksheet['!cols'] = colWidths

        // 添加到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

        return worksheet
    }

    /**
     * 获取嵌套对象的值（支持点语法）
     */
    getNestedValue(obj, path) {
        if (!obj || !path) return ''

        const keys = path.split('.')
        let value = obj

        for (const key of keys) {
            if (value === null || value === undefined) return ''
            value = value[key]
        }

        return value !== null && value !== undefined ? value : ''
    }

    /**
     * 格式化值
     */
    formatValue(value, format) {
        if (value === null || value === undefined) return ''

        switch (format) {
            case 'currency':
                // 金额格式
                const num = parseFloat(value)
                return isNaN(num) ? '' : num.toFixed(2)

            case 'date':
                // 日期格式
                if (value && typeof value === 'string' && value.includes('-')) {
                    const [year, month, day] = value.split('-')
                    return `${year}年${parseInt(month)}月${parseInt(day)}日`
                }
                return value || ''

            case 'percentage':
                // 百分比格式
                const pct = parseFloat(value)
                return isNaN(pct) ? '' : (pct * 100).toFixed(1) + '%'

            case 'integer':
                // 整数格式
                const int = parseInt(value)
                return isNaN(int) ? '' : int.toString()

            default:
                return value !== null && value !== undefined ? value.toString() : ''
        }
    }

    /**
     * 下载 Excel 文件
     */
    downloadWorkbook(workbook, fileName) {
        const safeFileName = fileName || `${this.defaultFileName}_${this.formatDateTimeForFileName()}`
        XLSX.writeFile(workbook, `${safeFileName}.xlsx`)
    }

    // ==================== 具体报表导出方法 ====================

    /**
     * 导出收入报表
     */
    exportIncomeReport(records, dateRange) {
        const workbook = this.createWorkbook()

        // 定义列
        const columns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '销售渠道', field: 'channel', width: 15, summary: false },
            { header: '商品名称', field: 'productName', width: 20, summary: false },
            { header: '商品分类', field: 'category', width: 12, summary: false },
            { header: '客户', field: 'customer', width: 15, summary: false },
            { header: '数量', field: 'quantity', width: 10, format: 'integer', summary: true },
            { header: '单价(元)', field: 'price', width: 12, format: 'currency', summary: false },
            { header: '总金额(元)', field: 'amount', width: 15, format: 'currency', summary: true },
            { header: '收款方式', field: 'paymentMethod', width: 12, summary: false },
            { header: '备注', field: 'note', width: 25, summary: false }
        ]

        // 添加数据表（带合计行）
        this.addSheetToWorkbook(workbook, records, '收入明细', columns, true)

        // 添加汇总表
        this.addIncomeSummarySheet(workbook, records)

        // 生成文件名
        const fileName = `收入报表_${dateRange.start}_至_${dateRange.end}`
        this.downloadWorkbook(workbook, fileName)
    }

    /**
     * 添加收入汇总表
     */
    addIncomeSummarySheet(workbook, records) {
        // 按渠道汇总
        const channelSummary = {}
        let totalAmount = 0

        records.forEach(record => {
            const channel = record.channel || record.source || '其他'
            if (!channelSummary[channel]) {
                channelSummary[channel] = {
                    channel,
                    amount: 0,
                    count: 0
                }
            }
            channelSummary[channel].amount += record.amount || 0
            channelSummary[channel].count++
            totalAmount += record.amount || 0
        })

        const summaryData = Object.values(channelSummary)
        summaryData.sort((a, b) => b.amount - a.amount)

        // 添加百分比
        summaryData.forEach(item => {
            item.percentage = totalAmount > 0 ? item.amount / totalAmount : 0
        })

        const columns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '销售渠道', field: 'channel', width: 20, summary: false },
            { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true },
            { header: '总金额(元)', field: 'amount', width: 15, format: 'currency', summary: true },
            { header: '占比', field: 'percentage', width: 12, format: 'percentage', summary: false }
        ]

        this.addSheetToWorkbook(workbook, summaryData, '收入汇总', columns, true)
    }

    /**
     * 导出支出报表
     */
    exportExpenseReport(records, dateRange) {
        const workbook = this.createWorkbook()

        const columns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '支出类型', field: 'category', width: 15, summary: false },
            { header: '具体项目', field: 'subtype', width: 15, summary: false },
            { header: '金额(元)', field: 'amount', width: 15, format: 'currency', summary: true },
            { header: '供应商/收款方', field: 'supplier', width: 20, summary: false },
            { header: '支付方式', field: 'paymentMethod', width: 12, summary: false },
            { header: '备注', field: 'note', width: 25, summary: false }
        ]

        this.addSheetToWorkbook(workbook, records, '支出明细', columns, true)
        this.addExpenseSummarySheet(workbook, records)

        const fileName = `支出报表_${dateRange.start}_至_${dateRange.end}`
        this.downloadWorkbook(workbook, fileName)
    }

    /**
     * 添加支出汇总表
     */
    addExpenseSummarySheet(workbook, records) {
        // 按类型汇总
        const typeSummary = {}
        let totalAmount = 0

        records.forEach(record => {
            const type = record.category || '其他'
            if (!typeSummary[type]) {
                typeSummary[type] = {
                    category: type,
                    amount: 0,
                    count: 0,
                    details: {}
                }
            }
            typeSummary[type].amount += record.amount || 0
            typeSummary[type].count++
            totalAmount += record.amount || 0

            // 子类型汇总
            const subtype = record.subtype || '其他'
            if (!typeSummary[type].details[subtype]) {
                typeSummary[type].details[subtype] = {
                    subtype,
                    amount: 0,
                    count: 0
                }
            }
            typeSummary[type].details[subtype].amount += record.amount || 0
            typeSummary[type].details[subtype].count++
        })

        // 主类型汇总数据
        const mainSummary = Object.values(typeSummary).map(item => ({
            category: item.category,
            amount: item.amount,
            count: item.count,
            percentage: totalAmount > 0 ? item.amount / totalAmount : 0
        }))
        mainSummary.sort((a, b) => b.amount - a.amount)

        const mainColumns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '支出类型', field: 'category', width: 20, summary: false },
            { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true },
            { header: '总金额(元)', field: 'amount', width: 15, format: 'currency', summary: true },
            { header: '占比', field: 'percentage', width: 12, format: 'percentage', summary: false }
        ]

        this.addSheetToWorkbook(workbook, mainSummary, '支出类型汇总', mainColumns, true)

        // 子类型详细汇总
        const detailData = []
        Object.values(typeSummary).forEach(mainType => {
            Object.values(mainType.details).forEach(sub => {
                detailData.push({
                    category: mainType.category,
                    subtype: sub.subtype,
                    amount: sub.amount,
                    count: sub.count,
                    percentage: mainType.amount > 0 ? sub.amount / mainType.amount : 0
                })
            })
        })
        detailData.sort((a, b) => b.amount - a.amount)

        const detailColumns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '支出类型', field: 'category', width: 15, summary: false },
            { header: '具体项目', field: 'subtype', width: 15, summary: false },
            { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true },
            { header: '金额(元)', field: 'amount', width: 15, format: 'currency', summary: true },
            { header: '类型内占比', field: 'percentage', width: 12, format: 'percentage', summary: false }
        ]

        this.addSheetToWorkbook(workbook, detailData, '支出明细汇总', detailColumns, true)
    }

    /**
     * 导出利润报表
     */
    exportProfitReport(records, dateRange) {
        const workbook = this.createWorkbook()

        // 按日期分组
        const dailyData = {}
        records.forEach(record => {
            const date = record.date
            if (!dailyData[date]) {
                dailyData[date] = {
                    date,
                    income: 0,
                    expense: 0,
                    profit: 0,
                    count: 0
                }
            }
            if (record.type === '收入') {
                dailyData[date].income += record.amount || 0
            } else {
                dailyData[date].expense += record.amount || 0
            }
            dailyData[date].profit = dailyData[date].income - dailyData[date].expense
            dailyData[date].count++
        })

        const dailyProfitData = Object.values(dailyData).sort((a, b) =>
            b.date.localeCompare(a.date)
        )

        const columns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '收入(元)', field: 'income', width: 15, format: 'currency', summary: true },
            { header: '支出(元)', field: 'expense', width: 15, format: 'currency', summary: true },
            { header: '利润(元)', field: 'profit', width: 15, format: 'currency', summary: true },
            { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true }
        ]

        this.addSheetToWorkbook(workbook, dailyProfitData, '每日利润', columns, true)

        // 计算总计
        const totalIncome = records.filter(r => r.type === '收入').reduce((sum, r) => sum + (r.amount || 0), 0)
        const totalExpense = records.filter(r => r.type === '支出').reduce((sum, r) => sum + (r.amount || 0), 0)

        const summaryData = [{
            period: `${dateRange.start} 至 ${dateRange.end}`,
            totalIncome,
            totalExpense,
            totalProfit: totalIncome - totalExpense,
            transactionCount: records.length
        }]

        const summaryColumns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '统计周期', field: 'period', width: 25, summary: false },
            { header: '总收入(元)', field: 'totalIncome', width: 15, format: 'currency', summary: true },
            { header: '总支出(元)', field: 'totalExpense', width: 15, format: 'currency', summary: true },
            { header: '净利润(元)', field: 'totalProfit', width: 15, format: 'currency', summary: true },
            { header: '交易笔数', field: 'transactionCount', width: 12, format: 'integer', summary: true }
        ]

        this.addSheetToWorkbook(workbook, summaryData, '利润汇总', summaryColumns, true)

        const fileName = `利润报表_${dateRange.start}_至_${dateRange.end}`
        this.downloadWorkbook(workbook, fileName)
    }

    /**
     * 导出分类统计报表
     */
    exportCategoryReport(records, dateRange) {
        const workbook = this.createWorkbook()

        // 商品分类统计
        const categoryStats = {}
        records.forEach(record => {
            let category = record.category || '其他'
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    category,
                    income: 0,
                    expense: 0,
                    profit: 0,
                    count: 0
                }
            }
            if (record.type === '收入') {
                categoryStats[category].income += record.amount || 0
            } else {
                categoryStats[category].expense += record.amount || 0
            }
            categoryStats[category].profit = categoryStats[category].income - categoryStats[category].expense
            categoryStats[category].count++
        })

        const categoryData = Object.values(categoryStats).sort((a, b) => b.profit - a.profit)

        const columns = [
            { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
            { header: '商品分类', field: 'category', width: 20, summary: false },
            { header: '收入(元)', field: 'income', width: 15, format: 'currency', summary: true },
            { header: '支出(元)', field: 'expense', width: 15, format: 'currency', summary: true },
            { header: '利润(元)', field: 'profit', width: 15, format: 'currency', summary: true },
            { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true }
        ]

        this.addSheetToWorkbook(workbook, categoryData, '分类统计', columns, true)

        // 按商品统计（如果有商品名称）
        const productStats = {}
        records.forEach(record => {
            if (record.productName) {
                const key = `${record.category}-${record.productName}`
                if (!productStats[key]) {
                    productStats[key] = {
                        category: record.category,
                        productName: record.productName,
                        income: 0,
                        expense: 0,
                        profit: 0,
                        count: 0
                    }
                }
                if (record.type === '收入') {
                    productStats[key].income += record.amount || 0
                } else {
                    productStats[key].expense += record.amount || 0
                }
                productStats[key].profit = productStats[key].income - productStats[key].expense
                productStats[key].count++
            }
        })

        if (Object.keys(productStats).length > 0) {
            const productData = Object.values(productStats).sort((a, b) => b.profit - a.profit)
            const productColumns = [
                { header: '日期', field: 'date', width: 12, format: 'date', summary: false },
                { header: '商品分类', field: 'category', width: 15, summary: false },
                { header: '商品名称', field: 'productName', width: 20, summary: false },
                { header: '收入(元)', field: 'income', width: 15, format: 'currency', summary: true },
                { header: '支出(元)', field: 'expense', width: 15, format: 'currency', summary: true },
                { header: '利润(元)', field: 'profit', width: 15, format: 'currency', summary: true },
                { header: '交易笔数', field: 'count', width: 12, format: 'integer', summary: true }
            ]
            this.addSheetToWorkbook(workbook, productData, '商品明细', productColumns, true)
        }

        const fileName = `分类统计_${dateRange.start}_至_${dateRange.end}`
        this.downloadWorkbook(workbook, fileName)
    }

    /**
     * 通用报表导出（根据传入的报表类型）
     */
    exportReport(reportType, records, dateRange) {
        switch (reportType) {
            case 'income':
                this.exportIncomeReport(records, dateRange)
                break
            case 'expense':
                this.exportExpenseReport(records, dateRange)
                break
            case 'profit':
                this.exportProfitReport(records, dateRange)
                break
            case 'category':
                this.exportCategoryReport(records, dateRange)
                break
            default:
                console.error('未知的报表类型:', reportType)
        }
    }
}

export default new ReportExportService()