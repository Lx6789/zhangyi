<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content income-modal">
      <div class="modal-header income-header">
        <i class="fas fa-money-bill-wave" style="color: #80A492;"></i>
        <h3>收入记账</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="submitForm">
          <!-- 商品分类 -->
          <div class="form-group">
            <div class="label-with-action">
              <label><i class="fas fa-tag"></i> 商品分类</label>
              <button type="button" class="icon-btn small" @click="openCategoryManagement">
                <i class="fas fa-cog"></i>
              </button>
            </div>

            <div class="category-tags" v-if="categoryNames.length === 0">
              <div class="empty-tags">
                <span>暂无分类，请先</span>
                <button type="button" class="text-link" @click="openCategoryManagement">添加分类</button>
              </div>
            </div>
            <div class="category-tags" v-else>
              <div
                  v-for="category in categoryNames"
                  :key="category"
                  class="category-tag"
                  :class="{ active: form.category === category }"
                  @click="form.category = category"
              >
                {{ category }}
              </div>
            </div>
          </div>

          <!-- 商品选择 -->
          <div class="form-group" v-if="form.category">
            <label><i class="fas fa-box"></i> 选择商品</label>
            <div class="custom-select-display" @click="openProductSelector">
              <span :class="{ placeholder: !form.productId }">
                {{ getProductDisplayText() }}
              </span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <button type="button" class="photo-btn" @click="openQuickAddProduct">
              <i class="fas fa-plus-circle"></i> 添加新商品
            </button>
          </div>

          <!-- 销售渠道 -->
          <div class="form-group">
            <label><i class="fas fa-store"></i> 销售渠道</label>
            <div class="custom-select-display" @click="openChannelSelector">
              <span :class="{ placeholder: !form.channel }">
                {{ getChannelDisplayText() }}
              </span>
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>

          <!-- 批发库存信息 -->
          <div v-if="form.channel === '批发' && selectedProduct && currentInventory" class="inventory-info-panel">
            <div class="inventory-header">
              <i class="fas fa-boxes"></i>
              <span>库存信息 - {{ selectedProduct.name }}</span>
            </div>

            <div class="inventory-stats">
              <div class="inventory-stat-item" :class="{ 'low-stock': isLowStock }">
                <span class="stat-label">当前库存</span>
                <span class="stat-value">{{ formatQuantity(currentInventory.quantity) }} {{ currentInventory.unit }}</span>
                <span v-if="isLowStock" class="low-stock-badge">库存紧张</span>
              </div>
              <div class="inventory-stat-item" v-if="currentInventory.minStock">
                <span class="stat-label">最低库存</span>
                <span class="stat-value">{{ currentInventory.minStock }} {{ currentInventory.unit }}</span>
              </div>
              <div class="inventory-stat-item" v-if="currentInventory.costPrice">
                <span class="stat-label">成本价</span>
                <span class="stat-value price">¥{{ formatNumber(currentInventory.costPrice) }}</span>
              </div>
              <div class="inventory-stat-item" v-if="currentInventory.sellingPrice">
                <span class="stat-label">建议售价</span>
                <span class="stat-value price">¥{{ formatNumber(currentInventory.sellingPrice) }}</span>
              </div>
            </div>

            <div v-if="currentInventory.expiryDate" class="expiry-info" :class="getExpiryStatusClass">
              <i class="fas" :class="getExpiryIcon"></i>
              <span>
                保质期至: {{ formatDate(currentInventory.expiryDate) }}
                <span v-if="isExpiringSoon" class="expiry-badge warning-badge">即将过期</span>
                <span v-if="isExpired" class="expiry-badge expired-badge">已过期</span>
              </span>
            </div>

            <div v-if="form.quantity && parseFloat(form.quantity) > currentInventory.quantity" class="stock-warning">
              <i class="fas fa-exclamation-circle"></i>
              <span>销售数量超过当前库存！</span>
            </div>

            <div class="inventory-actions">
              <label class="checkbox-label">
                <input type="checkbox" v-model="autoUpdateInventory">
                <span>销售后自动扣减库存</span>
              </label>
            </div>
          </div>

          <!-- 客户 -->
          <div class="form-group">
            <div class="label-with-action">
              <label><i class="fas fa-user-tie"></i> 客户名称</label>
              <button type="button" class="icon-btn small" @click="openCustomerManagement">
                <i class="fas fa-users-cog"></i>
              </button>
            </div>
            <div class="custom-select-display" @click="openCustomerSelector">
              <span :class="{ placeholder: !form.customerId }">
                {{ getCustomerDisplayText() }}
              </span>
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>

          <!-- 数量 & 单价 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-weight"></i> 数量</label>
              <input
                  v-model="form.quantity"
                  type="number"
                  class="form-input"
                  placeholder="例如：10"
                  min="0.1"
                  step="0.1"
                  required
                  @input="validateQuantity"
              >
              <div v-if="form.channel === '批发' && currentInventory" class="quantity-hint">
                最大可售: {{ currentInventory.quantity }} {{ currentInventory.unit }}
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-yen-sign"></i> 单价 (元)</label>
              <input v-model="form.price" type="number" class="form-input" placeholder="例如：15" min="0.01" step="0.01" required>
            </div>
          </div>

          <!-- 单位 -->
          <div class="form-group">
            <label><i class="fas fa-balance-scale"></i> 单位</label>
            <div class="custom-select-display" @click="openUnitSelector">
              <span>{{ form.unit || '斤' }}</span>
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>

          <!-- 收款方式 -->
          <div class="form-group">
            <label><i class="fas fa-wallet"></i> 收款方式</label>
            <div class="payment-tags">
              <div
                  v-for="method in filteredPaymentMethods"
                  :key="method.value"
                  class="payment-tag"
                  :class="{ active: form.paymentMethod === method.value, disabled: method.disabled }"
                  @click="selectPaymentMethod(method)"
              >
                {{ method.label }}
                <span v-if="method.disabled" class="disabled-tag">(不可用)</span>
              </div>
            </div>

            <div v-if="selectedCustomer && !selectedCustomer.creditInfo?.hasCredit && form.paymentMethod === '赊账'" class="warning-message">
              <i class="fas fa-exclamation-circle"></i> 该客户不允许赊账
            </div>

            <div v-if="form.paymentMethod === '赊账' && selectedCustomer?.creditInfo?.hasCredit" class="edit-form">
              <div class="credit-info-panel">
                <div class="credit-info-row">
                  <span class="credit-info-label">信用额度：</span>
                  <span class="credit-info-value">¥{{ formatNumber(selectedCustomer.creditInfo.creditLimit) }}</span>
                </div>
                <div class="credit-info-row">
                  <span class="credit-info-label">当前欠款：</span>
                  <span class="credit-info-value warning">¥{{ formatNumber(selectedCustomer.creditInfo.balance || 0) }}</span>
                </div>
              </div>
              <div class="form-group">
                <label><i class="fas fa-calendar-check"></i> 预计还款日期</label>
                <div class="input-wrapper" @click="openRepayDatePicker">
                  <input
                      v-model="form.expectedRepayDate"
                      type="text"
                      class="form-input"
                      placeholder="点击选择日期"
                      readonly
                  >
                </div>
              </div>
              <div class="form-group">
                <label><i class="fas fa-sticky-note"></i> 赊账备注</label>
                <input v-model="form.creditNote" type="text" class="form-input" placeholder="例如：月底结账">
              </div>
            </div>
          </div>

          <!-- 日期 & 备注 -->
          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 日期</label>
            <div class="input-wrapper" @click="openDatePicker">
              <input
                  v-model="form.date"
                  type="text"
                  class="form-input"
                  placeholder="点击选择日期"
                  readonly
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注 (可选)</label>
            <textarea v-model="form.note" class="form-input form-textarea" placeholder="记录更多细节..."></textarea>
          </div>

          <!-- 按钮 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="close">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitDisabled">
              <i class="fas fa-check"></i> 记录收入
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 快速添加商品 -->
  <QuickAddProductModal
      v-model:visible="quickAddModalVisible"
      :categories="categories"
      @success="handleQuickAddProductSuccess"
      @open-category="openCategoryManagement"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import userDataService from '@/services/user-data.service.js'
import QuickAddProductModal from './QuickAddProductModal.vue'
import { notificationService } from "@/services/index.js"
import incomeService from "@/services/api/business/income.service.js";
import baseService from "@/services/api/business/base.service.js";
import inventoryService from "@/services/api/business/inventory.service.js";

const props = defineProps({
  visible: { type: Boolean, default: false },
  customers: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'success', 'open-customer', 'open-category', 'refresh-products'])

// ==================== 常量 ====================
const paymentMethods = incomeService.getPaymentMethods()

// 销售渠道选项
const channelOptions = [
  { value: '门店零售', label: '门店零售', icon: '🏪' },
  { value: '批发', label: '批发', icon: '📦' },
  { value: '线上订单', label: '线上订单', icon: '📱' },
  { value: '外卖平台', label: '外卖平台', icon: '🛵' },
  { value: '集市摆摊', label: '集市摆摊', icon: '🏮' },
  { value: '单位团购', label: '单位团购', icon: '🏢' },
  { value: '其他', label: '其他', icon: '📝' }
]

// 单位选项
const unitOptions = [
  { value: '斤', label: '斤', icon: '⚖️' },
  { value: '公斤', label: '公斤', icon: '⚖️' },
  { value: '个', label: '个', icon: '🔢' },
  { value: '份', label: '份', icon: '🍽️' },
  { value: '箱', label: '箱', icon: '📦' },
  { value: '袋', label: '袋', icon: '🎒' }
]

// ==================== 状态 ====================
const quickAddModalVisible = ref(false)
const autoUpdateInventory = ref(true)
const inventoryData = ref([])

const form = reactive({
  category: '',
  productId: '',
  channel: '',
  customerId: '',
  quantity: '',
  price: '',
  unit: '斤',
  paymentMethod: '现金',
  date: dateHelper.getTodayString(),
  note: '',
  expectedRepayDate: dateHelper.addDays(dateHelper.getTodayString(), 30),
  creditNote: ''
})

const selectedProduct = ref(null)

// ==================== 计算属性 ====================
const categoryNames = computed(() => props.categories.map(c => c.name).sort())

const filteredProducts = computed(() => {
  if (!form.category) return []
  return props.products.filter(p => p.category === form.category)
})

const selectedCustomer = computed(() => {
  if (!form.customerId) return null
  return props.customers.find(c => c.id === form.customerId)
})

const currentInventory = computed(() => {
  if (!selectedProduct.value) return null
  return inventoryData.value.find(item => item.productId === selectedProduct.value.id)
})

const isLowStock = computed(() => {
  if (!currentInventory.value) return false
  return currentInventory.value.quantity <= (currentInventory.value.minStock || 10)
})

const expiryStatus = computed(() => {
  if (!currentInventory.value?.expiryDate) return null
  return inventoryService.getExpiryStatus(currentInventory.value.expiryDate)
})

const isExpiringSoon = computed(() => expiryStatus.value?.status === 'expiring')
const isExpired = computed(() => expiryStatus.value?.status === 'expired')

const getExpiryStatusClass = computed(() => {
  if (isExpired.value) return 'expired'
  if (isExpiringSoon.value) return 'expiring'
  return ''
})

const getExpiryIcon = computed(() => expiryStatus.value?.icon || 'fa-check-circle')

const isSubmitDisabled = computed(() => {
  if (form.channel === '批发' && currentInventory.value && form.quantity) {
    return parseFloat(form.quantity) > currentInventory.value.quantity
  }
  return false
})

const filteredPaymentMethods = computed(() => {
  const methods = [...paymentMethods]
  const canCredit = incomeService.canCustomerUseCredit(selectedCustomer.value)
  methods.forEach(m => {
    if (m.value === '赊账') m.disabled = !canCredit
  })
  return methods
})

// ==================== 自定义选择器方法 ====================

/**
 * 获取商品显示文本
 */
const getProductDisplayText = () => {
  if (!form.productId) return '请选择商品'
  const product = props.products.find(p => p.id === form.productId)
  return product ? `${product.name} (${product.unit})` : '请选择商品'
}

/**
 * 打开商品选择器
 */
const openProductSelector = async () => {
  if (!form.category) {
    notificationService.showNotification('请先选择商品分类', 'warning')
    return
  }

  const products = filteredProducts.value
  if (products.length === 0) {
    notificationService.showNotification('该分类下暂无商品，请先添加', 'warning')
    return
  }

  const items = products.map(product => ({
    value: product.id,
    label: `${product.name} (${product.unit})`,
    icon: '📦'
  }))

  const selected = await notificationService.selectList({
    title: `选择商品 - ${form.category}`,
    items: items,
    cancelText: '取消'
  })

  if (selected) {
    form.productId = selected
    onProductSelected()
  }
}

/**
 * 获取销售渠道显示文本
 */
const getChannelDisplayText = () => {
  if (!form.channel) return '选择销售渠道'
  const option = channelOptions.find(opt => opt.value === form.channel)
  return option ? `${option.icon} ${option.label}` : form.channel
}

/**
 * 打开销售渠道选择器
 */
const openChannelSelector = async () => {
  const items = channelOptions.map(opt => ({
    value: opt.value,
    label: `${opt.icon} ${opt.label}`,
    icon: opt.icon
  }))

  const selected = await notificationService.selectList({
    title: '选择销售渠道',
    items: items,
    cancelText: '取消'
  })

  if (selected) {
    form.channel = selected
    onChannelChange()
  }
}

/**
 * 获取客户显示文本
 */
const getCustomerDisplayText = () => {
  if (!form.customerId) return '散客/无记录'
  const customer = props.customers.find(c => c.id === form.customerId)
  if (!customer) return '散客/无记录'
  let text = customer.name
  if (customer.type) text += ` (${customer.type})`
  if (customer.creditInfo?.balance > 0) text += ` 赊账: ¥${formatNumber(customer.creditInfo.balance)}`
  return text
}

/**
 * 打开客户选择器
 */
const openCustomerSelector = async () => {
  const customers = props.customers
  const items = [
    { value: '', label: '散客/无记录', icon: '👤' },
    ...customers.map(customer => {
      let label = customer.name
      if (customer.type) label += ` (${customer.type})`
      if (customer.creditInfo?.balance > 0) label += ` 赊账: ¥${formatNumber(customer.creditInfo.balance)}`
      return {
        value: customer.id,
        label: label,
        icon: customer.type === '批发客户' ? '🏪' : '👤'
      }
    })
  ]

  const selected = await notificationService.selectList({
    title: '选择客户',
    items: items,
    cancelText: '取消'
  })

  if (selected !== undefined && selected !== null) {
    form.customerId = selected
    onCustomerChange()
  }
}

/**
 * 打开单位选择器
 */
const openUnitSelector = async () => {
  const items = unitOptions.map(opt => ({
    value: opt.value,
    label: `${opt.icon} ${opt.label}`,
    icon: opt.icon
  }))

  const selected = await notificationService.selectList({
    title: '选择单位',
    items: items,
    cancelText: '取消'
  })

  if (selected) {
    form.unit = selected
  }
}

// ==================== 原有方法 ====================
const openDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择日期',
    defaultDate: form.date || new Date()
  })
  if (date) {
    form.date = date
  }
}

const openRepayDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择预计还款日期',
    defaultDate: form.expectedRepayDate || new Date()
  })
  if (date) {
    form.expectedRepayDate = date
  }
}

const loadInventoryData = async () => {
  try {
    inventoryData.value = await businessDataService.getAllInventory()
  } catch (e) { console.error('加载库存失败', e) }
}

const onChannelChange = () => {
  if (form.channel === '批发') loadInventoryData()
}

const onProductSelected = () => {
  if (!form.productId) {
    selectedProduct.value = null
    form.price = ''
    form.unit = '斤'
    return
  }
  const p = props.products.find(x => x.id === form.productId)
  if (p) {
    selectedProduct.value = p
    form.unit = p.unit || '斤'
    form.price = incomeService.getSuggestedPrice(p, currentInventory.value) || ''
  }
}

const onCustomerChange = () => {
  // 客户变化时的处理
}

const validateQuantity = () => {}
const selectPaymentMethod = (method) => {
  if (method.disabled) {
    notificationService.showNotification('该客户不允许赊账', 'error')
    return
  }
  form.paymentMethod = method.value
}

const openCategoryManagement = () => emit('open-category')
const openCustomerManagement = () => emit('open-customer')

const openQuickAddProduct = () => {
  quickAddModalVisible.value = true
}

const handleQuickAddProductSuccess = () => {
  quickAddModalVisible.value = false
  emit('refresh-products')
}

const submitForm = async () => {
  const valid = incomeService.validateIncomeForm(form, selectedProduct.value, selectedCustomer.value)
  if (!valid.valid) {
    notificationService.showNotification(valid.errors.join('，'), 'error')
    return
  }

  if (form.channel === '批发' && currentInventory.value && form.quantity) {
    const q = parseFloat(form.quantity)
    if (q > currentInventory.value.quantity) {
      const confirmed = await notificationService.confirm('销售数量超过库存，确定继续？')
      if (!confirmed) return
    }
  }

  try {
    const total = incomeService.calculateIncomeTotal(form.quantity, form.price)
    let customer = selectedCustomer.value

    if (form.paymentMethod === '赊账' && customer) {
      customer = await incomeService.updateCustomerCreditBalance(customer, total)
    }

    const record = incomeService.createIncomeRecord(
        { ...form, autoUpdateInventory: autoUpdateInventory.value },
        selectedProduct.value,
        customer,
        total
    )

    await businessDataService.addIncomeRecord(record)

    if (form.channel === '批发' && autoUpdateInventory.value && selectedProduct.value) {
      const items = await businessDataService.getInventoryByProductId(selectedProduct.value.id)
      if (items.length) {
        const update = incomeService.processWholesaleStockUpdate(items[0], form.quantity)
        await businessDataService.updateInventoryItem(update.id, update)
      }
    }

    emit('success')
    close()
    notificationService.showNotification(`收入记录成功 ¥${total}`, 'success')
  } catch (e) {
    console.error(e)
    notificationService.showNotification('保存失败', 'error')
  }
}

const resetForm = () => {
  form.category = ''
  form.productId = ''
  form.channel = ''
  form.customerId = ''
  form.quantity = ''
  form.price = ''
  form.unit = '斤'
  form.paymentMethod = '现金'
  form.date = dateHelper.getTodayString()
  form.note = ''
  selectedProduct.value = null
}

const close = () => {
  resetForm()
  emit('update:visible', false)
}

const closeOnOverlay = e => {
  if (e.target.classList.contains('modal')) close()
}

// 工具函数
const formatNumber = num => baseService.formatNumber(num)
const formatDate = str => dateHelper.formatDate(str)
const formatQuantity = q => q?.toFixed(1) || 0

// 监听
watch(() => props.visible, val => {
  if (val) loadInventoryData()
})

watch(() => form.category, () => {
  form.productId = ''
  selectedProduct.value = null
})
</script>

<style scoped>
/* 样式已统一整洁优化 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
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
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

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
  color: #80A492;
  flex: 1;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
}

.modal-close:hover {
  background: #D5EBE1;
  color: #80A492;
}

.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #80A492;
  margin-bottom: 8px;
}

.form-group label i {
  margin-right: 8px;
  width: 20px;
  color: #99BCAC;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  transition: 0.3s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128,164,146,0.2);
}

/* 自定义选择器显示样式 */
.custom-select-display {
  width: 100%;
  padding: 12px 35px 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s;
  box-sizing: border-box;
}
.custom-select-display:hover {
  border-color: #80A492;
  background-color: rgba(128,164,146,0.05);
}
.custom-select-display .placeholder {
  color: #999;
  opacity: 0.7;
}
.custom-select-display i {
  color: #80A492;
  font-size: 14px;
  transition: transform 0.3s;
}
.custom-select-display:hover i {
  transform: translateY(2px);
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
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

.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-primary {
  background: #D5EBE1;
  color: #80A492;
}
.btn-primary:hover:not(:disabled) {
  background: #B1D5C8;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-secondary {
  background: white;
  color: #80A492;
  border: 1px solid #B1D5C8;
}
.btn-secondary:hover {
  background: #f8fafc;
  border-color: #80A492;
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.icon-btn.small {
  width: 32px;
  height: 32px;
  background: #D5EBE1;
  color: #80A492;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.icon-btn.small:hover {
  background: #B1D5C8;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}
.category-tag {
  padding: 8px 16px;
  background: #D5EBE1;
  border-radius: 30px;
  font-size: 13px;
  color: #80A492;
  cursor: pointer;
  transition: 0.3s;
  border: 1px solid transparent;
}
.category-tag:hover {
  background: #B1D5C8;
}
.category-tag.active {
  background: #80A492;
  color: white;
}

.empty-tags {
  padding: 20px;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  color: #666;
  border: 1px dashed #D5EBE1;
}
.text-link {
  background: none;
  border: none;
  color: #80A492;
  text-decoration: underline;
  cursor: pointer;
}

.photo-btn {
  width: 100%;
  padding: 14px;
  border: 2px dashed #D5EBE1;
  border-radius: 12px;
  background: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}
.photo-btn:hover {
  border-color: #80A492;
  color: #80A492;
  background: rgba(128,164,146,0.05);
}

.inventory-info-panel {
  margin: 15px 0;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}
.inventory-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #D5EBE1;
  color: #80A492;
  font-weight: 600;
  font-size: 14px;
}
.inventory-stats {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 10px;
}
.inventory-stat-item {
  padding: 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid #D5EBE1;
}
.inventory-stat-item.low-stock {
  border-color: #f39c12;
  background: rgba(243,156,18,0.05);
}
.stat-label {
  display: block;
  font-size: 11px;
  color: #999;
}
.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.stat-value.price {
  color: #2ecc71;
}
.low-stock-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 6px;
  background: #f39c12;
  color: white;
  font-size: 10px;
  border-radius: 12px;
}

.expiry-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  margin: 10px 0;
  font-size: 13px;
}
.expiry-info.expiring {
  background: rgba(243,156,18,0.1);
  color: #f39c12;
}
.expiry-info.expired {
  background: rgba(231,76,60,0.1);
  color: #e74c3c;
}
.expiry-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  color: white;
  margin-left: 6px;
}
.warning-badge {
  background: #f39c12;
}
.expired-badge {
  background: #e74c3c;
}

.stock-warning {
  margin: 10px 0;
  padding: 10px;
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.2);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  text-align: right;
}
.inventory-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #D5EBE1;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}
.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #80A492;
}

.payment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}
.payment-tag {
  flex: 1;
  min-width: 70px;
  padding: 10px 12px;
  background: white;
  border: 1px solid #D5EBE1;
  border-radius: 25px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: 0.3s;
  text-align: center;
}
.payment-tag:hover:not(.disabled) {
  background: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}
.payment-tag.active {
  background: #80A492;
  color: white;
  border-color: #80A492;
}
.payment-tag.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f5f5f5;
  border-color: #ddd;
  color: #999;
}
.disabled-tag {
  font-size: 10px;
  color: #e74c3c;
  margin-left: 2px;
}

.warning-message {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.2);
  border-radius: 8px;
  color: #c0392b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-form {
  margin-top: 10px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}
.credit-info-panel {
  margin-bottom: 15px;
  padding: 15px;
  background: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}
.credit-info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
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
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}
.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.modal-body::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

@media (max-width: 480px) {
  .form-row {
    flex-direction: column;
    gap: 10px;
  }
  .form-actions {
    flex-direction: column;
  }
  .inventory-stats {
    grid-template-columns: 1fr;
  }
}
</style>