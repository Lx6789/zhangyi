/**
 * 日期辅助服务
 * 提供日期计算、格式化、比较等功能
 */
class DateHelperService {
    constructor() {
        // 星期标签
        this.weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        // 月份标签
        this.monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        // 周标签（用于按月分周）
        this.monthWeekLabels = ['第1周', '第2周', '第3周', '第4周']
    }

    /**
     * 获取当前日期字符串 YYYY-MM-DD
     */
    getTodayString() {
        return new Date().toISOString().split('T')[0]
    }

    /**
     * 格式化日期为 YYYY-MM-DD
     */
    formatDate(date) {
        if (typeof date === 'string') return date
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    /**
     * 添加天数到指定日期
     * @param {string} dateStr - 起始日期 YYYY-MM-DD
     * @param {number} days - 要添加的天数（可以为负数）
     * @returns {string} 计算后的日期 YYYY-MM-DD
     */
    addDays(dateStr, days) {
        const date = new Date(dateStr)
        date.setDate(date.getDate() + days)
        return this.formatDate(date)
    }

    /**
     * 格式化日期为 MM-DD 显示格式
     */
    formatDateShort(dateStr) {
        const date = new Date(dateStr)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        return `${month}-${day}`
    }

    /**
     * 格式化日期为 X月X日 显示格式
     */
    formatDateChinese(date) {
        const d = new Date(date)
        return `${d.getMonth() + 1}月${d.getDate()}日`
    }

    // ==================== 本周相关 ====================

    /**
     * 获取本周的日期范围（周一 到 周日）
     * @param {Date|string} baseDate - 基准日期，默认为当前日期
     * @returns {Object} 包含周一和周日日期对象和字符串
     */
    getWeekRange(baseDate = new Date()) {
        const date = new Date(baseDate)

        // 获取当前是周几 (0-6, 0是周日)
        let currentDay = date.getDay()

        // 将周日(0)转换为7，周一(1)保持为1
        if (currentDay === 0) {
            currentDay = 7 // 周日是第7天
        }

        // 计算本周一
        const monday = new Date(date)
        monday.setDate(date.getDate() - (currentDay - 1))
        monday.setHours(0, 0, 0, 0)

        // 计算本周日
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)

        const mondayStr = this.formatDate(monday)
        const sundayStr = this.formatDate(sunday)

        return {
            monday,
            sunday,
            mondayStr,
            sundayStr,
            start: monday,
            end: sunday,
            startDate: mondayStr,
            endDate: sundayStr
        }
    }

    /**
     * 获取本周范围文本（如：2月16日 - 2月22日）
     */
    getWeekRangeText(baseDate = new Date()) {
        const { monday, sunday } = this.getWeekRange(baseDate)
        const startStr = this.formatDateChinese(monday)
        const endStr = this.formatDateChinese(sunday)
        return `${startStr} - ${endStr}`
    }

    /**
     * 获取本周的日期数组（按天）
     * @returns {Array} 包含日期字符串和星期标签的对象数组
     */
    getWeekDays(baseDate = new Date()) {
        const { monday } = this.getWeekRange(baseDate)
        const days = []

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday)
            currentDay.setDate(monday.getDate() + i)
            days.push({
                date: this.formatDate(currentDay),
                label: this.weekLabels[i],
                dayOfWeek: i + 1 // 1=周一, 7=周日
            })
        }

        return days
    }

    // ==================== 月份相关 ====================

    /**
     * 获取指定年份和月份的日期范围
     */
    getMonthRange(year, month) {
        const firstDay = new Date(year, month - 1, 1)
        firstDay.setHours(0, 0, 0, 0)

        const lastDay = new Date(year, month, 0)
        lastDay.setHours(23, 59, 59, 999)

        return {
            firstDay,
            lastDay,
            firstDayStr: this.formatDate(firstDay),
            lastDayStr: this.formatDate(lastDay),
            totalDays: lastDay.getDate(),
            year,
            month
        }
    }

    /**
     * 获取某个月份按周分组的数据（固定4周）
     */
    getMonthWeeks(year, month) {
        const { totalDays } = this.getMonthRange(year, month)
        const weeks = []

        for (let i = 0; i < 4; i++) {
            const weekStart = i * 7 + 1
            const weekEnd = Math.min((i + 1) * 7, totalDays)
            weeks.push({
                start: weekStart,
                end: weekEnd,
                label: this.monthWeekLabels[i],
                weekIndex: i
            })
        }

        return weeks
    }

    /**
     * 根据日期判断是当月的第几周
     */
    getWeekOfMonth(dateStr) {
        const date = new Date(dateStr)
        const day = date.getDate()
        return Math.floor((day - 1) / 7)
    }

    // ==================== 季度相关 ====================

    /**
     * 获取当前季度
     */
    getCurrentQuarter(date = new Date()) {
        return Math.floor(date.getMonth() / 3)
    }

    /**
     * 获取指定年份和季度的月份范围
     */
    getQuarterMonths(year, quarter) {
        const startMonth = quarter * 3 + 1
        const endMonth = quarter * 3 + 3
        return {
            startMonth,
            endMonth,
            months: [startMonth, startMonth + 1, endMonth]
        }
    }

    /**
     * 获取指定年份和季度的日期范围
     */
    getQuarterRange(year, quarter) {
        const startMonth = quarter * 3 + 1
        const endMonth = quarter * 3 + 3

        const startDate = new Date(year, startMonth - 1, 1)
        startDate.setHours(0, 0, 0, 0)

        const endDate = new Date(year, endMonth, 0)
        endDate.setHours(23, 59, 59, 999)

        return {
            start: startDate,
            end: endDate,
            startStr: this.formatDate(startDate),
            endStr: this.formatDate(endDate),
            startMonth,
            endMonth
        }
    }

    // ==================== 年份相关 ====================

    /**
     * 获取指定年份的日期范围
     */
    getYearRange(year) {
        const startDate = new Date(year, 0, 1)
        startDate.setHours(0, 0, 0, 0)

        const endDate = new Date(year, 11, 31)
        endDate.setHours(23, 59, 59, 999)

        return {
            start: startDate,
            end: endDate,
            startStr: this.formatDate(startDate),
            endStr: this.formatDate(endDate),
            year
        }
    }

    // ==================== 日期比较 ====================

    /**
     * 检查日期是否在指定范围内
     */
    isDateInRange(dateStr, startDateStr, endDateStr) {
        return dateStr >= startDateStr && dateStr <= endDateStr
    }

    /**
     * 检查日期是否属于指定月份
     */
    isDateInMonth(dateStr, year, month) {
        const [y, m] = dateStr.split('-')
        return parseInt(y) === year && parseInt(m) === month
    }

    /**
     * 检查日期是否属于指定年份
     */
    isDateInYear(dateStr, year) {
        const [y] = dateStr.split('-')
        return parseInt(y) === year
    }

    /**
     * 检查日期是否属于本周
     */
    isDateInWeek(dateStr, baseDate = new Date()) {
        const { startDate, endDate } = this.getWeekRange(baseDate)
        return this.isDateInRange(dateStr, startDate, endDate)
    }

    /**
     * 检查日期是否属于本季度
     */
    isDateInQuarter(dateStr, year, quarter) {
        const { startStr, endStr } = this.getQuarterRange(year, quarter)
        return this.isDateInRange(dateStr, startStr, endStr)
    }

    // ==================== 日期过滤 ====================

    /**
     * 根据筛选条件过滤记录
     * @param {Array} records - 记录数组
     * @param {Object} filter - 筛选条件
     * @returns {Array} 过滤后的记录
     */
    filterRecordsByDate(records, filter) {
        const { type, year, month, date, quarter } = filter

        switch (type) {
            case 'week':
                const { startDate, endDate } = this.getWeekRange()
                return records.filter(r => this.isDateInRange(r.date, startDate, endDate))

            case 'month':
                return records.filter(r => this.isDateInMonth(r.date, year, month))

            case 'year':
                return records.filter(r => this.isDateInYear(r.date, year))

            case 'quarter':
                return records.filter(r => this.isDateInQuarter(r.date, year, quarter))

            case 'date':
                return records.filter(r => r.date === date)

            case 'range':
                const { start, end } = filter
                return records.filter(r => this.isDateInRange(r.date, start, end))

            default:
                return records
        }
    }

    /**
     * 按日期分组汇总数据
     * @param {Array} records - 记录数组
     * @param {string} groupBy - 分组方式：'day', 'week', 'month', 'quarter', 'year'
     * @returns {Object} 分组后的数据
     */
    groupRecordsByDate(records, groupBy = 'day') {
        const grouped = {}

        records.forEach(record => {
            let key
            switch (groupBy) {
                case 'day':
                    key = record.date
                    break
                case 'week':
                    const weekIndex = this.getWeekOfMonth(record.date)
                    key = `第${weekIndex + 1}周`
                    break
                case 'month':
                    const [year, month] = record.date.split('-')
                    key = `${year}-${month}`
                    break
                case 'quarter':
                    const date = new Date(record.date)
                    const q = Math.floor(date.getMonth() / 3) + 1
                    key = `${date.getFullYear()}年Q${q}`
                    break
                case 'year':
                    key = record.date.split('-')[0]
                    break
            }

            if (!grouped[key]) {
                grouped[key] = {
                    key,
                    records: [],
                    totalIncome: 0,
                    totalExpense: 0
                }
            }

            grouped[key].records.push(record)
            const amount = parseFloat(record.amount)
            if (record.type === '收入') {
                grouped[key].totalIncome += amount
            } else {
                grouped[key].totalExpense += amount
            }
        })

        return grouped
    }

    /**
     * 计算指定日期范围内的统计汇总
     */
    calculateStats(records) {
        let totalIncome = 0
        let totalExpense = 0

        records.forEach(record => {
            const amount = parseFloat(record.amount)
            if (record.type === '收入') {
                totalIncome += amount
            } else {
                totalExpense += amount
            }
        })

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            count: records.length
        }
    }

    // ==================== 图表数据处理 ====================

    /**
     * 为柱状图准备数据
     * @param {Array} dailyData - 每日数据数组
     * @returns {Array} 包含高度百分比的数据
     */
    prepareBarChartData(dailyData) {
        // 找出最大值
        let maxAmount = 0
        dailyData.forEach(day => {
            maxAmount = Math.max(maxAmount, day.income, day.expense)
        })

        // 计算高度百分比
        return dailyData.map(day => ({
            ...day,
            incomeHeight: maxAmount > 0 ? (day.income / maxAmount * 100) : 0,
            expenseHeight: maxAmount > 0 ? (day.expense / maxAmount * 100) : 0
        }))
    }

    /**
     * 获取最近N天的日期范围
     */
    getLastDaysRange(days) {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - days + 1)

        return {
            start: this.formatDate(start),
            end: this.formatDate(end),
            startDate: start,
            endDate: end
        }
    }
}

export default new DateHelperService()