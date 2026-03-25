// services/business/cost.service.js
import businessDataService from '@/services/cache/business-cache.service.js'
import baseService from './base.service.js'

/**
 * 成本核算业务服务
 */
class CostService {
    /**
     * 获取成本核算所需的所有数据
     */
    async getCostAnalysisData(options = {}) {
        const { startDate, endDate } = options

        const [products, incomeRecords, expenseRecords, categories] = await Promise.all([
            businessDataService.getAllProducts(),
            startDate && endDate ? this.getIncomeRecords({ startDate, endDate }) : businessDataService.getAllIncomeRecords(),
            startDate && endDate ? this.getExpenseRecords({ startDate, endDate }) : businessDataService.getAllExpenseRecords(),
            businessDataService.getAllCategories()
        ])

        const productStats = this.calculateProductStats(products, incomeRecords, expenseRecords)
        const categoryCostStats = this.calculateCategoryCostStats(expenseRecords, categories)
        const overallStats = this.calculateOverallStats(incomeRecords, expenseRecords)
        const profitTrend = this.calculateProfitTrend(incomeRecords, expenseRecords, startDate, endDate)

        return { products, incomeRecords, expenseRecords, categories, productStats, categoryCostStats, overallStats, profitTrend }
    }

    /**
     * 计算商品统计数据
     */
    calculateProductStats(products, incomeRecords, expenseRecords) {
        const statsMap = new Map()

        products.forEach(product => {
            statsMap.set(product.id, {
                id: product.id,
                name: product.name,
                category: product.category || '未分类',
                unit: product.unit || '个',
                soldQuantity: 0,
                revenue: 0,
                cost: 0,
                transactions: []
            })
        })

        incomeRecords.forEach(record => {
            if (record.productId && statsMap.has(record.productId)) {
                const stats = statsMap.get(record.productId)
                stats.soldQuantity += record.quantity || 0
                stats.revenue += record.amount || 0
                stats.transactions.push({ ...record, type: '收入', quantity: record.quantity || 0, amount: record.amount || 0 })
            }
        })

        expenseRecords.forEach(record => {
            if (record.productId && statsMap.has(record.productId)) {
                const stats = statsMap.get(record.productId)
                stats.cost += record.amount || 0
                stats.transactions.push({ ...record, type: '支出', amount: record.amount || 0 })
            }
        })

        return Array.from(statsMap.values()).map(stats => {
            const profit = stats.revenue - stats.cost
            const margin = stats.revenue > 0 ? profit / stats.revenue : 0
            const avgPrice = stats.soldQuantity > 0 ? stats.revenue / stats.soldQuantity : 0
            const avgCost = stats.soldQuantity > 0 ? stats.cost / stats.soldQuantity : 0
            const unitProfit = avgPrice - avgCost

            return { ...stats, profit, margin, avgPrice, avgCost, unitProfit }
        })
    }

    /**
     * 计算分类成本统计
     */
    calculateCategoryCostStats(expenseRecords, categories) {
        const statsMap = new Map()

        expenseRecords.forEach(record => {
            const category = record.category || '未分类'
            if (!statsMap.has(category)) statsMap.set(category, { category, cost: 0, count: 0 })
            const stats = statsMap.get(category)
            stats.cost += record.amount || 0
            stats.count++
        })

        return Array.from(statsMap.values()).sort((a, b) => b.cost - a.cost)
    }

    /**
     * 计算总体统计数据
     */
    calculateOverallStats(incomeRecords, expenseRecords) {
        const totalRevenue = incomeRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
        const totalCost = expenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
        const totalProfit = totalRevenue - totalCost
        const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0
        const totalSoldQuantity = incomeRecords.reduce((sum, r) => sum + (r.quantity || 0), 0)

        return {
            totalRevenue, totalCost, totalProfit, profitMargin, totalSoldQuantity,
            transactionCount: incomeRecords.length + expenseRecords.length
        }
    }

    /**
     * 计算毛利趋势
     */
    calculateProfitTrend(incomeRecords, expenseRecords, rangeType = 'month') {
        const now = new Date()
        const trends = []

        if (rangeType === 'week') {
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now)
                date.setDate(date.getDate() - i)
                const dateStr = baseService.formatDateYMD(date)

                const dayIncome = incomeRecords.filter(r => r.date === dateStr).reduce((sum, r) => sum + (r.amount || 0), 0)
                const dayExpense = expenseRecords.filter(r => r.date === dateStr).reduce((sum, r) => sum + (r.amount || 0), 0)

                trends.push({ period: `${date.getMonth() + 1}/${date.getDate()}`, profit: dayIncome - dayExpense, income: dayIncome, expense: dayExpense })
            }
        } else if (rangeType === 'month') {
            const weekIncomes = [0, 0, 0, 0], weekExpenses = [0, 0, 0, 0]

            incomeRecords.forEach(r => {
                const daysAgo = Math.floor((now - new Date(r.date)) / (1000 * 60 * 60 * 24))
                const weekIndex = this.getWeekIndex(daysAgo)
                if (weekIndex >= 0 && weekIndex < 4) weekIncomes[weekIndex] += r.amount || 0
            })

            expenseRecords.forEach(r => {
                const daysAgo = Math.floor((now - new Date(r.date)) / (1000 * 60 * 60 * 24))
                const weekIndex = this.getWeekIndex(daysAgo)
                if (weekIndex >= 0 && weekIndex < 4) weekExpenses[weekIndex] += r.amount || 0
            })

            for (let i = 0; i < 4; i++) {
                trends.push({ period: `第${i + 1}周`, profit: weekIncomes[i] - weekExpenses[i], income: weekIncomes[i], expense: weekExpenses[i] })
            }
        } else if (rangeType === 'quarter') {
            const quarterIncomes = [0, 0, 0], quarterExpenses = [0, 0, 0]
            const currentMonth = now.getMonth()
            const currentQuarter = Math.floor(currentMonth / 3)

            for (let i = 0; i < 3; i++) {
                const quarterIndex = currentQuarter - i
                if (quarterIndex >= 0) {
                    const startMonth = quarterIndex * 3 + 1
                    const endMonth = (quarterIndex + 1) * 3

                    incomeRecords.forEach(r => {
                        const recordDate = new Date(r.date)
                        if (recordDate.getFullYear() === now.getFullYear() && recordDate.getMonth() >= startMonth - 1 && recordDate.getMonth() < endMonth) {
                            quarterIncomes[i] += r.amount || 0
                        }
                    })

                    expenseRecords.forEach(r => {
                        const recordDate = new Date(r.date)
                        if (recordDate.getFullYear() === now.getFullYear() && recordDate.getMonth() >= startMonth - 1 && recordDate.getMonth() < endMonth) {
                            quarterExpenses[i] += r.amount || 0
                        }
                    })
                }
            }

            for (let i = 2; i >= 0; i--) {
                trends.push({ period: `Q${currentQuarter - i + 1}`, profit: quarterIncomes[i] - quarterExpenses[i], income: quarterIncomes[i], expense: quarterExpenses[i] })
            }
        } else if (rangeType === 'year') {
            const monthData = new Array(12).fill().map(() => ({ income: 0, expense: 0 }))

            incomeRecords.forEach(r => {
                const month = parseInt(r.date.substring(5, 7)) - 1
                if (month >= 0 && month < 12) monthData[month].income += r.amount || 0
            })

            expenseRecords.forEach(r => {
                const month = parseInt(r.date.substring(5, 7)) - 1
                if (month >= 0 && month < 12) monthData[month].expense += r.amount || 0
            })

            for (let i = 0; i < 12; i++) {
                if (monthData[i].income > 0 || monthData[i].expense > 0) {
                    trends.push({ period: `${i + 1}月`, profit: monthData[i].income - monthData[i].expense, income: monthData[i].income, expense: monthData[i].expense })
                }
            }
        }

        return trends
    }

    /**
     * 获取周索引
     */
    getWeekIndex(daysAgo) {
        if (daysAgo < 7) return 0
        if (daysAgo < 14) return 1
        if (daysAgo < 21) return 2
        if (daysAgo < 30) return 3
        return -1
    }

    /**
     * 获取高毛利商品 Top N
     */
    getTopProfitProducts(productStats, limit = 5) {
        return [...productStats].filter(p => p.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, limit)
    }

    /**
     * 获取亏损商品列表
     */
    getLossProducts(productStats) {
        return productStats.filter(p => p.profit < 0)
    }

    /**
     * 计算盈亏平衡点
     */
    calculateBreakEven(fixedCost, productStats) {
        let totalRevenue = 0, totalProfit = 0

        productStats.forEach(p => {
            totalRevenue += p.revenue
            totalProfit += p.profit
        })

        const averageMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0
        const breakEvenRevenue = averageMargin > 0 ? fixedCost / averageMargin : Infinity

        return { fixedCost, averageMargin, breakEvenRevenue, isAchieved: totalRevenue >= breakEvenRevenue, gap: Math.abs(totalRevenue - breakEvenRevenue) }
    }

    /**
     * 生成经营建议
     */
    generateBusinessAdvice(analysisData) {
        const advice = []
        const { productStats, overallStats, breakEvenData, lossProducts } = analysisData

        if (lossProducts.length > 0) {
            advice.push({ type: 'warning', message: `有 ${lossProducts.length} 种商品处于亏损状态，建议调整定价策略或优化采购成本` })
        }

        const profitMargin = overallStats.profitMargin
        if (profitMargin < 0.1) {
            advice.push({ type: 'danger', message: '毛利率过低（低于10%），建议优化成本结构或提高售价' })
        } else if (profitMargin < 0.2) {
            advice.push({ type: 'warning', message: '毛利率偏低，可考虑寻找更优的供应商或提升产品附加值' })
        } else if (profitMargin > 0.5) {
            advice.push({ type: 'success', message: '毛利率良好，可考虑扩大销售规模' })
        }

        if (breakEvenData && !breakEvenData.isAchieved) {
            advice.push({ type: 'warning', message: `距离盈亏平衡还差 ¥${baseService.formatNumber(breakEvenData.gap)}，需提升销售额或控制固定成本` })
        } else if (breakEvenData && breakEvenData.isAchieved) {
            advice.push({ type: 'success', message: '已达成盈亏平衡，继续保持！' })
        }

        const topProducts = this.getTopProfitProducts(productStats, 1)
        if (topProducts.length > 0) {
            advice.push({ type: 'success', message: `高毛利商品 "${topProducts[0].name}" 表现优异，可重点推广` })
        }

        if (overallStats.totalSoldQuantity > 0) {
            advice.push({ type: 'info', message: `本月销售 ${overallStats.totalSoldQuantity} 件商品，建议关注库存周转情况` })
        }

        return advice
    }

    /**
     * 获取商品交易明细
     */
    getProductTransactions(productId, incomeRecords, expenseRecords) {
        return [
            ...incomeRecords.filter(r => r.productId === productId).map(r => ({ ...r, type: '收入' })),
            ...expenseRecords.filter(r => r.productId === productId).map(r => ({ ...r, type: '支出' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    /**
     * 获取分类成本分布
     */
    getCategoryCostDistribution(expenseRecords) {
        const distribution = {}
        expenseRecords.forEach(record => {
            const category = record.category || '未分类'
            distribution[category] = (distribution[category] || 0) + (record.amount || 0)
        })
        return Object.entries(distribution).map(([category, cost]) => ({ category, cost })).sort((a, b) => b.cost - a.cost)
    }

    /**
     * 获取最近交易记录
     */
    getRecentTransactions(incomeRecords, expenseRecords, limit = 10, products = []) {
        const productMap = new Map(products.map(p => [p.id, p]))

        return [
            ...incomeRecords.map(r => ({ ...r, type: '收入', productName: productMap.get(r.productId)?.name || '-' })),
            ...expenseRecords.map(r => ({ ...r, type: '支出', productName: productMap.get(r.productId)?.name || '-' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit)
    }

    /**
     * 获取时间范围文本
     */
    getDateRangeText(rangeType = 'month') {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1

        switch (rangeType) {
            case 'week':
                const start = new Date(now)
                start.setDate(now.getDate() - 6)
                return `${start.getMonth() + 1}/${start.getDate()} - ${month}/${now.getDate()}`
            case 'month': return `${year}年${month}月`
            case 'quarter':
                const quarter = Math.floor((month - 1) / 3) + 1
                return `${year}年第${quarter}季度`
            case 'year': return `${year}年`
            default: return `${year}年${month}月`
        }
    }

    /**
     * 获取商业月度统计数据
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @returns {Promise<Object>} 月度统计数据
     */
    async getBusinessMonthlyStats(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        // 获取所有收入记录和支出记录
        const [incomeRecords, expenseRecords] = await Promise.all([
            businessDataService.getAllIncomeRecords(),
            businessDataService.getAllExpenseRecords()
        ])

        // 筛选出 business 类型的记录
        let businessIncome = incomeRecords.filter(r => r.businessType === 'business')
        let businessExpense = expenseRecords.filter(r => r.businessType === 'business')

        // 按日期范围筛选
        businessIncome = businessIncome.filter(r => r.date >= startDate && r.date <= endDate)
        businessExpense = businessExpense.filter(r => r.date >= startDate && r.date <= endDate)

        // 计算统计数据
        let income = 0
        let expense = 0
        let pendingReceivables = 0

        businessIncome.forEach(record => {
            income += record.amount || 0
            // 统计待收账款（赊账且未支付的收入）
            if (record.paymentMethod === '赊账' && !record.isPaid) {
                pendingReceivables += record.amount || 0
            }
        })

        businessExpense.forEach(record => {
            expense += record.amount || 0
        })

        return {
            income,
            expense,
            profit: income - expense,
            pendingReceivables,
            transactionCount: businessIncome.length + businessExpense.length
        }
    }
}

export default new CostService()