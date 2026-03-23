<template>
  <div class="business">
    <!-- 快速记账 -->
    <div class="quick-record">
      <div class="quick-income" @click="openModal('income')">
        <div class="quick-icon">
          <i class="fas fa-money-bill-wave"></i>
        </div>
        <div class="quick-text">收入记账</div>
      </div>
      <div class="quick-expense" @click="openModal('expense')">
        <div class="quick-icon">
          <i class="fas fa-receipt"></i>
        </div>
        <div class="quick-text">支出记账</div>
      </div>
    </div>

    <!-- 数据概览 -->
    <section class="overview-section">
      <div class="section-title">
        <h2>本月经营概览</h2>
        <i class="fas fa-chart-line"></i>
      </div>

      <div class="overview-stats">
        <div class="stat-card stat-income">
          <div class="stat-value">¥ {{ formatNumber(monthlyIncome) }}</div>
          <div class="stat-label">本月收入</div>
        </div>
        <div class="stat-card stat-expense">
          <div class="stat-value">¥ {{ formatNumber(monthlyExpense) }}</div>
          <div class="stat-label">本月支出</div>
        </div>
        <div class="stat-card stat-profit">
          <div class="stat-value">¥ {{ formatNumber(monthlyProfit) }}</div>
          <div class="stat-label">本月利润</div>
        </div>
        <div class="stat-card stat-debt">
          <div class="stat-value">¥ {{ formatNumber(pendingReceivables) }}</div>
          <div class="stat-label">待收账款</div>
        </div>
      </div>

      <!-- 最近记录 -->
      <div class="recent-records">
        <div class="section-title" style="border-bottom: none; margin-bottom: 10px;">
          <h3 style="font-size: 16px;">最近记录</h3>
        </div>
        <div v-for="record in recentRecords" :key="record.id" class="record-item" :class="record.type === '收入' ? 'record-income' : 'record-expense'">
          <div class="record-icon">
            <i :class="getRecordIcon(record)"></i>
          </div>
          <div class="record-info">
            <h4>{{ record.title }}</h4>
            <p>{{ record.desc }}</p>
          </div>
          <div class="record-amount">¥ {{ formatNumber(record.amount) }}</div>
        </div>
      </div>
    </section>

    <!-- 功能模块网格 -->
    <div class="module-grid">
      <div class="module-card" @click="openModal('product')">
        <div class="module-icon" style="background-color: #2ecc71;">
          <i class="fas fa-boxes"></i>
        </div>
        <h3>商品管理</h3>
        <p>添加/编辑商品、查看库存</p>
      </div>

      <div class="module-card" @click="openModal('customer')">
        <div class="module-icon" style="background-color: #e74c3c;">
          <i class="fas fa-users"></i>
        </div>
        <h3>客户管理</h3>
        <p>赊账客户、批发商、往来记录</p>
      </div>

      <div class="module-card" @click="openModal('report')">
        <div class="module-icon" style="background-color: #3498db;">
          <i class="fas fa-chart-pie"></i>
        </div>
        <h3>报表分析</h3>
        <p>收支流水、利润表、分类统计</p>
      </div>

      <div class="module-card" @click="openModal('inventory')">
        <div class="module-icon" style="background-color: #f39c12;">
          <i class="fas fa-boxes"></i>
        </div>
        <h3>库存管理</h3>
        <p>库存盘点、预警设置、临期提醒</p>
      </div>

      <div class="module-card" @click="openModal('credit')">
        <div class="module-icon" style="background-color: #e74c3c;">
          <i class="fas fa-hand-holding-usd"></i>
        </div>
        <h3>赊账管理</h3>
        <p>个人赊账、客户赊账、还款记录</p>
      </div>

      <div class="module-card" @click="openModal('purchase')">
        <div class="module-icon" style="background-color: #9b59b6;">
          <i class="fas fa-truck"></i>
        </div>
        <h3>采购管理</h3>
        <p>供应商管理、采购订单、进货记录</p>
      </div>

      <div class="module-card" @click="openModal('cost')">
        <div class="module-icon" style="background-color: #e67e22;">
          <i class="fas fa-calculator"></i>
        </div>
        <h3>成本核算</h3>
        <p>单品成本、毛利分析、盈亏点计算</p>
      </div>
    </div>

    <!-- 模态框组件 -->
    <IncomeModal
        v-model:visible="modalStates.income"
        :customers="customers"
        :products="products"
        :categories="categories"
        @success="handleRecordSuccess"
        @open-customer="openModal('customer')"
        @open-category="handleOpenCategoryFromIncome"
        @refresh-products="handleRefreshProducts"
    />
    <ExpenseModal
        v-model:visible="modalStates.expense"
        :products="products"
        :inventory-items="inventoryItems"
        @success="handleExpenseSuccess"
        @refresh-products="handleRefreshProducts"
        @open-category="handleOpenCategoryFromExpense"
    />

    <ProductManagement
        v-model:visible="modalStates.product"
        :categories="categories"
        @update="handleDataUpdate"
        @open-category="handleOpenCategory"
    />

    <CustomerManagement
        v-model:visible="modalStates.customer"
        @update="handleDataUpdate('customer')"
        @record-income="handleRecordIncomeFromCustomer"
    />

    <CreditManagement
        v-model:visible="modalStates.credit"
        @update="handleDataUpdate('credit')"
    />

    <InventoryManagement
        v-model:visible="modalStates.inventory"
        :products="products"
        :categories="categories"
        @update="handleDataUpdate"
        @open-category="handleOpenCategoryFromInventory"
    />

    <ReportAnalysis
        v-model:visible="modalStates.report"
        @export="handleReportExport"
    />

    <CategoryManagement
        v-model:visible="modalStates.category"
        @update="handleCategoryUpdate"
        @back="handleCategoryBack"
    />

    <ModulePlaceholder
        v-if="modalStates.price"
        :title="getPlaceholderTitle()"
        v-model:visible="modalStates.price"
    />

    <PurchaseManagement
        v-model:visible="modalStates.purchase"
        :products="products"
        @update="handleDataUpdate"
    />

    <CostCalculation
        v-model:visible="modalStates.cost"
        :products="products"
        :categories="categories"
        @update="handleDataUpdate"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import businessDataService from '@/services/business-data.service.js'
import userDataService from '@/services/user-data.service.js'
import { authHelperService } from '@/services/index.js'
import dateHelper from '@/services/utils/date-helper.service.js'

// 导入拆分后的组件
import {
  IncomeModal,
  ExpenseModal,
  ProductManagement,
  CustomerManagement,
  CreditManagement,
  InventoryManagement,
  ReportAnalysis,
  CategoryManagement,
  ModulePlaceholder,
  PurchaseManagement,
  CostCalculation
} from './components'

const router = useRouter()

// ==================== 模态框状态 ====================
const modalStates = reactive({
  income: false,
  expense: false,
  product: false,
  customer: false,
  credit: false,
  inventory: false,
  report: false,
  category: false,
  purchase: false,
  price: false,
  cost: false
})

const activePlaceholder = ref('')
const lastModal = ref(null)

// ==================== 数据状态 ====================
const customers = ref([])
const products = ref([])
const categories = ref([])
const inventoryItems = ref([])

// ==================== 概览数据 ====================
const monthlyIncome = ref(0)
const monthlyExpense = ref(0)
const monthlyProfit = computed(() => monthlyIncome.value - monthlyExpense.value)
const pendingReceivables = ref(0)
const recentRecords = ref([])

// ==================== 方法 ====================

// 打开模态框
const openModal = (type) => {
  console.log('Business.vue - openModal called with type:', type)
  console.log('Current modalStates before:', { ...modalStates })

  lastModal.value = null
  modalStates[type] = true

  console.log('Current modalStates after:', { ...modalStates })

  if (type === 'price') {
    activePlaceholder.value = type
  }
}

// 获取占位符标题
const getPlaceholderTitle = () => {
  const titles = {
    price: '价格管理',
    cost: '成本核算'
  }
  return titles[activePlaceholder.value] || '功能开发中'
}

// 处理记账成功
const handleRecordSuccess = async () => {
  await Promise.all([
    loadOverviewData(),
    loadRecentRecords(),
    loadCustomers(),
    loadInventoryData()
  ])
}

// 处理支出记账成功
const handleExpenseSuccess = async () => {
  await Promise.all([
    loadOverviewData(),
    loadRecentRecords(),
    loadInventoryData()
  ])
}

// 处理数据更新
const handleDataUpdate = async (source) => {
  console.log('数据更新，来源:', source)

  // 同时加载所有相关数据，确保数据同步
  await Promise.all([
    loadOverviewData(),
    loadRecentRecords(),
    loadCustomers(),
    loadProducts(),
    loadInventoryData()
  ])

  console.log('数据同步完成')
}

// 处理分类更新
const handleCategoryUpdate = async () => {
  await loadCategories()
  await loadProducts() // 商品分类可能变化
}

// 从客户管理快速记账
const handleRecordIncomeFromCustomer = (customer) => {
  modalStates.customer = false
  setTimeout(() => {
    modalStates.income = true
    // 可以通过更复杂的方式传递客户信息，比如使用事件总线或全局状态
  }, 300)
}

// 处理报表导出
const handleReportExport = (data) => {
  console.log('导出报表:', data)
}

// ==================== 数据加载方法 ====================

// 加载概览数据
const loadOverviewData = async () => {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const stats = await businessDataService.getBusinessMonthlyStats(year, month)

    monthlyIncome.value = stats.income
    monthlyExpense.value = stats.expense
    pendingReceivables.value = stats.pendingReceivables || 0
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

// 加载最近记录
const loadRecentRecords = async () => {
  try {
    const records = await businessDataService.getBusinessRecords()
    recentRecords.value = records.slice(0, 10).map(r => ({
      id: r.id,
      type: r.type,
      title: r.type === '收入' ? (r.productName || r.category) : (r.subtype || r.category),
      desc: r.type === '收入'
          ? `${r.note || ''} ${r.quantity || ''}${r.unit || ''}`.trim()
          : (r.note || r.supplier || ''),
      amount: r.amount,
      date: r.date,
      icon: r.type === '收入' ? 'fa-money-bill-wave' : 'fa-receipt'
    }))
  } catch (error) {
    console.error('加载最近记录失败:', error)
  }
}

// 加载客户数据
const loadCustomers = async () => {
  try {
    customers.value = userDataService.getCustomers()
  } catch (error) {
    console.error('加载客户失败:', error)
  }
}

// 加载商品数据 - 优化：添加加载状态和错误重试
const loadProducts = async (showLoading = false) => {
  try {
    if (showLoading) {
      // 可以在这里添加全局 loading 状态
      console.log('开始加载商品数据...')
    }
    const data = await businessDataService.getAllProducts()
    products.value = data
    console.log(`商品数据加载成功，共 ${data.length} 个商品`)
    return data
  } catch (error) {
    console.error('加载商品失败:', error)
    // 可以添加重试逻辑
    return []
  }
}

// 加载分类数据
const loadCategories = async () => {
  try {
    categories.value = await businessDataService.getAllCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 加载库存数据
const loadInventoryData = async () => {
  try {
    inventoryItems.value = await businessDataService.getAllInventory()
  } catch (error) {
    console.error('加载库存失败:', error)
  }
}

// 处理打开分类管理
const handleOpenCategory = () => {
  modalStates.category = true
  loadCategories()
}

const handleOpenCategoryFromIncome = () => {
  modalStates.category = true
  loadCategories()
}

const handleOpenCategoryFromExpense = () => {
  modalStates.category = true
  loadCategories()
}

// 处理分类管理返回
const handleCategoryBack = () => {
  // 关闭分类管理
  modalStates.category = false

  // 根据记录的上一个页面，打开对应的模态框
  setTimeout(() => {
    if (lastModal.value) {
      modalStates[lastModal.value] = true
      // 清除记录
      lastModal.value = null
    }
  }, 300)
}

// 刷新商品数据 - 优化：强制刷新并返回 Promise
const handleRefreshProducts = async () => {
  console.log('开始刷新商品数据...')
  try {
    // 显示加载状态（可选）
    // 可以在这里添加一个全局 loading 提示
    await loadProducts(true)
    console.log('商品数据刷新完成，当前商品数量:', products.value.length)

    // 可选：显示成功提示
    // notificationService.showNotification('商品数据已刷新', 'success')
  } catch (error) {
    console.error('刷新商品数据失败:', error)
    // 可以显示错误提示
    // notificationService.showNotification('刷新商品数据失败', 'error')
  }
}

const handleOpenCategoryFromInventory = () => {
  modalStates.category = true
  loadCategories()
}

// ==================== 辅助函数 ====================

const getRecordIcon = (record) => {
  return record.icon || (record.type === '收入' ? 'fa-money-bill-wave' : 'fa-receipt')
}

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0.00'
  const value = typeof num === 'number' ? num : parseFloat(num) || 0
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================
onMounted(async () => {
  // 检查认证
  const token = localStorage.getItem('auth_token')
  if (!token) {
    router.push({
      path: '/login',
      query: { redirect: router.currentRoute.value.fullPath }
    })
    return
  }

  // 设置当前用户
  const currentUser = authHelperService?.getCurrentUser?.()
  if (currentUser) {
    userDataService.setCurrentUser(currentUser)
    await businessDataService.init(currentUser.id)
  }

  // 初始化默认数据
  await Promise.all([
    businessDataService.initDefaultProducts(),
    businessDataService.initDefaultCategories(),
    businessDataService.initDefaultInventory?.()
  ])

  // 加载所有数据
  await Promise.all([
    loadOverviewData(),
    loadRecentRecords(),
    loadCustomers(),
    loadProducts(),
    loadCategories(),
    loadInventoryData()
  ])
})
</script>

<style scoped>
/* 样式保持不变 */
.business {
  padding: 0;
  max-width: 100%;
}

:root {
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
  --income-color: #2ecc71;
  --expense-color: #e74c3c;
  --warning-color: #f39c12;
  --info-color: #3498db;
}

/* 快速记账卡片 */
.quick-record {
  display: flex;
  margin-bottom: 20px;
  margin-top: 20px;
  background-color: var(--white);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 5px 15px var(--shadow);
}

.quick-income, .quick-expense {
  flex: 1;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-income {
  background-color: rgba(46, 204, 113, 0.1);
}

.quick-expense {
  background-color: rgba(231, 76, 60, 0.1);
}

.quick-income:hover {
  background-color: rgba(46, 204, 113, 0.2);
}

.quick-expense:hover {
  background-color: rgba(231, 76, 60, 0.2);
}

.quick-icon {
  font-size: 30px;
  margin-bottom: 10px;
}

.quick-income .quick-icon {
  color: var(--income-color);
}

.quick-expense .quick-icon {
  color: var(--expense-color);
}

.quick-text {
  font-size: 16px;
  font-weight: 600;
}

.quick-income .quick-text {
  color: var(--income-color);
}

.quick-expense .quick-text {
  color: var(--expense-color);
}

/* 功能模块网格 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

.module-card {
  background-color: var(--white);
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 3px 10px var(--shadow);
  transition: all 0.3s;
  cursor: pointer;
  text-align: center;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px var(--shadow);
}

.module-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  font-size: 22px;
  color: white;
}

.module-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--accent-color);
}

.module-card p {
  font-size: 12px;
  color: var(--text-light);
  line-height: 1.4;
}

/* 数据概览 */
.overview-section {
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

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 15px;
  border-radius: 12px;
  text-align: center;
}

.stat-income {
  background-color: rgba(46, 204, 113, 0.1);
  border-left: 4px solid var(--income-color);
}

.stat-expense {
  background-color: rgba(231, 76, 60, 0.1);
  border-left: 4px solid var(--expense-color);
}

.stat-profit {
  background-color: rgba(52, 152, 219, 0.1);
  border-left: 4px solid var(--info-color);
}

.stat-debt {
  background-color: rgba(243, 156, 18, 0.1);
  border-left: 4px solid var(--warning-color);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-income .stat-value {
  color: var(--income-color);
}

.stat-expense .stat-value {
  color: var(--expense-color);
}

.stat-profit .stat-value {
  color: var(--info-color);
}

.stat-debt .stat-value {
  color: var(--warning-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-light);
}

/* 最近记录 */
.recent-records {
  margin-top: 20px;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(213, 235, 225, 0.5);
}

.record-item:last-child {
  border-bottom: none;
}

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
}

.record-income .record-icon {
  background-color: rgba(46, 204, 113, 0.2);
  color: var(--income-color);
}

.record-expense .record-icon {
  background-color: rgba(231, 76, 60, 0.2);
  color: var(--expense-color);
}

.record-info {
  flex: 1;
}

.record-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 3px;
}

.record-info p {
  font-size: 12px;
  color: var(--text-light);
}

.record-amount {
  font-weight: 600;
  font-size: 16px;
}

.record-income .record-amount {
  color: var(--income-color);
}

.record-expense .record-amount {
  color: var(--expense-color);
}

/* 响应式调整 */
@media (max-width: 400px) {
  .business {
    padding: 0;
  }

  .module-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .overview-stats {
    grid-template-columns: 1fr;
  }

  .quick-income, .quick-expense {
    padding: 15px;
  }

  .quick-icon {
    font-size: 24px;
  }

  .quick-text {
    font-size: 14px;
  }
}

@media (min-width: 500px) {
  .business {
    margin: 0;
    max-width: 100%;
  }
}
</style>