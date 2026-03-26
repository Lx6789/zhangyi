<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content customer-modal">
      <div class="modal-header customer-header">
        <i class="fas fa-users" style="color: #80A492;"></i>
        <h3>客户管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="customer-management">
          <!-- 搜索框 -->
          <div class="search-section">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                  v-model="searchKeyword"
                  type="text"
                  class="search-input"
                  :placeholder="`搜索客户名称、电话、类型...`"
              >
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button class="btn btn-primary" @click="openAddCustomerModal">
              <i class="fas fa-user-plus"></i> 新增客户
            </button>
          </div>

          <!-- 客户类型筛选 -->
          <div class="filter-section">
            <div
                v-for="type in customerTypes"
                :key="type"
                class="filter-chip"
                :class="{ active: selectedType === type }"
                @click="selectedType = type"
            >
              {{ type }}
            </div>
          </div>

          <!-- 客户列表 -->
          <div class="customer-list">
            <div v-if="loading" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>

            <div v-else-if="filteredCustomers.length === 0" class="empty-state">
              <i class="fas fa-user-friends"></i>
              <p>暂无客户</p>
              <button class="btn btn-primary" @click="openAddCustomerModal">
                添加第一个客户
              </button>
            </div>

            <div v-else class="customer-grid">
              <div v-for="customer in filteredCustomers" :key="customer.id" class="customer-card">
                <div class="customer-header">
                  <h4>{{ customer.name }}</h4>
                  <div class="customer-actions">
                    <button class="icon-btn edit" @click="editCustomer(customer)" title="编辑">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" @click="confirmDeleteCustomer(customer)" title="删除">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="customer-details">
                  <div class="detail-item">
                    <span class="detail-label">类型：</span>
                    <span class="detail-value">{{ customer.type || '零售客户' }}</span>
                  </div>
                  <div class="detail-item" v-if="customer.phone">
                    <span class="detail-label">电话：</span>
                    <span class="detail-value">{{ customer.phone }}</span>
                  </div>
                  <div class="detail-item" v-if="customer.address">
                    <span class="detail-label">地址：</span>
                    <span class="detail-value">{{ customer.address }}</span>
                  </div>

                  <!-- 赊账信息 -->
                  <div v-if="customer.creditInfo?.hasCredit" class="detail-item credit-info">
                    <span class="detail-label" style="color: #e74c3c;">赊账：</span>
                    <span class="detail-value" style="color: #e74c3c; font-weight: 600;">
                      ¥{{ formatNumber(customer.creditInfo.balance || 0) }}
                      <span v-if="customer.creditInfo.creditLimit">/ ¥{{ formatNumber(customer.creditInfo.creditLimit) }}</span>
                    </span>
                  </div>

                  <!-- 交易统计 -->
                  <div class="detail-item stats-info">
                    <span class="detail-label">交易：</span>
                    <span class="detail-value">{{ customer.stats?.transactionCount || 0 }}次</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">累计：</span>
                    <span class="detail-value price">¥{{ formatNumber(customer.stats?.totalAmount || 0) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">最近：</span>
                    <span class="detail-value">{{ formatDate(customer.stats?.lastTransactionDate) || '暂无' }}</span>
                  </div>

                  <!-- 快捷操作 -->
                  <div class="quick-actions">
                    <button class="quick-action-btn" @click="quickRecordIncome(customer)">
                      <i class="fas fa-money-bill-wave"></i> 记收入
                    </button>
                    <button class="quick-action-btn" @click="viewTransactions(customer)">
                      <i class="fas fa-history"></i> 记录
                    </button>
                    <button v-if="customer.creditInfo?.hasCredit && customer.creditInfo?.balance > 0" class="quick-action-btn repay" @click="recordRepayment(customer)">
                      <i class="fas fa-hand-holding-usd"></i> 还款
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 新增/编辑客户模态框 -->
  <div class="modal" :class="{ active: addEditModalVisible }" @click="closeAddEditOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas" :class="editingCustomerId ? 'fa-user-edit' : 'fa-user-plus'" style="color: #80A492;"></i>
        <h3>{{ editingCustomerId ? '编辑客户' : '新增客户' }}</h3>
        <button class="modal-close" @click="closeAddEditModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="saveCustomer">
          <!-- 基本信息 -->
          <div class="form-group">
            <label><i class="fas fa-user"></i> 客户名称 <span class="required">*</span></label>
            <input
                v-model="customerForm.name"
                type="text"
                class="form-input"
                placeholder="例如：张三 / 李四批发部"
                required
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-tag"></i> 客户类型</label>
              <select v-model="customerForm.type" class="form-select">
                <option value="零售客户">零售客户</option>
                <option value="批发客户">批发客户</option>
                <option value="长期客户">长期客户</option>
                <option value="单位客户">单位客户</option>
              </select>
            </div>

            <div class="form-group">
              <label><i class="fas fa-phone"></i> 联系电话</label>
              <input
                  v-model="customerForm.phone"
                  type="tel"
                  class="form-input"
                  placeholder="例如：13800138000"
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-map-marker-alt"></i> 地址</label>
            <input
                v-model="customerForm.address"
                type="text"
                class="form-input"
                placeholder="例如：XX省XX市XX区XX路XX号"
            >
          </div>

          <!-- 赊账信息 -->
          <div class="form-group">
            <label class="checkbox-label">
              <input class="checkbox" type="checkbox" v-model="customerForm.hasCredit">
              <i class="fas fa-credit-card"></i>
              <span>允许赊账</span>
            </label>
          </div>

          <div v-if="customerForm.hasCredit" class="credit-section">
            <div class="form-row">
              <div class="form-group">
                <label><i class="fas fa-coins"></i> 赊账额度 (元)</label>
                <div class="input-group">
                  <span class="input-prefix">¥</span>
                  <input
                      v-model="customerForm.creditLimit"
                      type="number"
                      class="form-input"
                      placeholder="例如：5000"
                      min="0"
                      step="100"
                  >
                </div>
              </div>

              <div class="form-group">
                <label><i class="fas fa-calendar-alt"></i> 结账周期 (天)</label>
                <div class="input-group">
                  <span class="input-prefix">天</span>
                  <input
                      v-model="customerForm.settlementDays"
                      type="number"
                      class="form-input"
                      placeholder="例如：30"
                      min="0"
                      step="1"
                  >
                </div>
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-sticky-note"></i> 赊账备注</label>
              <input
                  v-model="customerForm.creditNote"
                  type="text"
                  class="form-input"
                  placeholder="例如：每月1号结账"
              >
            </div>
          </div>

          <!-- 备注信息 -->
          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <textarea
                v-model="customerForm.note"
                class="form-input form-textarea"
                placeholder="其他需要记录的信息..."
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeAddEditModal">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> {{ editingCustomerId ? '保存修改' : '添加客户' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 交易记录模态框 -->
  <div class="modal" :class="{ active: transactionModalVisible }" @click="closeTransactionOnOverlay($event)">
    <div class="modal-content transaction-modal">
      <div class="modal-header">
        <i class="fas fa-history" style="color: #80A492;"></i>
        <h3>{{ selectedCustomer?.name }} - 往来记录</h3>
        <button class="modal-close" @click="transactionModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="transaction-management">
          <!-- 客户信息摘要 -->
          <div class="customer-summary">
            <div class="summary-item">
              <span class="summary-label">客户类型</span>
              <span class="summary-value">{{ selectedCustomer?.type || '零售客户' }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">累计消费</span>
              <span class="summary-value price">¥{{ formatNumber(selectedCustomer?.stats?.totalAmount || 0) }}</span>
            </div>
            <div v-if="selectedCustomer?.creditInfo?.hasCredit" class="summary-item">
              <span class="summary-label">当前欠款</span>
              <span class="summary-value warning">{{ formatNumber(selectedCustomer?.creditInfo?.balance || 0) }}</span>
            </div>
          </div>

          <!-- 时间筛选 -->
          <div class="date-filter">
            <select v-model="transactionDateRange" class="form-select">
              <option value="all">全部记录</option>
              <option value="month">最近一个月</option>
              <option value="quarter">最近三个月</option>
              <option value="year">最近一年</option>
            </select>
          </div>

          <!-- 交易记录列表 -->
          <div class="transactions-list">
            <div v-if="loadingTransactions" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>

            <div v-else-if="transactions.length === 0" class="empty-state">
              <i class="fas fa-receipt"></i>
              <p>暂无交易记录</p>
            </div>

            <div v-else class="transactions">
              <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item">
                <div class="transaction-icon" :class="transaction.type === '收入' ? 'income' : 'expense'">
                  <i :class="transaction.type === '收入' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                </div>
                <div class="transaction-info">
                  <div class="transaction-title">
                    {{ transaction.description || transaction.productName || '交易' }}
                    <span v-if="transaction.quantity" class="transaction-quantity">
                      ({{ transaction.quantity }}{{ transaction.unit }} × ¥{{ formatNumber(transaction.price) }})
                    </span>
                  </div>
                  <div class="transaction-meta">
                    <span class="transaction-date">{{ formatDate(transaction.date) }}</span>
                    <span class="transaction-method">{{ transaction.paymentMethod }}</span>
                  </div>
                  <div v-if="transaction.note" class="transaction-note">{{ transaction.note }}</div>
                </div>
                <div class="transaction-amount" :class="transaction.type === '收入' ? 'income' : 'expense'">
                  {{ transaction.type === '收入' ? '+' : '-' }}¥{{ formatNumber(transaction.amount) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 还款模态框 -->
  <div class="modal" :class="{ active: repaymentModalVisible }" @click="closeRepaymentOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-hand-holding-usd" style="color: #80A492;"></i>
        <h3>记录还款 - {{ selectedCustomer?.name }}</h3>
        <button class="modal-close" @click="repaymentModalVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="submitRepayment">
          <div class="form-group">
            <label>当前欠款</label>
            <div class="credit-info-panel">
              <div class="credit-info-row">
                <span class="credit-info-label">当前余额:</span>
                <span class="credit-info-value warning">¥{{ formatNumber(selectedCustomer?.creditInfo?.balance || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-yen-sign"></i> 还款金额 <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-prefix">¥</span>
              <input
                  v-model="repaymentForm.amount"
                  type="number"
                  class="form-input"
                  placeholder="例如：1000"
                  :max="selectedCustomer?.creditInfo?.balance"
                  min="0.01"
                  step="0.01"
                  required
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 还款日期</label>
            <input v-model="repaymentForm.date" type="date" class="form-input" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-credit-card"></i> 支付方式</label>
            <select v-model="repaymentForm.paymentMethod" class="form-select">
              <option value="现金">现金</option>
              <option value="微信">微信</option>
              <option value="支付宝">支付宝</option>
              <option value="银行卡">银行卡</option>
            </select>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <input v-model="repaymentForm.note" type="text" class="form-input" placeholder="例如：部分还款">
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="repaymentModalVisible = false">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> 确认还款
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 删除确认模态框 -->
  <div class="modal confirm-modal" :class="{ active: deleteConfirmVisible }" @click="closeConfirmOnOverlay($event)">
    <div class="modal-content small">
      <div class="confirm-header">
        <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
        <h3>确认删除</h3>
        <button class="modal-close" @click="deleteConfirmVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="confirm-body">
        <p>{{ deleteConfirmMessage }}</p>
        <p class="warning-text">此操作不可恢复！</p>
      </div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="deleteConfirmVisible = false">
          取消
        </button>
        <button class="btn btn-danger" @click="confirmDelete">
          <i class="fas fa-trash"></i> 确认删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import { notificationService } from "@/services/index.js"
import customerService from "@/services/api/business/customer.service.js"
import baseService from "@/services/api/business/base.service.js"

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'update', 'record-income'])

// ==================== 状态 ====================
const customers = ref([])
const searchKeyword = ref('')
const selectedType = ref('全部')
const loading = ref(false)
const customerTypes = ref([])

// 使用 computed 进行本地筛选（性能优化，避免频繁调用 API）
const filteredCustomers = computed(() => {
  // 调用 service 的本地筛选方法
  return customerService.filterCustomersLocal(customers.value, {
    type: selectedType.value,
    keyword: searchKeyword.value
  })
})

// 新增/编辑相关
const addEditModalVisible = ref(false)
const editingCustomerId = ref('')
const customerForm = reactive({
  name: '',
  type: '零售客户',
  phone: '',
  address: '',
  hasCredit: false,
  creditLimit: null,
  settlementDays: null,
  creditNote: '',
  note: ''
})

// 交易记录相关
const transactionModalVisible = ref(false)
const selectedCustomer = ref(null)
const transactions = ref([])
const transactionDateRange = ref('all')
const loadingTransactions = ref(false)

// 还款相关
const repaymentModalVisible = ref(false)
const repaymentForm = reactive({
  amount: '',
  date: dateHelper.getTodayString(),
  paymentMethod: '现金',
  note: ''
})

// 删除确认相关
const deleteConfirmVisible = ref(false)
const deleteConfirmMessage = ref('')
const deleteConfirmCustomer = ref(null)

// ==================== 方法 ====================

/**
 * 加载客户数据
 */
const loadCustomers = async () => {
  loading.value = true
  try {
    console.log('开始加载客户数据...')
    customers.value = await customerService.getAllCustomers()
    console.log('加载到的客户数量:', customers.value.length)
  } catch (error) {
    console.error('加载客户失败:', error)
    notificationService.showNotification('加载客户失败', 'error')
  } finally {
    loading.value = false
  }
}

/**
 * 打开新增客户模态框
 */
const openAddCustomerModal = () => {
  editingCustomerId.value = ''
  customerForm.name = ''
  customerForm.type = '零售客户'
  customerForm.phone = ''
  customerForm.address = ''
  customerForm.hasCredit = false
  customerForm.creditLimit = null
  customerForm.settlementDays = null
  customerForm.creditNote = ''
  customerForm.note = ''
  addEditModalVisible.value = true
}

/**
 * 编辑客户
 */
const editCustomer = (customer) => {
  editingCustomerId.value = customer.id
  customerForm.name = customer.name
  customerForm.type = customer.type || '零售客户'
  customerForm.phone = customer.phone || ''
  customerForm.address = customer.address || ''
  customerForm.hasCredit = customer.creditInfo?.hasCredit || false
  customerForm.creditLimit = customer.creditInfo?.creditLimit || null
  customerForm.settlementDays = customer.creditInfo?.settlementDays || null
  customerForm.creditNote = customer.creditInfo?.note || ''
  customerForm.note = customer.note || ''
  addEditModalVisible.value = true
}

/**
 * 保存客户
 */
const saveCustomer = async () => {
  if (!customerForm.name) {
    notificationService.showNotification('请输入客户名称', 'error')
    return
  }

  try {
    if (editingCustomerId.value) {
      await customerService.updateCustomer(editingCustomerId.value, customerForm)
      notificationService.showNotification('客户信息更新成功', 'success')
    } else {
      await customerService.addCustomer(customerForm)
      notificationService.showNotification('客户添加成功', 'success')
    }

    await loadCustomers()
    emit('update')
    closeAddEditModal()
  } catch (error) {
    console.error('保存客户失败:', error)
    notificationService.showNotification(error.message || '保存客户失败', 'error')
  }
}

/**
 * 确认删除客户
 */
const confirmDeleteCustomer = (customer) => {
  deleteConfirmMessage.value = `确定要删除客户 "${customer.name}" 吗？`
  deleteConfirmCustomer.value = customer
  deleteConfirmVisible.value = true
}

/**
 * 执行删除
 */
const confirmDelete = async () => {
  if (!deleteConfirmCustomer.value) return

  try {
    await customerService.deleteCustomer(deleteConfirmCustomer.value.id)
    await loadCustomers()
    emit('update')
    notificationService.showNotification('客户删除成功', 'success')
  } catch (error) {
    console.error('删除客户失败:', error)
    notificationService.showNotification(error.message || '删除客户失败', 'error')
  } finally {
    deleteConfirmVisible.value = false
    deleteConfirmCustomer.value = null
  }
}

/**
 * 快速记账
 */
const quickRecordIncome = (customer) => {
  emit('record-income', customer)
  close()
}

/**
 * 查看交易记录
 */
const viewTransactions = async (customer) => {
  selectedCustomer.value = customer
  await loadCustomerTransactions(customer.id)
  transactionModalVisible.value = true
}

/**
 * 加载客户交易记录
 */
const loadCustomerTransactions = async (customerId) => {
  loadingTransactions.value = true
  try {
    transactions.value = await customerService.getCustomerTransactions(customerId, transactionDateRange.value)
  } catch (error) {
    console.error('加载客户交易记录失败:', error)
    notificationService.showNotification('加载交易记录失败', 'error')
  } finally {
    loadingTransactions.value = false
  }
}

/**
 * 记录还款
 */
const recordRepayment = (customer) => {
  selectedCustomer.value = customer
  repaymentForm.amount = ''
  repaymentForm.date = dateHelper.getTodayString()
  repaymentForm.paymentMethod = '现金'
  repaymentForm.note = ''
  repaymentModalVisible.value = true
}

/**
 * 提交还款
 */
const submitRepayment = async () => {
  if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
    notificationService.showNotification('请输入有效的还款金额', 'error')
    return
  }

  if (parseFloat(repaymentForm.amount) > (selectedCustomer.value.creditInfo?.balance || 0)) {
    notificationService.showNotification('还款金额不能大于当前欠款', 'error')
    return
  }

  try {
    await customerService.recordCustomerRepayment(selectedCustomer.value.id, {
      amount: repaymentForm.amount,
      date: repaymentForm.date,
      paymentMethod: repaymentForm.paymentMethod,
      note: repaymentForm.note
    })

    await loadCustomers()
    emit('update')
    repaymentModalVisible.value = false
    notificationService.showNotification('还款记录成功', 'success')
  } catch (error) {
    console.error('记录还款失败:', error)
    notificationService.showNotification(error.message || '记录还款失败', 'error')
  }
}

/**
 * 关闭主模态框
 */
const close = () => {
  emit('update:visible', false)
}

/**
 * 关闭新增/编辑模态框
 */
const closeAddEditModal = () => {
  addEditModalVisible.value = false
  editingCustomerId.value = ''
}

/**
 * 点击遮罩层关闭
 */
const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

const closeAddEditOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    closeAddEditModal()
  }
}

const closeTransactionOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    transactionModalVisible.value = false
  }
}

const closeRepaymentOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    repaymentModalVisible.value = false
  }
}

const closeConfirmOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    deleteConfirmVisible.value = false
  }
}

// ==================== 格式化工具函数（委托给 service） ====================

/**
 * 格式化数字金额
 */
const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateHelper.formatDate(dateStr)
}

// ==================== 监听器 ====================

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadCustomers()
  }
})

// 监听筛选条件变化（computed 会自动响应，无需手动调用）
watch(transactionDateRange, () => {
  if (transactionModalVisible.value && selectedCustomer.value) {
    loadCustomerTransactions(selectedCustomer.value.id)
  }
})

// ==================== 初始化 ====================
onMounted(async () => {
  // 从 service 获取客户类型列表
  customerTypes.value = customerService.getCustomerTypes()

  if (props.visible) {
    loadCustomers()
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
  padding: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.customer-modal {
  max-width: 900px;
}

.modal-content.transaction-modal {
  max-width: 700px;
}

.modal-content.small {
  max-width: 400px;
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
  border-radius: 20px 20px 0 0;
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

.customer-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

/* ==================== 客户管理样式 ==================== */
.customer-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 搜索框 */
.search-section {
  margin-bottom: 5px;
}

.search-box {
  position: relative;
}

.search-box i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #99BCAC;
  z-index: 1;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 15px 14px 45px;
  border: 1px solid #B1D5C8;
  border-radius: 30px;
  font-size: 15px;
  background-color: white;
  box-sizing: border-box;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.search-input::placeholder {
  color: #999;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 15px;
  margin-bottom: 5px;
}

.btn {
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover {
  background-color: #B1D5C8;
}

.btn-secondary {
  background-color: white;
  color: #80A492;
  border: 1px solid #B1D5C8;
}

.btn-secondary:hover {
  background-color: #f8fafc;
  border-color: #80A492;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

/* 筛选标签 */
.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 15px;
  border-bottom: 1px solid #D5EBE1;
}

.filter-chip {
  padding: 8px 18px;
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 30px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-chip:hover {
  background-color: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

.filter-chip.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

/* 客户网格 */
.customer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding: 5px;
}

.customer-card {
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
  transition: all 0.3s;
}

.customer-card:hover {
  box-shadow: 0 5px 15px rgba(128, 164, 146, 0.1);
  transform: translateY(-2px);
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.customer-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.customer-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
}

.icon-btn.edit {
  color: #3498db;
}

.icon-btn.edit:hover {
  background-color: rgba(52, 152, 219, 0.1);
}

.icon-btn.delete {
  color: #e74c3c;
}

.icon-btn.delete:hover {
  background-color: rgba(231, 76, 60, 0.1);
}

.customer-details {
  font-size: 13px;
}

.detail-item {
  margin-bottom: 8px;
  display: flex;
}

.detail-label {
  color: #999;
  width: 70px;
  flex-shrink: 0;
  font-size: 13px;
}

.detail-value {
  color: #333;
  flex: 1;
  font-weight: 500;
}

.detail-value.price {
  color: #2ecc71;
  font-weight: 600;
}

.credit-info .detail-value {
  color: #e74c3c !important;
  font-weight: 600;
}

.stats-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #D5EBE1;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.quick-action-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #B1D5C8;
  border-radius: 20px;
  background: none;
  color: #80A492;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.quick-action-btn:hover {
  background-color: #D5EBE1;
}

.quick-action-btn.repay {
  color: #e74c3c;
  border-color: #e74c3c;
}

.quick-action-btn.repay:hover {
  background-color: rgba(231, 76, 60, 0.1);
}

/* ==================== 表单样式 ==================== */
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

.form-group label i {
  margin-right: 8px;
  width: 20px;
  color: #99BCAC;
}

.required {
  color: #e74c3c;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  transition: all 0.3s;
  background-color: white;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-select {
  width: 100%;
  padding: 12px 35px 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2380A492' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.form-select:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

/* 复选框样式 */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 15px;
  background: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
  transition: all 0.3s;
  font-size: 14px;
  color: #80A492;
}

.checkbox-label:hover {
  background: #f8fafc;
  border-color: #80A492;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #80A492;
}

.checkbox-label i {
  color: #99BCAC;
}

/* 输入组样式 */
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
  height: 46px;
  display: flex;
  align-items: center;
  border-right: 1px solid #B1D5C8;
}

.input-group .form-input {
  flex: 1;
  border: none;
  border-radius: 0;
}

.input-group .form-input:focus {
  box-shadow: none;
}

/* 赊账信息卡片 */
.credit-section {
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
  margin-bottom: 20px;
}

.credit-info-panel {
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.credit-info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.credit-info-row:last-child {
  margin-bottom: 0;
}

.credit-info-label {
  width: 80px;
  color: #666;
}

.credit-info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.credit-info-value.warning {
  color: #e74c3c;
  font-weight: 600;
  font-size: 18px;
}

/* ==================== 交易记录样式 ==================== */
.transaction-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.customer-summary {
  display: flex;
  gap: 15px;
  margin-bottom: 5px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.summary-value.price {
  color: #2ecc71;
}

.summary-value.warning {
  color: #e74c3c;
}

.date-filter {
  margin-bottom: 5px;
}

.transactions {
  max-height: 400px;
  overflow-y: auto;
  padding: 5px;
}

.transaction-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #D5EBE1;
  gap: 12px;
  transition: all 0.3s;
}

.transaction-item:hover {
  background-color: #f8fafc;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transaction-icon.income {
  background-color: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.transaction-icon.expense {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.transaction-info {
  flex: 1;
}

.transaction-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.transaction-quantity {
  font-size: 12px;
  color: #999;
  font-weight: normal;
  margin-left: 4px;
}

.transaction-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.transaction-note {
  font-size: 11px;
  color: #999;
  font-style: italic;
}

.transaction-amount {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.transaction-amount.income {
  color: #2ecc71;
}

.transaction-amount.expense {
  color: #e74c3c;
}

/* ==================== 空状态和加载状态 ==================== */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.empty-state i {
  font-size: 56px;
  color: #99BCAC;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 16px;
}

.loading-state {
  text-align: center;
  padding: 50px 20px;
  color: #999;
}

.loading-state i {
  font-size: 48px;
  color: #80A492;
  margin-bottom: 16px;
}

.loading-state p {
  font-size: 16px;
}

/* ==================== 确认模态框样式 ==================== */
.confirm-modal .modal-content {
  text-align: center;
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 25px;
  border-bottom: 1px solid #D5EBE1;
}

.confirm-header i {
  font-size: 28px;
  color: #e74c3c;
}

.confirm-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.confirm-body {
  padding: 25px;
}

.confirm-body p {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.warning-text {
  color: #e74c3c !important;
  font-size: 14px !important;
  font-weight: 500;
}

.confirm-actions {
  display: flex;
  gap: 15px;
  padding: 0 25px 25px;
}

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar,
.customer-grid::-webkit-scrollbar,
.transactions::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track,
.customer-grid::-webkit-scrollbar-track,
.transactions::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.customer-grid::-webkit-scrollbar-thumb,
.transactions::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.customer-grid::-webkit-scrollbar-thumb:hover,
.transactions::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

.checkbox {
  margin-right: 25px;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .customer-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .customer-summary {
    flex-direction: column;
    gap: 10px;
  }

  .form-row {
    flex-direction: column;
    gap: 10px;
  }

  .quick-actions {
    flex-wrap: wrap;
  }

  .quick-action-btn {
    flex: 1 1 calc(50% - 4px);
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 15px 20px;
  }

  .modal-header h3 {
    font-size: 18px;
  }

  .modal-body {
    padding: 20px;
  }

  .filter-section {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .filter-chip {
    flex-shrink: 0;
  }

  .transaction-item {
    flex-wrap: wrap;
  }

  .transaction-amount {
    width: 100%;
    text-align: right;
    margin-top: 5px;
  }

  .confirm-actions {
    flex-direction: column;
  }
}
</style>