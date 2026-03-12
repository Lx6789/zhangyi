<template>
  <div class="chart">
    <!-- 时间筛选 -->
    <div class="time-filter">
      <button
          v-for="range in timeRanges"
          :key="range.value"
          class="time-btn"
          :class="{ active: selectedTimeRange === range.value }"
          @click="selectTimeRange(range.value)"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- 主要图表区域 - 柱状图 -->
    <section class="chart-section">
      <div class="section-title">
        <h2>{{ currentChartTitle }}</h2>
        <i class="fas fa-chart-line"></i>
      </div>

      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>

      <div v-else-if="chartData.length === 0" class="empty-chart">
        <i class="fas fa-chart-bar"></i>
        <p>当前时间段暂无数据</p>
      </div>
      <div v-else-if="chartData.every(item => item.income === 0 && item.expense === 0)" class="empty-chart">
        <i class="fas fa-chart-bar"></i>
        <p>当前时间段暂无收支数据</p>
      </div>
      <div v-else class="main-chart">
        <div v-for="(item, index) in chartData" :key="index" class="chart-bar">
          <div class="bar-container">
            <div
                class="bar-income"
                :style="{ height: item.incomeHeight + '%' }"
                :data-value="'¥' + formatNumber(item.income)"
                @mouseenter="showTooltip($event, '收入: ¥' + formatNumber(item.income))"
                @mouseleave="hideTooltip"
            ></div>
            <div
                class="bar-expense"
                :style="{ height: item.expenseHeight + '%' }"
                :data-value="'¥' + formatNumber(item.expense)"
                @mouseenter="showTooltip($event, '支出: ¥' + formatNumber(item.expense))"
                @mouseleave="hideTooltip"
            ></div>
          </div>
          <div class="bar-label">{{ item.label }}</div>
        </div>
      </div>

      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color income-color"></div>
          <span class="legend-text">收入</span>
        </div>
        <div class="legend-item">
          <div class="legend-color expense-color"></div>
          <span class="legend-text">支出</span>
        </div>
      </div>
    </section>

    <!-- 收入支出占比分析 - 饼状图 -->
    <section class="chart-section pie-section">
      <div class="section-title">
        <h2>{{ currentPieTitle }}</h2>
        <i class="fas fa-chart-pie"></i>
      </div>

      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>

      <div v-else-if="pieData.length === 0" class="empty-chart">
        <i class="fas fa-chart-pie"></i>
        <p>当前时间段暂无数据</p>
      </div>
      <div v-else>
        <div class="pie-chart-container">
          <!-- 饼状图 SVG -->
          <svg viewBox="0 0 400 300" class="pie-chart">
            <!-- 绘制饼图切片 -->
            <g v-for="(slice, index) in pieData" :key="index">
              <path
                  :d="slice.path"
                  :fill="slice.color"
                  @mouseenter="showTooltip($event, slice.label + ': ¥' + formatNumber(slice.value) + ' (' + slice.percentage + '%)')"
                  @mouseleave="hideTooltip"
                  class="pie-slice"
                  :class="{ 'pie-slice-highlight': highlightedSlice === index }"
              ></path>
            </g>

            <!-- 绘制引线和百分比标签 -->
            <g v-for="(slice, index) in pieData" :key="'label-' + index">
              <!-- 计算标签位置 -->
              <template v-if="slice.percentage > 0">
                <!-- 引线 -->
                <line
                    :x1="slice.lineStart.x"
                    :y1="slice.lineStart.y"
                    :x2="slice.lineEnd.x"
                    :y2="slice.lineEnd.y"
                    stroke="#999"
                    stroke-width="1"
                    stroke-dasharray="none"
                />
                <!-- 水平短线 -->
                <line
                    :x1="slice.lineEnd.x"
                    :y1="slice.lineEnd.y"
                    :x2="slice.labelPosition.x"
                    :y2="slice.labelPosition.y"
                    stroke="#999"
                    stroke-width="1"
                />
                <!-- 百分比标签背景 -->
                <rect
                    :x="slice.labelPosition.x - 35"
                    :y="slice.labelPosition.y - 12"
                    width="70"
                    height="24"
                    rx="12"
                    ry="12"
                    fill="white"
                    stroke="#ddd"
                    stroke-width="1"
                />
                <!-- 百分比文本 -->
                <text
                    :x="slice.labelPosition.x"
                    :y="slice.labelPosition.y + 4"
                    text-anchor="middle"
                    font-size="12"
                    font-weight="bold"
                    :fill="slice.color"
                >
                  {{ slice.percentage }}%
                </text>
              </template>
            </g>
          </svg>
        </div>

        <!-- 饼图图例 -->
        <div class="pie-legend">
          <div v-for="(item, index) in pieData" :key="index" class="pie-legend-item" @mouseenter="highlightedSlice = index" @mouseleave="highlightedSlice = null">
            <div class="pie-legend-color" :style="{ backgroundColor: item.color }"></div>
            <div class="pie-legend-text">
              <span>{{ item.label }}</span>
              <span class="pie-legend-percentage">{{ item.percentage }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 分类图表 - 按时间段分类 -->
    <section class="chart-section category-chart">
      <div class="section-title">
        <h2>{{ currentCategoryTitle }}</h2>
        <i class="fas fa-list-alt"></i>
      </div>

      <!-- 分类类型切换 -->
      <div class="category-tabs">
        <button
            v-for="tab in categoryTabs"
            :key="tab.value"
            class="category-tab"
            :class="{ active: selectedCategoryTab === tab.value }"
            @click="selectedCategoryTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>

      <!-- 分类列表 -->
      <div v-else-if="categoryList.length === 0" class="empty-category">
        <i class="fas fa-chart-pie"></i>
        <p>当前时间段暂无{{ selectedCategoryTab === 'expense' ? '支出' : '收入' }}数据</p>
      </div>

      <div v-else class="category-list">
        <div
            v-for="category in categoryList"
            :key="category.id"
            class="category-item"
            @click="viewCategoryDetail(category)"
        >
          <div class="category-info">
            <div class="category-icon" :style="{ backgroundColor: category.color }">
              <i :class="category.icon"></i>
            </div>
            <div class="category-text">
              <h3>{{ category.name }}</h3>
              <p>占比 {{ category.percentage }}%</p>
            </div>
          </div>
          <div class="category-amount" :class="selectedCategoryTab === 'expense' ? 'expense-amount' : 'income-amount'">
            ¥ {{ formatNumber(category.amount) }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {authHelperService, notificationService} from '@/services/index.js'
import userDataService from '@/services/user-data.service.js'
import businessDataService from '@/services/business-data.service.js'
import dateHelper from '@/services/utils/date-helper.service.js'

const router = useRouter()

// 加载状态
const loading = ref(false)

// 时间范围选项
const timeRanges = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
  { value: 'year', label: '本年' }
]
const selectedTimeRange = ref('month')

// 图表数据
const chartData = ref([])

// 分类数据
const expenseCategories = ref([])
const incomeCategories = ref([])
const selectedCategoryTab = ref('expense')

// 分类选项卡
const categoryTabs = [
  { value: 'expense', label: '支出分类' },
  { value: 'income', label: '收入分类' }
]

// 饼图数据
const pieData = ref([])
const highlightedSlice = ref(null)

// 使用日期服务的标签
const weekLabels = dateHelper.weekLabels
const monthLabels = dateHelper.monthLabels
const monthWeekLabels = dateHelper.monthWeekLabels

// 图表标题
const currentChartTitle = computed(() => {
  const range = timeRanges.find(r => r.value === selectedTimeRange.value)
  return range ? `${range.label}收支趋势` : '收支趋势'
})

const currentPieTitle = computed(() => {
  const range = timeRanges.find(r => r.value === selectedTimeRange.value)
  return range ? `${range.label}收支占比` : '收支占比'
})

const currentCategoryTitle = computed(() => {
  const range = timeRanges.find(r => r.value === selectedTimeRange.value)
  return range ? `${range.label}${selectedCategoryTab.value === 'expense' ? '支出' : '收入'}分类统计` : `${selectedCategoryTab.value === 'expense' ? '支出' : '收入'}分类统计`
})

// 当前显示的分类列表
const categoryList = computed(() => {
  return selectedCategoryTab.value === 'expense' ? expenseCategories.value : incomeCategories.value
})

// 工具提示
let tooltip = null

// 分类图标和颜色映射
const categoryStyleMap = {
  // 支出分类
  '农资投入': { icon: 'fas fa-seedling', color: '#FF9F43' },
  '人工费用': { icon: 'fas fa-users', color: '#36BD78' },
  '机械/工具': { icon: 'fas fa-tools', color: '#3498DB' },
  '土地相关': { icon: 'fas fa-mountain', color: '#9B59B6' },
  '包装与物流': { icon: 'fas fa-box', color: '#E74C3C' },
  '其他经营费用': { icon: 'fas fa-coins', color: '#95A5A6' },
  '餐饮食品': { icon: 'fas fa-utensils', color: '#FF9F43' },
  '购物消费': { icon: 'fas fa-shopping-cart', color: '#36BD78' },
  '交通出行': { icon: 'fas fa-bus', color: '#3498DB' },
  '娱乐休闲': { icon: 'fas fa-film', color: '#9B59B6' },
  '医疗健康': { icon: 'fas fa-heartbeat', color: '#E74C3C' },
  '生活支出': { icon: 'fas fa-home', color: '#FF9F43' },
  '住房支出': { icon: 'fas fa-building', color: '#3498DB' },
  '其他支出': { icon: 'fas fa-ellipsis-h', color: '#95A5A6' },

  // 收入分类
  '工资': { icon: 'fas fa-money-bill-wave', color: '#2ecc71' },
  '兼职': { icon: 'fas fa-briefcase', color: '#3498db' },
  '投资': { icon: 'fas fa-chart-line', color: '#9b59b6' },
  '奖金': { icon: 'fas fa-trophy', color: '#f1c40f' },
  '其他收入': { icon: 'fas fa-gift', color: '#e67e22' },
  '农产品销售': { icon: 'fas fa-apple-alt', color: '#27ae60' },
  '政府补贴': { icon: 'fas fa-hand-holding-usd', color: '#2980b9' },
  '租金收入': { icon: 'fas fa-home', color: '#8e44ad' }
}

// ==================== 数据获取函数 ====================

/**
 * 从IndexedDB获取所有记账记录
 */
const getAllRecords = async () => {
  try {
    const records = await businessDataService.getAllBusinessRecords()
    return records
  } catch (error) {
    console.error('获取记录失败:', error)
    return []
  }
}

/**
 * 获取指定年份和月份的记录
 */
const getRecordsByMonth = async (year, month) => {
  const records = await getAllRecords()
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`
  return records.filter(record => record.date && record.date.startsWith(monthStr))
}

/**
 * 获取指定日期范围的记录
 */
const getRecordsByDateRange = async (startDate, endDate) => {
  const records = await getAllRecords()

  console.log('查询范围:', startDate, '到', endDate)
  console.log('所有记录:', records)

  // 直接比较日期字符串
  return records.filter(record => {
    return record.date >= startDate && record.date <= endDate
  })
}

/**
 * 获取某个月份按周分组的数据（固定4周）
 */
const getMonthWeekData = async (year, month) => {
  const records = await getRecordsByMonth(year, month)

  // 获取该月的日期范围
  const monthRange = dateHelper.getMonthRange(year, month)
  const totalDays = monthRange.totalDays

  // 获取该月的周分组
  const weeks = dateHelper.getMonthWeeks(year, month)

  // 初始化每周的数据
  const weeklyData = weeks.map(week => ({
    label: week.label,
    income: 0,
    expense: 0
  }))

  // 统计每周的数据
  records.forEach(record => {
    const day = parseInt(record.date.split('-')[2])
    const weekIndex = dateHelper.getWeekOfMonth(record.date)
    if (weekIndex >= 0 && weekIndex < 4) {
      const amount = parseFloat(record.amount)
      if (record.type === '收入') {
        weeklyData[weekIndex].income += amount
      } else {
        weeklyData[weekIndex].expense += amount
      }
    }
  })

  // 使用日期服务准备柱状图数据
  return dateHelper.prepareBarChartData(weeklyData)
}

/**
 * 获取本周的数据（按天统计）
 */
const getWeekData = async () => {
  const { mondayStr, sundayStr } = dateHelper.getWeekRange()
  console.log('本周范围:', mondayStr, '到', sundayStr)

  const records = await getRecordsByDateRange(mondayStr, sundayStr)
  console.log('本周记录:', records)

  // 获取本周的日期数组
  const weekDays = dateHelper.getWeekDays()

  const dailyData = weekDays.map(day => ({
    date: day.date,
    label: day.label,
    income: 0,
    expense: 0
  }))

  // 统计每天的数据
  records.forEach(record => {
    const dayIndex = dailyData.findIndex(d => d.date === record.date)
    if (dayIndex !== -1) {
      const amount = parseFloat(record.amount)
      if (record.type === '收入') {
        dailyData[dayIndex].income += amount
      } else {
        dailyData[dayIndex].expense += amount
      }
    }
  })

  console.log('每日数据汇总:', dailyData)

  // 使用日期服务准备柱状图数据
  return dateHelper.prepareBarChartData(dailyData)
}

/**
 * 获取本月的数据（按4周统计）
 */
const getMonthData = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return getMonthWeekData(year, month)
}

/**
 * 获取本季度的数据（按月统计）
 */
const getQuarterData = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const quarter = dateHelper.getCurrentQuarter()
  const { startMonth, endMonth } = dateHelper.getQuarterMonths(year, quarter)

  const monthlyData = []
  const monthlyTotals = []

  for (let i = startMonth; i <= endMonth; i++) {
    const records = await getRecordsByMonth(year, i)

    let incomeTotal = 0
    let expenseTotal = 0

    records.forEach(record => {
      const amount = parseFloat(record.amount)
      if (record.type === '收入') {
        incomeTotal += amount
      } else {
        expenseTotal += amount
      }
    })

    monthlyTotals.push({ income: incomeTotal, expense: expenseTotal })
  }

  // 找出最大值用于计算高度
  let maxAmount = 0
  monthlyTotals.forEach(month => {
    maxAmount = Math.max(maxAmount, month.income, month.expense)
  })

  // 构建季度数据
  for (let i = 0; i < 3; i++) {
    const income = monthlyTotals[i].income
    const expense = monthlyTotals[i].expense
    const monthIndex = startMonth + i

    monthlyData.push({
      label: `${monthIndex}月`,
      income: income,
      expense: expense,
      incomeHeight: maxAmount > 0 ? (income / maxAmount * 100) : 0,
      expenseHeight: maxAmount > 0 ? (expense / maxAmount * 100) : 0
    })
  }

  return monthlyData
}

/**
 * 获取本年的数据（固定12个月）
 */
const getYearData = async () => {
  const year = new Date().getFullYear()
  const monthlyData = []
  let maxAmount = 0
  const monthlyTotals = []

  // 统计每个月的数据
  for (let i = 0; i < 12; i++) {
    const records = await getRecordsByMonth(year, i + 1)

    let incomeTotal = 0
    let expenseTotal = 0

    records.forEach(record => {
      const amount = parseFloat(record.amount)
      if (record.type === '收入') {
        incomeTotal += amount
      } else {
        expenseTotal += amount
      }
    })

    monthlyTotals.push({ income: incomeTotal, expense: expenseTotal })
    maxAmount = Math.max(maxAmount, incomeTotal, expenseTotal)
  }

  // 计算高度百分比
  for (let i = 0; i < 12; i++) {
    const income = monthlyTotals[i].income
    const expense = monthlyTotals[i].expense

    monthlyData.push({
      label: monthLabels[i],
      income: income,
      expense: expense,
      incomeHeight: maxAmount > 0 ? (income / maxAmount * 100) : 0,
      expenseHeight: maxAmount > 0 ? (expense / maxAmount * 100) : 0
    })
  }

  return monthlyData
}

/**
 * 获取指定时间段的记录
 */
const getRecordsByTimeRange = async () => {
  let records = []
  const now = new Date()

  switch(selectedTimeRange.value) {
    case 'week':
      const { mondayStr, sundayStr } = dateHelper.getWeekRange()
      console.log('本周范围(用于分类统计):', mondayStr, '到', sundayStr)
      records = await getRecordsByDateRange(mondayStr, sundayStr)
      break

    case 'month':
      records = await getRecordsByMonth(now.getFullYear(), now.getMonth() + 1)
      break

    case 'quarter':
      const quarter = dateHelper.getCurrentQuarter()
      const { startStr, endStr } = dateHelper.getQuarterRange(now.getFullYear(), quarter)
      records = await getRecordsByDateRange(startStr, endStr)
      break

    case 'year':
      const yearRecords = []
      for (let i = 0; i < 12; i++) {
        const monthRecords = await getRecordsByMonth(now.getFullYear(), i + 1)
        yearRecords.push(...monthRecords)
      }
      records = yearRecords
      break
  }

  console.log(`[${selectedTimeRange.value}] 获取到记录:`, records.length)
  return records
}

/**
 * 计算饼图数据（收入支出占比）
 */
const calculatePieData = async () => {
  const records = await getRecordsByTimeRange()

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

  const total = totalIncome + totalExpense

  if (total === 0) {
    pieData.value = []
    return
  }

  // 生成饼图路径
  let startAngle = 0
  const incomeAngle = totalIncome > 0 ? (totalIncome / total) * 360 : 0
  const expenseAngle = totalExpense > 0 ? (totalExpense / total) * 360 : 0

  const pieSlices = []

  // 处理只有收入的情况
  if (totalIncome > 0 && totalExpense === 0) {
    const slice = {
      label: '收入',
      value: totalIncome,
      percentage: 100,
      color: '#D5EBE1',
      path: describeArc(200, 150, 100, 0, 360), // 完整的圆
      midAngle: 180
    }

    // 计算引线和标签位置（放在右侧）
    const labelData = calculateLabelPosition(200, 150, 100, 180, 100)
    slice.lineStart = labelData.lineStart
    slice.lineEnd = labelData.lineEnd
    slice.labelPosition = labelData.labelPosition

    pieSlices.push(slice)
  }
  // 处理只有支出的情况
  else if (totalExpense > 0 && totalIncome === 0) {
    const slice = {
      label: '支出',
      value: totalExpense,
      percentage: 100,
      color: '#99BCAC',
      path: describeArc(200, 150, 100, 0, 360), // 完整的圆
      midAngle: 180
    }

    // 计算引线和标签位置（放在右侧）
    const labelData = calculateLabelPosition(200, 150, 100, 180, 100)
    slice.lineStart = labelData.lineStart
    slice.lineEnd = labelData.lineEnd
    slice.labelPosition = labelData.labelPosition

    pieSlices.push(slice)
  }
  // 处理既有收入又有支出的情况
  else {
    if (totalIncome > 0) {
      const midAngle = startAngle + incomeAngle / 2
      const slice = {
        label: '收入',
        value: totalIncome,
        percentage: Math.round((totalIncome / total) * 100),
        color: '#D5EBE1',
        path: describeArc(200, 150, 100, startAngle, startAngle + incomeAngle),
        midAngle: midAngle
      }

      // 计算引线和标签位置
      const labelData = calculateLabelPosition(200, 150, 100, midAngle, slice.percentage)
      slice.lineStart = labelData.lineStart
      slice.lineEnd = labelData.lineEnd
      slice.labelPosition = labelData.labelPosition

      pieSlices.push(slice)
      startAngle += incomeAngle
    }

    if (totalExpense > 0) {
      const midAngle = startAngle + expenseAngle / 2
      const slice = {
        label: '支出',
        value: totalExpense,
        percentage: Math.round((totalExpense / total) * 100),
        color: '#99BCAC',
        path: describeArc(200, 150, 100, startAngle, startAngle + expenseAngle),
        midAngle: midAngle
      }

      // 计算引线和标签位置
      const labelData = calculateLabelPosition(200, 150, 100, midAngle, slice.percentage)
      slice.lineStart = labelData.lineStart
      slice.lineEnd = labelData.lineEnd
      slice.labelPosition = labelData.labelPosition

      pieSlices.push(slice)
    }
  }

  console.log('生成的饼图切片:', pieSlices)
  pieData.value = pieSlices
}

/**
 * 计算标签位置 - 标签根据位置自动向左或向右摆动
 */
function calculateLabelPosition(centerX, centerY, radius, midAngle, percentage) {
  // 计算饼图边缘的点
  const angleInRadians = (midAngle - 90) * Math.PI / 180.0
  const edgeX = centerX + radius * Math.cos(angleInRadians)
  const edgeY = centerY + radius * Math.sin(angleInRadians)

  // 计算引线延伸方向（向外延伸）
  const extensionFactor = 1.4 // 引线长度系数
  const lineEndX = centerX + radius * extensionFactor * Math.cos(angleInRadians)
  const lineEndY = centerY + radius * extensionFactor * Math.sin(angleInRadians)

  // 计算标签位置
  let labelX, labelY
  const labelOffset = 50 // 标签距离引线末端的水平偏移量

  // 根据角度决定标签位置
  // 将角度归一化到 0-360 范围
  const normalizedAngle = midAngle % 360

  // 标签位置
  if (normalizedAngle >= 0 && normalizedAngle < 180) {
    // 右侧区域 (0°-180°)
    // 包括右上(0-90°)和右下(90-180°)
    labelX = lineEndX + labelOffset  // 标签向右
    labelY = lineEndY
  } else {
    // 左侧区域 (180°-360°)
    // 包括左下(180-270°)和左上(270-360°)
    labelX = lineEndX - labelOffset  // 标签向左
    labelY = lineEndY
  }

  // 对于完整圆的情况（只有一种类型），特殊处理
  if (percentage === 100) {
    // 完整圆时，把标签放在正右侧
    labelX = lineEndX + labelOffset
    labelY = lineEndY
  }

  return {
    lineStart: { x: edgeX, y: edgeY },
    lineEnd: { x: lineEndX, y: lineEndY },
    labelPosition: { x: labelX, y: labelY }
  }
}

/**
 * 计算支出分类统计
 */
const calculateExpenseCategories = async () => {
  const records = await getRecordsByTimeRange()

  // 过滤支出记录
  const expenseRecords = records.filter(record => record.type === '支出')

  // 按类别汇总
  const categoryMap = new Map()
  let totalExpense = 0

  expenseRecords.forEach(record => {
    const categoryName = record.category
    const amount = parseFloat(record.amount)
    totalExpense += amount

    if (categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, categoryMap.get(categoryName) + amount)
    } else {
      categoryMap.set(categoryName, amount)
    }
  })

  // 转换为数组并计算百分比
  const categoryList = []
  let id = 1

  for (const [name, amount] of categoryMap.entries()) {
    const style = categoryStyleMap[name] || { icon: 'fas fa-circle', color: '#95A5A6' }
    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0

    categoryList.push({
      id: id++,
      name: name,
      icon: style.icon,
      color: style.color,
      amount: amount,
      percentage: percentage
    })
  }

  // 按金额降序排序
  categoryList.sort((a, b) => b.amount - a.amount)

  expenseCategories.value = categoryList
}

/**
 * 计算收入分类统计
 */
const calculateIncomeCategories = async () => {
  const records = await getRecordsByTimeRange()

  // 过滤收入记录
  const incomeRecords = records.filter(record => record.type === '收入')

  // 按类别汇总
  const categoryMap = new Map()
  let totalIncome = 0

  incomeRecords.forEach(record => {
    const categoryName = record.category
    const amount = parseFloat(record.amount)
    totalIncome += amount

    if (categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, categoryMap.get(categoryName) + amount)
    } else {
      categoryMap.set(categoryName, amount)
    }
  })

  // 转换为数组并计算百分比
  const categoryList = []
  let id = 1

  for (const [name, amount] of categoryMap.entries()) {
    const style = categoryStyleMap[name] || { icon: 'fas fa-circle', color: '#95A5A6' }
    const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0

    categoryList.push({
      id: id++,
      name: name,
      icon: style.icon,
      color: style.color,
      amount: amount,
      percentage: percentage
    })
  }

  // 按金额降序排序
  categoryList.sort((a, b) => b.amount - a.amount)

  incomeCategories.value = categoryList
}

/**
 * 刷新所有图表数据
 */
const refreshChartData = async () => {
  console.log('刷新图表数据，当前选择:', selectedTimeRange.value)
  loading.value = true

  try {
    // 根据选择的时间范围更新柱状图数据
    switch(selectedTimeRange.value) {
      case 'week':
        chartData.value = await getWeekData()
        break
      case 'month':
        chartData.value = await getMonthData()
        break
      case 'quarter':
        chartData.value = await getQuarterData()
        break
      case 'year':
        chartData.value = await getYearData()
        break
      default:
        chartData.value = await getMonthData()
    }

    console.log('柱状图数据:', chartData.value)

    // 更新饼图数据
    await calculatePieData()
    console.log('饼图数据:', pieData.value)

    // 更新分类统计
    await calculateExpenseCategories()
    await calculateIncomeCategories()
  } catch (error) {
    console.error('刷新图表数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听分类选项卡变化
watch(selectedCategoryTab, () => {
  // 不需要重新计算数据，只是切换显示
})

// 监听时间范围变化
watch(selectedTimeRange, () => {
  refreshChartData()
})

// ==================== 辅助函数 ====================

/**
 * 描述SVG弧形路径
 */
function describeArc(x, y, radius, startAngle, endAngle) {
  // 处理完整的圆（360度）
  if (Math.abs(endAngle - startAngle) >= 360) {
    // 对于完整的圆，绘制两个半圆
    const midAngle = startAngle + 180;
    const start1 = polarToCartesian(x, y, radius, startAngle);
    const mid1 = polarToCartesian(x, y, radius, midAngle);
    const start2 = polarToCartesian(x, y, radius, midAngle);
    const end2 = polarToCartesian(x, y, radius, endAngle);

    return [
      'M', start1.x, start1.y,
      'A', radius, radius, 0, 0, 1, mid1.x, mid1.y,
      'A', radius, radius, 0, 0, 1, end2.x, end2.y,
      'L', x, y,
      'Z'
    ].join(' ');
  }

  // 处理普通弧线
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', x, y,
    'Z'
  ].join(' ')
}

/**
 * 极坐标转笛卡尔坐标
 */
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  }
}

// ==================== 事件处理 ====================

// 选择时间范围
const selectTimeRange = (range) => {
  selectedTimeRange.value = range

  const rangeObj = timeRanges.find(r => r.value === range)
  const rangeLabel = rangeObj ? rangeObj.label : range
  notificationService.showNotification(`已更新${rangeLabel}图表数据`)
}

// 查看分类详情
const viewCategoryDetail = (category) => {
  const typeText = selectedCategoryTab.value === 'expense' ? '支出' : '收入'
  notificationService.showNotification(`查看"${category.name}"的详细分析\n当前时间段${typeText}: ¥${formatNumber(category.amount)}\n占比: ${category.percentage}%`, 'info')
}

// 显示工具提示
const showTooltip = (event, text) => {
  // 移除现有工具提示
  if (tooltip) {
    document.body.removeChild(tooltip)
  }

  // 创建新工具提示
  tooltip = document.createElement('div')
  tooltip.style.cssText = `
    position: fixed;
    background-color: var(--accent-color);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 1000;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  `
  tooltip.textContent = text
  document.body.appendChild(tooltip)

  // 获取元素位置
  const rect = event.target.getBoundingClientRect()
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`
}

// 隐藏工具提示
const hideTooltip = () => {
  if (tooltip) {
    document.body.removeChild(tooltip)
    tooltip = null
  }
}

// 格式化数字
const formatNumber = (num) => {
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 生命周期钩子 ====================

onMounted(async () => {
  console.log('Chart组件挂载，检查认证')

  // 检查token是否存在
  const token = localStorage.getItem('auth_token')
  if (!token) {
    console.log('未检测到token，跳转到登录页')
    router.push({
      path: '/login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
    return
  }

  // 设置当前用户
  const currentUser = authHelperService.getCurrentUser()
  if (currentUser) {
    userDataService.setCurrentUser(currentUser)
    await businessDataService.init(currentUser.phone)
    console.log('当前用户:', currentUser.phone || currentUser.username)
  }

  // 检查是否有数据
  const allRecords = await getAllRecords()
  console.log('所有记录:', allRecords)

  if (allRecords.length === 0) {
    console.log('暂无记账数据')
  }

  // 加载图表数据
  await refreshChartData()
})

// 组件卸载时清理工具提示
onUnmounted(() => {
  if (tooltip) {
    document.body.removeChild(tooltip)
    tooltip = null
  }
})
</script>

<style scoped>
.chart {
  --primary-color: #D5EBE1;
  --secondary-color: #B1D5C8;
  --tertiary-color: #99BCAC;
  --accent-color: #80A492;
  --text-dark: #333333;
  --text-light: #666666;
  --gray-bg: #f8f9fa;
  --overlay: rgba(0, 0, 0, 0.5);
  --white: #ffffff;
  --shadow: rgba(0, 0, 0, 0.1);
  --delete-color: #ff6b6b;
  --income-color: #D5EBE1;
  --expense-color: #99BCAC;
  padding: 0;
  max-width: 100%;
}

/* 时间筛选 */
.time-filter {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  margin-top: 20px;
  background-color: var(--white);
  border-radius: 15px;
  padding: 10px;
  box-shadow: 0 3px 10px var(--shadow);
}

.time-btn {
  flex: 1;
  padding: 10px 5px;
  border: none;
  background: none;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
}

.time-btn.active {
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-weight: 500;
}

/* 图表容器 */
.chart-section {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 5px 15px var(--shadow);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-color);
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
}

.section-title i {
  color: var(--tertiary-color);
  font-size: 18px;
}

/* 空图表样式 */
.empty-chart {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
}

.empty-chart i {
  font-size: 48px;
  margin-bottom: 15px;
  color: var(--tertiary-color);
}

.empty-chart p {
  font-size: 14px;
}

/* 主要图表 */
.main-chart {
  height: 220px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 10px;
}

.chart-bar {
  width: 14%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-container {
  width: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 180px;
  justify-content: flex-end;
}

.bar-income,
.bar-expense {
  width: 100%;
  border-radius: 8px 8px 0 0;
  transition: height 0.3s ease;
  cursor: pointer;
}

.bar-income {
  background-color: var(--primary-color);
  margin-bottom: 3px;
}

.bar-expense {
  background-color: var(--tertiary-color);
}

.bar-label {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 5px;
  text-align: center;
}

/* 图例 */
.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-color {
  width: 15px;
  height: 15px;
  border-radius: 3px;
  margin-right: 8px;
}

.income-color {
  background-color: var(--primary-color);
}

.expense-color {
  background-color: var(--tertiary-color);
}

.legend-text {
  font-size: 13px;
  color: var(--text-light);
}

/* 饼图样式 */
.pie-section {
  margin-top: 25px;
}

.pie-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  overflow: visible;
}

.pie-chart {
  width: 100%;
  max-width: 400px;
  height: auto;
  cursor: pointer;
  overflow: visible;
}

.pie-slice {
  transition: transform 0.2s, opacity 0.2s;
  stroke: white;
  stroke-width: 2;
}

.pie-slice:hover,
.pie-slice-highlight {
  transform: scale(1.02);
  opacity: 0.9;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2));
}

/* 引线样式 */
.pie-chart line {
  stroke: #999;
  stroke-width: 1;
}

/* 百分比标签背景 */
.pie-chart rect {
  fill: white;
  stroke: #ddd;
  stroke-width: 1;
  rx: 12;
  ry: 12;
}

/* 百分比文本 */
.pie-chart text {
  font-size: 12px;
  font-weight: bold;
  dominant-baseline: middle;
}

.pie-legend {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
}

.pie-legend-item {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.pie-legend-item:hover {
  background-color: #f8f9fa;
}

.pie-legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  margin-right: 8px;
}

.pie-legend-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-dark);
}

.pie-legend-percentage {
  font-weight: 600;
  color: var(--accent-color);
  background-color: rgba(128, 164, 146, 0.1);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
}

/* 分类图表 */
.category-chart {
  margin-top: 25px;
}

.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.category-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.3s;
}

.category-tab.active {
  background-color: var(--primary-color);
  color: var(--accent-color);
  font-weight: 500;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.3s;
  cursor: pointer;
}

.category-item:hover {
  background-color: rgba(213, 235, 225, 0.2);
}

.category-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
  color: var(--white);
}

.category-text h3 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 3px;
}

.category-text p {
  font-size: 12px;
  color: var(--text-light);
}

.category-amount {
  font-weight: 600;
  font-size: 16px;
}

.income-amount {
  color: #2ecc71;
}

.expense-amount {
  color: #e74c3c;
}

/* 空状态 */
.empty-category {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
}

.empty-category i {
  font-size: 48px;
  margin-bottom: 15px;
  color: var(--tertiary-color);
}

.empty-category p {
  font-size: 14px;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-light);
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
}

.loading-state i {
  font-size: 48px;
  margin-bottom: 15px;
  color: var(--accent-color);
}

.loading-state p {
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 400px) {
  .chart {
    padding: 0;
  }

  .time-btn {
    font-size: 13px;
    padding: 8px 4px;
  }

  .main-chart {
    height: 200px;
  }

  .bar-container {
    height: 160px;
  }

  .pie-chart {
    max-width: 300px;
  }

  .pie-legend {
    gap: 20px;
  }

  .pie-legend-text {
    font-size: 13px;
  }

  .category-tab {
    padding: 6px 12px;
    font-size: 13px;
  }

  .empty-chart {
    padding: 40px 15px;
  }

  .empty-chart i {
    font-size: 36px;
  }
}

@media (min-width: 500px) {
  .chart {
    margin: 0;
    max-width: 100%;
  }
}
</style>