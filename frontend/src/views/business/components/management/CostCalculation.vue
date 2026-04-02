<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content cost-modal" @click.stop>
      <!-- 头部 - 使用更浅的配色 -->
      <div class="modal-header cost-header">
        <i class="fas fa-calculator" style="color: #80A492;"></i>
        <h3>成本核算</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 标签页导航 - 使用与商品管理一致的样式 -->
      <div class="cost-tabs">
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'overview' }"
            @click="activeTab = 'overview'"
        >
          <i class="fas fa-chart-pie"></i>
          <span>概览分析</span>
        </button>
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'products' }"
            @click="activeTab = 'products'"
        >
          <i class="fas fa-boxes"></i>
          <span>单品成本</span>
        </button>
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'profit' }"
            @click="activeTab = 'profit'"
        >
          <i class="fas fa-chart-bar"></i>
          <span>毛利分析</span>
        </button>
        <button
            class="tab-btn"
            :class="{ active: activeTab === 'breakEven' }"
            @click="activeTab = 'breakEven'"
        >
          <i class="fas fa-balance-scale"></i>
          <span>盈亏平衡</span>
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="cost-content">
        <!-- 概览分析标签页 -->
        <div v-if="activeTab === 'overview'" class="tab-content">
          <!-- 日期范围显示 - 浅色风格 -->
          <div class="date-range-badge">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ dateRangeText }}</span>
          </div>

          <!-- 关键指标卡片 - 使用更浅的颜色 -->
          <div class="stats-grid">
            <div class="stat-card profit">
              <div class="stat-icon">
                <i class="fas fa-coins"></i>
              </div>
              <div class="stat-info">
                <span class="stat-label">总毛利</span>
                <span class="stat-value">¥{{ formatNumber(overallStats.totalProfit) }}</span>
              </div>
              <div class="stat-trend" :class="{ positive: overallStats.profitMargin > 0 }">
                <i class="fas" :class="overallStats.profitMargin > 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
                <span>{{ formatPercent(overallStats.profitMargin) }}</span>
              </div>
            </div>

            <div class="stat-card revenue">
              <div class="stat-icon">
                <i class="fas fa-money-bill-wave"></i>
              </div>
              <div class="stat-info">
                <span class="stat-label">总收入</span>
                <span class="stat-value">¥{{ formatNumber(overallStats.totalRevenue) }}</span>
              </div>
            </div>

            <div class="stat-card expense">
              <div class="stat-icon">
                <i class="fas fa-file-invoice"></i>
              </div>
              <div class="stat-info">
                <span class="stat-label">总成本</span>
                <span class="stat-value">¥{{ formatNumber(overallStats.totalCost) }}</span>
              </div>
            </div>

            <div class="stat-card quantity">
              <div class="stat-icon">
                <i class="fas fa-chart-simple"></i>
              </div>
              <div class="stat-info">
                <span class="stat-label">销售数量</span>
                <span class="stat-value">{{ overallStats.totalSoldQuantity }}</span>
              </div>
            </div>
          </div>

          <!-- 分类成本分布卡片 -->
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-chart-pie"></i>
                <span>分类成本分布</span>
              </div>
              <button class="refresh-btn" @click="loadData">
                <i class="fas fa-sync-alt" :class="{ spinning: loading }"></i>
              </button>
            </div>

            <div class="card-body">
              <div v-if="loading" class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>加载中...</p>
              </div>

              <div v-else-if="categoryCostStats.length === 0" class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <p>暂无数据</p>
              </div>

              <div v-else class="category-list">
                <div v-for="(item, index) in categoryCostStats" :key="item.category" class="category-item">
                  <div class="category-info">
                    <span class="category-name">
                      <span class="color-dot" :style="{ backgroundColor: getCategoryColor(index) }"></span>
                      {{ item.category || '未分类' }}
                    </span>
                    <span class="category-amount">¥{{ formatNumber(item.cost) }}</span>
                  </div>
                  <div class="progress-bar">
                    <div
                        class="progress-fill"
                        :style="{
                          width: `${(item.cost / overallStats.totalCost) * 100}%`,
                          backgroundColor: getCategoryColor(index)
                        }"
                    ></div>
                  </div>
                  <div class="category-percent">{{ formatPercent(item.cost / overallStats.totalCost) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 最近交易记录卡片 -->
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-history"></i>
                <span>最近交易记录</span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                <tr>
                  <th>日期</th>
                  <th>商品</th>
                  <th>类型</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>总额</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="record in recentTransactions" :key="record.id">
                  <td>{{ formatDisplayDate(record.date) }}</td>
                  <td>{{ record.productName || '-' }}</td>
                  <td>
                      <span class="badge" :class="record.type === '收入' ? 'badge-income' : 'badge-expense'">
                        {{ record.type }}
                      </span>
                  </td>
                  <td>{{ record.quantity || 0 }}{{ record.unit || '' }}</td>
                  <td>¥{{ formatNumber(record.price || 0) }}</td>
                  <td :class="record.type === '收入' ? 'text-income' : 'text-expense'">
                    ¥{{ formatNumber(record.amount || 0) }}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 单品成本标签页 -->
        <div v-if="activeTab === 'products'" class="tab-content">
          <!-- 筛选栏 -->
          <div class="filter-bar">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                  v-model="productSearch"
                  type="text"
                  class="search-input"
                  placeholder="搜索商品名称..."
              >
            </div>

            <!-- 替换为自定义选择器 -->
            <div class="filter-select-custom" @click="openCategorySelector">
              <i class="fas fa-chevron-down"></i>
              <span>{{ categoryFilterText }}</span>
            </div>
          </div>

          <!-- 商品列表 -->
          <div v-if="loading" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
          </div>

          <div v-else-if="filteredProducts.length === 0" class="empty-state">
            <i class="fas fa-box-open"></i>
            <p>暂无商品数据</p>
          </div>

          <div v-else class="product-grid">
            <div v-for="product in filteredProducts" :key="product.id" class="product-card">
              <div class="product-header">
                <h4>{{ product.name }}</h4>
                <span class="product-category">{{ product.category || '未分类' }}</span>
              </div>

              <div class="product-stats">
                <div class="stat-row">
                  <span class="stat-label">销量：</span>
                  <span class="stat-value">{{ product.soldQuantity || 0 }} {{ product.unit }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">总收入：</span>
                  <span class="stat-value income">¥{{ formatNumber(product.revenue || 0) }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">总成本：</span>
                  <span class="stat-value cost">¥{{ formatNumber(product.cost || 0) }}</span>
                </div>
                <div class="stat-row profit-row">
                  <span class="stat-label">毛利：</span>
                  <span class="stat-value" :class="(product.profit || 0) >= 0 ? 'profit' : 'loss'">
                    ¥{{ formatNumber(product.profit || 0) }}
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">毛利率：</span>
                  <span class="stat-value" :class="(product.margin || 0) >= 0 ? 'profit' : 'loss'">
                    {{ formatPercent(product.margin || 0) }}
                  </span>
                </div>
              </div>

              <div class="product-footer">
                <button class="btn-detail" @click="showProductDetail(product)">
                  <i class="fas fa-chart-line"></i>
                  详情
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 毛利分析标签页 -->
        <div v-if="activeTab === 'profit'" class="tab-content">
          <!-- 时间范围选择 -->
          <div class="time-range-selector">
            <button
                v-for="range in timeRanges"
                :key="range.value"
                class="range-btn"
                :class="{ active: selectedTimeRange === range.value }"
                @click="selectedTimeRange = range.value"
            >
              {{ range.label }}
            </button>
          </div>

          <!-- 毛利趋势卡片 -->
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-chart-line"></i>
                <span>毛利趋势</span>
              </div>
            </div>

            <div class="card-body">
              <div v-if="profitTrend.length === 0" class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>暂无趋势数据</p>
              </div>

              <div v-else class="trend-chart">
                <div class="chart-bars">
                  <div v-for="(item, index) in profitTrend" :key="index" class="bar-item">
                    <div class="bar-label">{{ item.period }}</div>
                    <div class="bar-wrapper">
                      <div
                          class="bar"
                          :style="{
                            height: `${Math.abs((item.profit / maxProfit) * 100)}px`,
                            backgroundColor: item.profit >= 0 ? '#2ecc71' : '#e74c3c'
                          }"
                      ></div>
                    </div>
                    <div class="bar-value">¥{{ formatNumber(item.profit) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 高毛利商品 -->
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-star"></i>
                <span>高毛利商品 Top 5</span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                <tr>
                  <th>商品名称</th>
                  <th>销量</th>
                  <th>总收入</th>
                  <th>总成本</th>
                  <th>毛利</th>
                  <th>毛利率</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in topProfitProducts" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td>{{ item.soldQuantity }} {{ item.unit }}</td>
                  <td>¥{{ formatNumber(item.revenue) }}</td>
                  <td>¥{{ formatNumber(item.cost) }}</td>
                  <td class="profit">¥{{ formatNumber(item.profit) }}</td>
                  <td class="profit">{{ formatPercent(item.margin) }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 亏损商品 -->
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-exclamation-triangle"></i>
                <span>亏损商品</span>
              </div>
            </div>

            <div class="table-responsive">
              <table v-if="lossProducts.length > 0" class="data-table">
                <thead>
                <tr>
                  <th>商品名称</th>
                  <th>销量</th>
                  <th>总收入</th>
                  <th>总成本</th>
                  <th>亏损</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="item in lossProducts" :key="item.id">
                  <td>{{ item.name }}</td>
                  <td>{{ item.soldQuantity }} {{ item.unit }}</td>
                  <td>¥{{ formatNumber(item.revenue) }}</td>
                  <td>¥{{ formatNumber(item.cost) }}</td>
                  <td class="loss">-¥{{ formatNumber(Math.abs(item.profit)) }}</td>
                </tr>
                </tbody>
              </table>

              <div v-else class="empty-state small">
                <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
                <p>暂无亏损商品</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 盈亏平衡标签页 -->
        <div v-if="activeTab === 'breakEven'" class="tab-content">
          <div class="analysis-card">
            <div class="card-header">
              <div class="header-title">
                <i class="fas fa-balance-scale"></i>
                <span>盈亏平衡分析</span>
              </div>
            </div>

            <div class="card-body">
              <!-- 固定成本输入 -->
              <div class="form-group">
                <label>固定成本（元）</label>
                <div class="input-group">
                  <span class="input-prefix">¥</span>
                  <input
                      v-model.number="fixedCost"
                      type="number"
                      class="form-input"
                      placeholder="例如：5000"
                      min="0"
                      step="100"
                  >
                </div>
                <div class="form-hint">包括房租、工资、水电等固定支出</div>
              </div>

              <!-- 盈亏平衡点计算 -->
              <div class="break-even-result">
                <div class="result-item">
                  <span class="result-label">平均毛利率</span>
                  <span class="result-value">{{ formatPercent(averageMargin) }}</span>
                </div>
                <div class="result-divider"></div>
                <div class="result-item highlight">
                  <span class="result-label">盈亏平衡销售额</span>
                  <span class="result-value">¥{{ formatNumber(breakEvenRevenue) }}</span>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="progress-section">
                <div class="progress-label">
                  <span>当前销售额</span>
                  <span>¥{{ formatNumber(overallStats.totalRevenue) }}</span>
                </div>
                <div class="progress-track">
                  <div
                      class="progress-fill"
                      :style="{
                        width: `${Math.min((overallStats.totalRevenue / breakEvenRevenue) * 100, 100)}%`,
                        backgroundColor: overallStats.totalRevenue >= breakEvenRevenue ? '#2ecc71' : '#80A492'
                      }"
                  ></div>
                </div>
                <div class="progress-status" :class="{ success: overallStats.totalRevenue >= breakEvenRevenue }">
                  <i class="fas" :class="overallStats.totalRevenue >= breakEvenRevenue ? 'fa-check-circle' : 'fa-info-circle'"></i>
                  <span v-if="overallStats.totalRevenue >= breakEvenRevenue">
                    已达成盈亏平衡，超出 ¥{{ formatNumber(overallStats.totalRevenue - breakEvenRevenue) }}
                  </span>
                  <span v-else>
                    距离盈亏平衡还差 ¥{{ formatNumber(breakEvenRevenue - overallStats.totalRevenue) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 建议卡片 -->
          <div class="advice-card">
            <div class="advice-header">
              <i class="fas fa-lightbulb"></i>
              <span>经营建议</span>
            </div>
            <ul class="advice-list">
              <li v-for="(advice, index) in businessAdvice" :key="index">
                <i class="fas fa-check-circle" :class="getAdviceIconClass(advice.type)"></i>
                {{ advice.message }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 商品详情弹窗 -->
  <div class="modal" :class="{ active: detailModalVisible }" @click="closeDetailOnOverlay($event)">
    <div class="modal-content detail-modal" @click.stop>
      <div class="modal-header">
        <i class="fas fa-box"></i>
        <h3>{{ selectedProduct?.name }} - 成本详情</h3>
        <button class="modal-close" @click="detailModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body" v-if="selectedProduct">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">商品名称：</span>
              <span class="value">{{ selectedProduct.name }}</span>
            </div>
            <div class="info-item">
              <span class="label">商品分类：</span>
              <span class="value">{{ selectedProduct.category || '未分类' }}</span>
            </div>
            <div class="info-item">
              <span class="label">单位：</span>
              <span class="value">{{ selectedProduct.unit }}</span>
            </div>
          </div>
        </div>

        <!-- 成本统计 -->
        <div class="detail-section">
          <h4>成本统计</h4>
          <div class="stats-mini-grid">
            <div class="stat-mini-box">
              <span class="stat-mini-label">总销量</span>
              <span class="stat-mini-value">{{ selectedProduct.soldQuantity || 0 }} {{ selectedProduct.unit }}</span>
            </div>
            <div class="stat-mini-box">
              <span class="stat-mini-label">总收入</span>
              <span class="stat-mini-value income">¥{{ formatNumber(selectedProduct.revenue || 0) }}</span>
            </div>
            <div class="stat-mini-box">
              <span class="stat-mini-label">总成本</span>
              <span class="stat-mini-value cost">¥{{ formatNumber(selectedProduct.cost || 0) }}</span>
            </div>
            <div class="stat-mini-box">
              <span class="stat-mini-label">平均售价</span>
              <span class="stat-mini-value">¥{{ formatNumber(selectedProduct.avgPrice || 0) }}</span>
            </div>
            <div class="stat-mini-box">
              <span class="stat-mini-label">平均成本</span>
              <span class="stat-mini-value">¥{{ formatNumber(selectedProduct.avgCost || 0) }}</span>
            </div>
            <div class="stat-mini-box highlight">
              <span class="stat-mini-label">单品毛利</span>
              <span class="stat-mini-value" :class="(selectedProduct.unitProfit || 0) >= 0 ? 'profit' : 'loss'">
                ¥{{ formatNumber(selectedProduct.unitProfit || 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 交易记录 -->
        <div class="detail-section">
          <h4>交易记录</h4>
          <div class="table-responsive">
            <table class="mini-table">
              <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>数量</th>
                <th>单价</th>
                <th>总额</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="record in productTransactions" :key="record.id">
                <td>{{ formatDisplayDate(record.date) }}</td>
                <td>
                  <span class="badge" :class="record.type === '收入' ? 'badge-income' : 'badge-expense'">
                    {{ record.type }}
                  </span>
                </td>
                <td>{{ record.quantity }} {{ record.unit }}</td>
                <td>¥{{ formatNumber(record.price) }}</td>
                <td :class="record.type === '收入' ? 'text-income' : 'text-expense'">
                  ¥{{ formatNumber(record.amount) }}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import costService from "@/services/api/business/cost.service.js";
import baseService from "@/services/api/business/base.service.js";
import notificationService from "@/services/utils/notification.service.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'update'])

// ==================== 状态 ====================
const loading = ref(false)
const activeTab = ref('overview')
const detailModalVisible = ref(false)
const selectedProduct = ref(null)

// 筛选条件
const productSearch = ref('')
const categoryFilter = ref('all')
const selectedTimeRange = ref('month')
const fixedCost = ref(5000)

// 数据存储
const products = ref([])
const incomeRecords = ref([])
const expenseRecords = ref([])
const productStats = ref([])
const categoryCostStats = ref([])
const overallStats = ref({
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  profitMargin: 0,
  totalSoldQuantity: 0
})
const profitTrend = ref([])

// 时间范围选项
const timeRanges = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' }
]

// ==================== 计算属性 ====================

// 分类名称列表
const categoryNames = computed(() => {
  return props.categories.map(c => c.name).sort()
})

// 分类选择器显示文本
const categoryFilterText = computed(() => {
  if (categoryFilter.value === 'all') return '全部分类'
  return categoryFilter.value
})

// 日期范围文本
const dateRangeText = computed(() => {
  return costService.getDateRangeText(selectedTimeRange.value)
})

// 筛选后的商品
const filteredProducts = computed(() => {
  let filtered = productStats.value

  if (productSearch.value) {
    const keyword = productSearch.value.toLowerCase()
    filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword))
  }

  if (categoryFilter.value !== 'all') {
    filtered = filtered.filter(p => p.category === categoryFilter.value)
  }

  return filtered
})

// 最大利润值（用于图表缩放）
const maxProfit = computed(() => {
  const profits = profitTrend.value.map(p => Math.abs(p.profit))
  return Math.max(...profits, 1)
})

// 高毛利商品Top 5
const topProfitProducts = computed(() => {
  return costService.getTopProfitProducts(productStats.value, 5)
})

// 亏损商品
const lossProducts = computed(() => {
  return costService.getLossProducts(productStats.value)
})

// 平均毛利率
const averageMargin = computed(() => {
  if (productStats.value.length === 0) return 0
  const total = productStats.value.reduce((sum, p) => sum + (p.margin || 0), 0)
  return total / productStats.value.length
})

// 盈亏平衡销售额
const breakEvenRevenue = computed(() => {
  const breakEven = costService.calculateBreakEven(fixedCost.value, productStats.value)
  return breakEven.breakEvenRevenue
})

// 最近交易
const recentTransactions = computed(() => {
  return costService.getRecentTransactions(
      incomeRecords.value,
      expenseRecords.value,
      10,
      products.value
  )
})

// 经营建议
const businessAdvice = computed(() => {
  const breakEvenData = costService.calculateBreakEven(fixedCost.value, productStats.value)
  return costService.generateBusinessAdvice({
    productStats: productStats.value,
    overallStats: overallStats.value,
    breakEvenData,
    lossProducts: lossProducts.value
  })
})

// 商品交易记录
const productTransactions = computed(() => {
  if (!selectedProduct.value) return []
  return costService.getProductTransactions(
      selectedProduct.value.id,
      incomeRecords.value,
      expenseRecords.value
  )
})

// ==================== 方法 ====================

// 打开分类选择器
const openCategorySelector = async () => {
  const items = [
    { label: '全部分类', value: 'all', icon: '📦' },
    ...categoryNames.value.map(name => ({
      label: name,
      value: name,
      icon: '📁'
    }))
  ]

  const result = await notificationService.selectList({
    title: '选择商品分类',
    items
  })

  if (result !== null) {
    categoryFilter.value = result
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 使用业务服务获取成本分析数据
    const analysisData = await costService.getCostAnalysisData()

    products.value = analysisData.products
    incomeRecords.value = analysisData.incomeRecords
    expenseRecords.value = analysisData.expenseRecords
    productStats.value = analysisData.productStats
    categoryCostStats.value = analysisData.categoryCostStats
    overallStats.value = analysisData.overallStats

    // 根据选中的时间范围重新计算趋势
    updateProfitTrend()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新毛利趋势
const updateProfitTrend = () => {
  profitTrend.value = costService.calculateProfitTrend(
      incomeRecords.value,
      expenseRecords.value,
      selectedTimeRange.value
  )
}

// 获取分类颜色
const getCategoryColor = (index) => {
  const colors = ['#80A492', '#99BCAC', '#B1D5C8', '#D5EBE1', '#2ecc71', '#3498db']
  return colors[index % colors.length]
}

// 获取建议图标样式
const getAdviceIconClass = (type) => {
  const iconMap = {
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    danger: 'fa-times-circle',
    info: 'fa-info-circle'
  }
  return iconMap[type] || 'fa-check-circle'
}

// 显示商品详情
const showProductDetail = (product) => {
  selectedProduct.value = product
  detailModalVisible.value = true
}

// 关闭详情弹窗
const closeDetailOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    detailModalVisible.value = false
  }
}

// 关闭模态框
const close = () => {
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// ==================== 辅助函数（委托给业务服务） ====================

const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

const formatPercent = (num) => {
  return baseService.formatPercent(num)
}

const formatDisplayDate = (dateStr) => {
  return baseService.formatDisplayDate(dateStr)
}

// ==================== 监听器 ====================

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadData()
  }
})

watch(selectedTimeRange, () => {
  updateProfitTrend()
})

// ==================== 初始化 ====================
onMounted(() => {
  if (props.visible) {
    loadData()
  }
})
</script>

<style scoped>
/* ==================== 基础样式 ==================== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.modal.active {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 500px;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow-y: auto;
}

.cost-modal {
  max-width: 1000px !important;
  width: 95%;
  padding: 0 !important;
  overflow: hidden !important;
  background-color: #f8fafc;
  border-radius: 20px;
}

.detail-modal {
  max-width: 800px !important;
}

/* ==================== 模态框头部 ==================== */
.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: #80A492;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #80A492;
  flex: 1;
  margin: 0;
}

.modal-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.modal-close:hover {
  background-color: #D5EBE1;
  color: #80A492;
}

.cost-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 标签页 ==================== */
.cost-tabs {
  display: flex;
  gap: 5px;
  padding: 0 25px;
  background: white;
  border-bottom: 1px solid #D5EBE1;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid transparent;
}

.tab-btn i {
  color: #99BCAC;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: #80A492;
}

.tab-btn:hover i {
  color: #80A492;
}

.tab-btn.active {
  color: #80A492;
  border-bottom-color: #80A492;
}

.tab-btn.active i {
  color: #80A492;
}

/* ==================== 内容区域 ==================== */
.cost-content {
  padding: 25px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ==================== 日期范围徽章 ==================== */
.date-range-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #D5EBE1;
  color: #80A492;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 14px;
  margin-bottom: 20px;
}

.date-range-badge i {
  font-size: 14px;
}

/* ==================== 统计卡片网格 ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid #D5EBE1;
  transition: all 0.3s;
  position: relative;
}

.stat-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.stat-card.profit {
  border-left: 4px solid #2ecc71;
}

.stat-card.revenue {
  border-left: 4px solid #3498db;
}

.stat-card.expense {
  border-left: 4px solid #e74c3c;
}

.stat-card.quantity {
  border-left: 4px solid #f39c12;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.profit .stat-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.revenue .stat-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.expense .stat-icon {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.quantity .stat-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.stat-info {
  flex: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  position: absolute;
  top: 12px;
  right: 12px;
}

.stat-trend.positive {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.stat-trend:not(.positive) {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

/* ==================== 分析卡片 ==================== */
.analysis-card {
  background: white;
  border-radius: 16px;
  margin-bottom: 25px;
  border: 1px solid #D5EBE1;
  overflow: hidden;
}

.card-header {
  padding: 15px 20px;
  border-bottom: 1px solid #D5EBE1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(213, 235, 225, 0.2);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title i {
  color: #80A492;
  font-size: 16px;
}

.header-title span {
  font-size: 15px;
  font-weight: 600;
  color: #80A492;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #D5EBE1;
  border-radius: 8px;
  background: white;
  color: #99BCAC;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  background: #D5EBE1;
  color: #80A492;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-body {
  padding: 20px;
}

/* ==================== 分类列表 ==================== */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.category-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.category-amount {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.category-percent {
  font-size: 12px;
  color: #999;
  text-align: right;
}

/* ==================== 表格样式 ==================== */
.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  padding: 12px 15px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

.data-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #D5EBE1;
  color: #333;
  white-space: nowrap;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: rgba(213, 235, 225, 0.1);
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge-income {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.badge-expense {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.text-income {
  color: #2ecc71;
  font-weight: 600;
}

.text-expense {
  color: #e74c3c;
  font-weight: 600;
}

/* ==================== 筛选栏 ==================== */
.filter-bar {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 12px 15px 12px 45px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

/* 自定义选择器样式 */
.filter-select-custom {
  width: 150px;
  padding: 12px 16px;
  border: 1px solid #B1D5C8;
  border-radius: 25px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s;
}

.filter-select-custom:hover {
  border-color: #80A492;
  background: rgba(213, 235, 225, 0.1);
}

.filter-select-custom i {
  font-size: 12px;
  color: #99BCAC;
}

/* ==================== 商品卡片网格 ==================== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.product-card {
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s;
}

.product-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.product-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.product-category {
  font-size: 12px;
  color: #999;
  background: rgba(128, 164, 146, 0.1);
  padding: 4px 8px;
  border-radius: 20px;
}

.product-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.stat-label {
  color: #999;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.stat-value.income {
  color: #2ecc71;
}

.stat-value.cost {
  color: #e74c3c;
}

.stat-value.profit {
  color: #2ecc71;
}

.stat-value.loss {
  color: #e74c3c;
}

.profit-row {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed #D5EBE1;
}

.product-footer {
  display: flex;
  justify-content: flex-end;
}

.btn-detail {
  padding: 8px 16px;
  border: 1px solid #D5EBE1;
  border-radius: 8px;
  background: white;
  color: #80A492;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-detail:hover {
  background: #D5EBE1;
  color: #80A492;
}

/* ==================== 时间范围选择器 ==================== */
.time-range-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  background: white;
  padding: 5px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
}

.range-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 25px;
  background: transparent;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.range-btn.active {
  background: #D5EBE1;
  color: #80A492;
  font-weight: 500;
}

/* ==================== 趋势图 ==================== */
.trend-chart {
  padding: 20px 0;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  gap: 20px;
  min-height: 200px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.bar-label {
  font-size: 12px;
  color: #999;
}

.bar-wrapper {
  width: 40px;
  height: 150px;
  background: #f0f0f0;
  border-radius: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  border-radius: 20px;
  transition: height 0.3s ease;
  min-height: 4px;
}

.bar-value {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

/* ==================== 盈亏平衡 ==================== */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #80A492;
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.input-prefix {
  padding: 0 15px;
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  font-size: 14px;
  height: 48px;
  display: flex;
  align-items: center;
  border-right: 1px solid #B1D5C8;
}

.form-input {
  flex: 1;
  height: 48px;
  padding: 0 15px;
  border: none;
  font-size: 15px;
  background: white;
}

.form-input:focus {
  outline: none;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.break-even-result {
  background: rgba(213, 235, 225, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin: 20px 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.result-item {
  text-align: center;
}

.result-divider {
  width: 1px;
  height: 40px;
  background: #D5EBE1;
}

.result-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.result-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.result-item.highlight .result-value {
  color: #80A492;
  font-size: 24px;
}

.progress-section {
  margin: 20px 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.progress-track {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-status {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.progress-status.success {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

/* ==================== 建议卡片 ==================== */
.advice-card {
  background: rgba(213, 235, 225, 0.3);
  border-radius: 16px;
  padding: 20px;
  border-left: 4px solid #f39c12;
}

.advice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  color: #f39c12;
  font-size: 16px;
  font-weight: 600;
}

.advice-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.advice-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: #666;
  font-size: 14px;
}

.advice-list li i {
  color: #2ecc71;
}

/* ==================== 详情模态框 ==================== */
.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  font-size: 16px;
  color: #80A492;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #D5EBE1;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #999;
}

.info-item .value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.stats-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.stat-mini-box {
  background: rgba(213, 235, 225, 0.2);
  border-radius: 12px;
  padding: 15px;
  text-align: center;
}

.stat-mini-box.highlight {
  background: #D5EBE1;
}

.stat-mini-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 6px;
}

.stat-mini-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stat-mini-value.income {
  color: #2ecc71;
}

.stat-mini-value.cost {
  color: #e74c3c;
}

.stat-mini-value.profit {
  color: #2ecc71;
}

.stat-mini-value.loss {
  color: #e74c3c;
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.mini-table th {
  background: rgba(213, 235, 225, 0.3);
  color: #80A492;
  font-weight: 600;
  padding: 10px;
  text-align: left;
}

.mini-table td {
  padding: 10px;
  border-bottom: 1px solid #D5EBE1;
}

/* ==================== 空状态 ==================== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  color: #99BCAC;
  margin-bottom: 15px;
}

.empty-state.small {
  padding: 30px 20px;
}

.empty-state.small i {
  font-size: 32px;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.loading-state i {
  font-size: 40px;
  color: #80A492;
  margin-bottom: 10px;
}

/* ==================== 自定义滚动条 ==================== */
.cost-content::-webkit-scrollbar,
.table-responsive::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.cost-content::-webkit-scrollbar-track,
.table-responsive::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.cost-content::-webkit-scrollbar-thumb,
.table-responsive::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.cost-content::-webkit-scrollbar-thumb:hover,
.table-responsive::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-select-custom {
    width: 100%;
  }

  .info-grid,
  .stats-mini-grid {
    grid-template-columns: 1fr;
  }

  .break-even-result {
    flex-direction: column;
    gap: 20px;
  }

  .result-divider {
    width: 100%;
    height: 1px;
  }
}

@media (max-width: 480px) {
  .cost-tabs {
    flex-wrap: wrap;
    padding: 0 15px;
  }

  .tab-btn {
    flex: 1;
    justify-content: center;
    padding: 10px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 15px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>