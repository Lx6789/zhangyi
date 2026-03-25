// services/business/report.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 报表分析业务服务
 */
class ReportService {
    /**
     * 获取生意记账记录（用于报表）
     * @param {Object} dateRange - 日期范围 { start, end }
     * @returns {Promise<Array>} 业务记录列表
     */
    async getBusinessRecords(dateRange = null) {
        // 获取所有收入记录和支出记录
        const [incomeRecords, expenseRecords] = await Promise.all([
            businessDataService.getAllIncomeRecords(),
            businessDataService.getAllExpenseRecords()
        ])

        let businessIncome = incomeRecords.filter(r => r.businessType === 'business')
        let businessExpense = expenseRecords.filter(r => r.businessType === 'business')

        // 如果有日期范围，进行筛选
        if (dateRange && dateRange.start && dateRange.end) {
            businessIncome = businessIncome.filter(r =>
                r.date >= dateRange.start && r.date <= dateRange.end
            )
            businessExpense = businessExpense.filter(r =>
                r.date >= dateRange.start && r.date <= dateRange.end
            )
        }

        // 合并并排序
        const allRecords = [...businessIncome, ...businessExpense]
        return allRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取报表数据（根据类型）
     */
    getReportData(reportType, records) {
        if (!records || records.length === 0) return []

        const businessRecords = records.filter(r => r.businessType === 'business')

        switch (reportType) {
            case 'income': return this.processIncomeReportData(businessRecords)
            case 'expense': return this.processExpenseReportData(businessRecords)
            case 'profit': return this.processProfitReportData(businessRecords)
            case 'category': return this.processCategoryReportData(businessRecords)
            default: return []
        }
    }

    /**
     * 处理收入报表数据
     */
    processIncomeReportData(records) {
        const incomeRecords = records.filter(r => r.type === '收入')
        const grouped = {}
        let total = 0

        incomeRecords.forEach(record => {
            const channel = record.channel || record.source || '其他'
            if (!grouped[channel]) grouped[channel] = { name: channel, amount: 0, count: 0 }
            grouped[channel].amount += record.amount || 0
            grouped[channel].count++
            total += record.amount || 0
        })

        return Object.values(grouped)
            .map(item => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0 }))
            .sort((a, b) => b.amount - a.amount)
    }

    /**
     * 处理支出报表数据
     */
    processExpenseReportData(records) {
        const expenseRecords = records.filter(r => r.type === '支出')
        const grouped = {}
        let total = 0

        expenseRecords.forEach(record => {
            const category = record.category || '其他'
            const subtype = record.subtype || '其他'
            const key = `${category}-${subtype}`

            if (!grouped[key]) grouped[key] = { category, subtype, amount: 0, count: 0 }
            grouped[key].amount += record.amount || 0
            grouped[key].count++
            total += record.amount || 0
        })

        return Object.values(grouped)
            .map(item => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0 }))
            .sort((a, b) => b.amount - a.amount)
    }

    /**
     * 处理利润报表数据
     */
    processProfitReportData(records) {
        const businessRecords = records.filter(r => r.businessType === 'business')
        const dailyData = {}

        businessRecords.forEach(record => {
            const date = record.date
            if (!dailyData[date]) dailyData[date] = { date, income: 0, expense: 0, profit: 0, count: 0 }

            if (record.type === '收入') dailyData[date].income += record.amount || 0
            else dailyData[date].expense += record.amount || 0

            dailyData[date].profit = dailyData[date].income - dailyData[date].expense
            dailyData[date].count++
        })

        return Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date))
    }

    /**
     * 处理分类统计报表数据
     */
    processCategoryReportData(records) {
        const businessRecords = records.filter(r => r.businessType === 'business')
        const categoryStats = {}

        businessRecords.forEach(record => {
            let category = record.category || '其他'

            if (!categoryStats[category]) categoryStats[category] = { category, income: 0, expense: 0, profit: 0, count: 0 }

            if (record.type === '收入') categoryStats[category].income += record.amount || 0
            else categoryStats[category].expense += record.amount || 0

            categoryStats[category].profit = categoryStats[category].income - categoryStats[category].expense
            categoryStats[category].count++
        })

        return Object.values(categoryStats).sort((a, b) => b.profit - a.profit)
    }

    /**
     * 计算报表汇总数据
     */
    calculateReportSummary(records) {
        const businessRecords = records.filter(r => r.businessType === 'business')
        let totalIncome = 0, totalExpense = 0, count = 0

        businessRecords.forEach(record => {
            if (record.type === '收入') totalIncome += record.amount || 0
            else totalExpense += record.amount || 0
            count++
        })

        return { totalIncome, totalExpense, totalProfit: totalIncome - totalExpense, transactionCount: count }
    }

    /**
     * 获取日期范围
     */
    getDateRange(rangeType, customRange = null) {
        const today = new Date()
        let start = '', end = baseService.formatDateYMD(today)

        switch (rangeType) {
            case 'month':
                start = baseService.formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1)); break
            case 'quarter':
                const quarterMonth = Math.floor(today.getMonth() / 3) * 3
                start = baseService.formatDateYMD(new Date(today.getFullYear(), quarterMonth, 1)); break
            case 'year':
                start = baseService.formatDateYMD(new Date(today.getFullYear(), 0, 1)); break
            case 'custom':
                if (customRange) { start = customRange.start || start; end = customRange.end || end }
                break
            default:
                start = baseService.formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1))
        }

        return { start, end }
    }

    /**
     * 获取默认日期范围
     */
    getDefaultDateRange() {
        const today = new Date()
        return { start: baseService.formatDateYMD(new Date(today.getFullYear(), today.getMonth(), 1)), end: baseService.formatDateYMD(today) }
    }

    /**
     * 准备导出数据
     */
    prepareExportData(reportType, records, dateRange) {
        return {
            reportType, dateRange,
            summary: this.calculateReportSummary(records),
            data: this.getReportData(reportType, records),
            exportTime: new Date().toISOString()
        }
    }

    /**
     * 获取报表类型列表
     */
    getReportTypes() {
        return [
            { key: 'income', label: '收入报表', icon: 'fas fa-money-bill-wave' },
            { key: 'expense', label: '支出报表', icon: 'fas fa-receipt' },
            { key: 'profit', label: '利润报表', icon: 'fas fa-chart-line' },
            { key: 'category', label: '分类统计', icon: 'fas fa-tags' }
        ]
    }

    /**
     * 获取日期范围选项
     */
    getDateRangeOptions() {
        return [
            { key: 'month', label: '本月' },
            { key: 'quarter', label: '本季度' },
            { key: 'year', label: '本年' },
            { key: 'custom', label: '自定义' }
        ]
    }

    /**
     * 获取报表表格列配置
     */
    getReportColumns(reportType) {
        const columnConfigs = {
            income: [
                { key: 'name', label: '销售渠道', width: 'auto' },
                { key: 'count', label: '交易笔数', width: 'auto' },
                { key: 'amount', label: '金额', width: 'auto', class: 'amount income' },
                { key: 'percentage', label: '占比', width: 'auto' }
            ],
            expense: [
                { key: 'category', label: '支出类型', width: 'auto' },
                { key: 'subtype', label: '具体项目', width: 'auto' },
                { key: 'count', label: '交易笔数', width: 'auto' },
                { key: 'amount', label: '金额', width: 'auto', class: 'amount expense' },
                { key: 'percentage', label: '占比', width: 'auto' }
            ],
            profit: [
                { key: 'date', label: '日期', width: 'auto' },
                { key: 'income', label: '收入', width: 'auto', class: 'amount income' },
                { key: 'expense', label: '支出', width: 'auto', class: 'amount expense' },
                { key: 'profit', label: '利润', width: 'auto', class: 'amount' },
                { key: 'count', label: '交易笔数', width: 'auto' }
            ],
            category: [
                { key: 'category', label: '商品分类', width: 'auto' },
                { key: 'income', label: '收入', width: 'auto', class: 'amount income' },
                { key: 'expense', label: '支出', width: 'auto', class: 'amount expense' },
                { key: 'profit', label: '利润', width: 'auto', class: 'amount' },
                { key: 'count', label: '交易笔数', width: 'auto' }
            ]
        }
        return columnConfigs[reportType] || []
    }

    /**
     * 格式化报表金额
     */
    formatReportAmount(amount) {
        return `¥${baseService.formatNumber(amount)}`
    }

    /**
     * 格式化报表百分比
     */
    formatReportPercentage(percentage) {
        return `${percentage.toFixed(1)}%`
    }

    /**
     * 获取报表缓存键
     */
    getReportCacheKey(reportType, dateRange) {
        return `report_${reportType}_${dateRange.start}_${dateRange.end}`
    }

    /**
     * 获取报表数据行数
     */
    getReportDataRowCount(data) {
        return data?.length || 0
    }

    /**
     * 计算表格高度
     */
    calculateTableHeight(rowCount, rowHeight = 52, headerHeight = 48, maxRows = 5) {
        if (rowCount === 0) return 200
        if (rowCount <= maxRows) return rowCount * rowHeight + headerHeight
        return maxRows * rowHeight + headerHeight + 10
    }
}

export default new ReportService()