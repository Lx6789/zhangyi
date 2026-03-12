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
          <!-- 商品分类选择 -->
          <div class="form-group">
            <div class="label-with-action">
              <label><i class="fas fa-tag"></i> 商品分类</label>
              <button type="button" class="icon-btn small" @click="openCategoryManagement" title="管理分类">
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

          <!-- 商品选择 - 所有分类都显示商品下拉列表 -->
          <div class="form-group" v-if="form.category">
            <label><i class="fas fa-box"></i> 选择商品</label>
            <select v-model="form.productId" class="form-select" @change="onProductSelected">
              <option value="">请选择商品</option>
              <option v-for="product in filteredProducts" :key="product.id" :value="product.id">
                {{ product.name }} ({{ product.unit }})
              </option>
            </select>

            <button type="button" class="photo-btn" @click="openQuickAddProduct" style="margin-top: 10px;">
              <i class="fas fa-plus-circle"></i> 添加新商品
            </button>
          </div>

          <div class="form-group">
            <label><i class="fas fa-store"></i> 销售渠道</label>
            <select v-model="form.channel" class="form-select" required @change="onChannelChange">
              <option value="">选择销售渠道</option>
              <option value="门店零售">门店零售</option>
              <option value="批发">批发</option>
              <option value="线上订单">线上订单</option>
              <option value="外卖平台">外卖平台</option>
              <option value="集市摆摊">集市摆摊</option>
              <option value="单位团购">单位团购</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <!-- ==================== 批发库存信息 ==================== -->
          <div v-if="form.channel === '批发' && selectedProduct && currentInventory" class="inventory-info-panel">
            <div class="inventory-header">
              <i class="fas fa-boxes"></i>
              <span>库存信息 - {{ selectedProduct.name }}</span>
            </div>

            <div class="inventory-stats">
              <div class="inventory-stat-item" :class="{ 'low-stock': isLowStock }">
                <span class="stat-label">当前库存</span>
                <span class="stat-value">{{ formatQuantity(currentInventory.quantity) }} {{ currentInventory.unit }}</span>
                <span v-if="isLowStock" class="low-stock-badge">
                  <i class="fas fa-exclamation-triangle"></i> 库存紧张
                </span>
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

              <div class="inventory-stat-item" v-if="currentInventory.supplier">
                <span class="stat-label">供应商</span>
                <span class="stat-value">{{ currentInventory.supplier }}</span>
              </div>

              <div class="inventory-stat-item" v-if="currentInventory.location">
                <span class="stat-label">存放位置</span>
                <span class="stat-value">{{ currentInventory.location }}</span>
              </div>
            </div>

            <!-- 保质期信息 -->
            <div v-if="currentInventory.expiryDate" class="expiry-info" :class="getExpiryStatusClass">
              <i class="fas" :class="getExpiryIcon"></i>
              <span>
                保质期至: {{ formatDate(currentInventory.expiryDate) }}
                <span v-if="isExpiringSoon" class="expiry-badge warning-badge">即将过期</span>
                <span v-if="isExpired" class="expiry-badge expired-badge">已过期</span>
              </span>
            </div>

            <!-- 库存警告 -->
            <div v-if="form.quantity && parseFloat(form.quantity) > currentInventory.quantity" class="stock-warning">
              <i class="fas fa-exclamation-circle"></i>
              <span>警告：销售数量 ({{ form.quantity }}) 超过当前库存 ({{ currentInventory.quantity }} {{ currentInventory.unit }})！</span>
            </div>

            <!-- 库存操作选项 -->
            <div class="inventory-actions">
              <label class="checkbox-label">
                <input type="checkbox" v-model="autoUpdateInventory">
                <span>销售后自动扣减库存</span>
              </label>

              <button
                  v-if="form.quantity && parseFloat(form.quantity) <= currentInventory.quantity"
                  type="button"
                  class="btn btn-small btn-primary"
                  @click="checkAndAdjustStock"
              >
                <i class="fas fa-check-circle"></i> 库存充足，可销售
              </button>

              <button
                  v-else-if="form.quantity && parseFloat(form.quantity) > currentInventory.quantity"
                  type="button"
                  class="btn btn-small btn-warning"
                  @click="suggestPurchase"
              >
                <i class="fas fa-shopping-cart"></i> 建议采购
              </button>
            </div>
          </div>

          <!-- 客户选择 -->
          <div class="form-group">
            <div class="label-with-action">
              <label><i class="fas fa-user-tie"></i> 客户名称</label>
              <div style="display: flex; gap: 5px;">
                <button type="button" class="icon-btn small" @click="openCustomerManagement" title="管理客户">
                  <i class="fas fa-users-cog"></i>
                </button>
              </div>
            </div>
            <select v-model="form.customerId" class="form-select" @change="onCustomerChange">
              <option value="">散客/无记录</option>
              <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                {{ customer.name }}
                <span v-if="customer.type">({{ customer.type }})</span>
                <span v-if="customer.creditInfo?.hasCredit && customer.creditInfo?.balance > 0" style="color: #e74c3c;">
                    赊账: ¥{{ formatNumber(customer.creditInfo.balance) }}
                  </span>
              </option>
            </select>

            <!-- 快速添加客户表单 -->
            <div v-if="showQuickAddCustomer" class="edit-form" style="margin-top: 10px;">
              <input
                  v-model="quickCustomer.name"
                  type="text"
                  class="form-input"
                  placeholder="客户名称"
                  style="margin-bottom: 8px;"
              >
              <select v-model="quickCustomer.type" class="form-select" style="margin-bottom: 8px;">
                <option value="零售客户">零售客户</option>
                <option value="批发客户">批发客户</option>
                <option value="长期客户">长期客户</option>
                <option value="单位客户">单位客户</option>
              </select>
              <input
                  v-model="quickCustomer.phone"
                  type="tel"
                  class="form-input"
                  placeholder="联系电话"
                  style="margin-bottom: 8px;"
              >
              <div class="edit-form-actions">
                <button type="button" class="btn btn-small btn-secondary" @click="cancelQuickAddCustomer">取消</button>
                <button type="button" class="btn btn-small btn-primary" @click="saveQuickCustomer">保存</button>
              </div>
            </div>
          </div>

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
              <!-- 批发最大数量提示 -->
              <div v-if="form.channel === '批发' && currentInventory" class="quantity-hint">
                最大可售: {{ currentInventory.quantity }} {{ currentInventory.unit }}
              </div>
            </div>

            <div class="form-group">
              <label><i class="fas fa-yen-sign"></i> 单价 (元)</label>
              <input v-model="form.price" type="number" class="form-input" placeholder="例如：15" min="0.01" step="0.01" required>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-balance-scale"></i> 单位</label>
            <select v-model="form.unit" class="form-select">
              <option value="斤">斤</option>
              <option value="公斤">公斤</option>
              <option value="个">个</option>
              <option value="份">份</option>
              <option value="箱">箱</option>
              <option value="袋">袋</option>
              <option value="瓶">瓶</option>
              <option value="包">包</option>
            </select>
          </div>

          <!-- 收款方式 - 根据客户权限动态显示 -->
          <div class="form-group">
            <label><i class="fas fa-wallet"></i> 收款方式</label>
            <div class="payment-tags">
              <div
                  v-for="method in filteredPaymentMethods"
                  :key="method.value"
                  class="payment-tag"
                  :class="{
                    active: form.paymentMethod === method.value,
                    disabled: method.disabled
                  }"
                  @click="selectPaymentMethod(method)"
              >
                {{ method.label }}
                <span v-if="method.disabled" class="disabled-tag">(不可用)</span>
              </div>
            </div>

            <!-- 客户不允许赊账的提示 -->
            <div v-if="selectedCustomer && !selectedCustomer.creditInfo?.hasCredit && form.paymentMethod === '赊账'" class="warning-message">
              <i class="fas fa-exclamation-circle"></i>
              该客户不允许赊账，请选择其他收款方式
            </div>

            <!-- 赊账信息 - 仅当客户允许赊账且选择了赊账方式时显示 -->
            <div v-if="form.paymentMethod === '赊账' && selectedCustomer?.creditInfo?.hasCredit" class="edit-form" style="margin-top: 10px;">
              <div class="credit-info-panel">
                <div class="credit-info-row">
                  <span class="credit-info-label">客户信用：</span>
                  <span class="credit-info-value">
                    {{ selectedCustomer.creditInfo.creditLimit ? `额度 ¥${formatNumber(selectedCustomer.creditInfo.creditLimit)}` : '无限额' }}
                  </span>
                </div>
                <div class="credit-info-row">
                  <span class="credit-info-label">当前欠款：</span>
                  <span class="credit-info-value warning">¥{{ formatNumber(selectedCustomer.creditInfo.balance || 0) }}</span>
                </div>
                <div v-if="selectedCustomer.creditInfo.creditLimit && (selectedCustomer.creditInfo.balance || 0) >= selectedCustomer.creditInfo.creditLimit"
                     class="credit-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  该客户已接近或达到信用额度
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 10px;">
                <label><i class="fas fa-calendar-check"></i> 预计还款日期</label>
                <input v-model="form.expectedRepayDate" type="date" class="form-input">
              </div>
              <div class="form-group">
                <label><i class="fas fa-sticky-note"></i> 赊账备注</label>
                <input v-model="form.creditNote" type="text" class="form-input" placeholder="例如：月底结账">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 日期</label>
            <input v-model="form.date" type="date" class="form-input" required>
          </div>

          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注 (可选)</label>
            <textarea v-model="form.note" class="form-input form-textarea" placeholder="记录更多细节..."></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="close">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitDisabled">
              <i class="fas fa-check"></i> 记录收入
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 快速添加商品模态框 -->
  <QuickAddProductModal
      v-model:visible="quickAddModalVisible"
      :categories="categories"
      @success="handleQuickAddProductSuccess"
      @open-category="openCategoryManagement"
  />

  <!-- 采购建议模态框 -->
  <div class="modal" :class="{ active: purchaseSuggestionVisible }" @click="closePurchaseSuggestionOnOverlay($event)">
    <div class="modal-content small">
      <div class="modal-header">
        <i class="fas fa-shopping-cart" style="color: #80A492;"></i>
        <h3>采购建议</h3>
        <button class="modal-close" @click="purchaseSuggestionVisible = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="purchase-suggestion">
          <div class="suggestion-item">
            <span class="suggestion-label">商品名称：</span>
            <span class="suggestion-value">{{ selectedProduct?.name }}</span>
          </div>
          <div class="suggestion-item">
            <span class="suggestion-label">当前库存：</span>
            <span class="suggestion-value">{{ currentInventory?.quantity }} {{ currentInventory?.unit }}</span>
          </div>
          <div class="suggestion-item">
            <span class="suggestion-label">销售数量：</span>
            <span class="suggestion-value">{{ form.quantity }} {{ currentInventory?.unit }}</span>
          </div>
          <div class="suggestion-item">
            <span class="suggestion-label">库存缺口：</span>
            <span class="suggestion-value warning">{{ calculateStockGap }} {{ currentInventory?.unit }}</span>
          </div>
          <div class="suggestion-item" v-if="currentInventory?.supplier">
            <span class="suggestion-label">推荐供应商：</span>
            <span class="suggestion-value">{{ currentInventory.supplier }}</span>
          </div>

          <div class="suggestion-actions">
            <button class="btn btn-primary" @click="openPurchaseModal">
              <i class="fas fa-plus"></i> 创建采购订单
            </button>
            <button class="btn btn-secondary" @click="purchaseSuggestionVisible = false">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import businessDataService from '@/services/business-data.service.js'
import userDataService from '@/services/user-data.service.js'
import QuickAddProductModal from './QuickAddProductModal.vue'
import {notificationService} from "@/services/index.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  customers: {
    type: Array,
    default: () => []
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

const emit = defineEmits(['update:visible', 'success', 'open-customer', 'open-category', 'refresh-products'])

// ==================== 状态 ====================
const showQuickAddCustomer = ref(false)
const quickAddModalVisible = ref(false)
const previousProductsLength = ref(0)
const autoUpdateInventory = ref(true) // 默认自动扣减库存
const purchaseSuggestionVisible = ref(false) // 采购建议模态框
const inventoryData = ref([]) // 库存数据

const quickCustomer = reactive({
  name: '',
  type: '零售客户',
  phone: ''
})

const form = reactive({
  category: '',
  productId: '',
  manualProductName: '',
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
const paymentMethods = [
  { value: '现金', label: '现金' },
  { value: '微信', label: '微信' },
  { value: '支付宝', label: '支付宝' },
  { value: '银行卡', label: '银行卡' },
  { value: '赊账', label: '赊账' }
]

// ==================== 计算属性 ====================
const categoryNames = computed(() => {
  return props.categories.map(c => c.name).sort()
})

const filteredProducts = computed(() => {
  if (!form.category) return []
  return props.products.filter(p => p.category === form.category)
})

// 当前选中的客户
const selectedCustomer = computed(() => {
  if (!form.customerId) return null
  return props.customers.find(c => c.id === form.customerId)
})

// 根据客户是否允许赊账过滤支付方式
const filteredPaymentMethods = computed(() => {
  const methods = [...paymentMethods]

  // 如果选中了客户且客户不允许赊账，禁用赊账选项
  if (selectedCustomer.value && !selectedCustomer.value.creditInfo?.hasCredit) {
    const creditMethod = methods.find(m => m.value === '赊账')
    if (creditMethod) {
      creditMethod.disabled = true
    }
  } else {
    // 确保赊账选项可用
    const creditMethod = methods.find(m => m.value === '赊账')
    if (creditMethod) {
      creditMethod.disabled = false
    }
  }

  return methods
})

// 获取当前选中商品的库存信息
const currentInventory = computed(() => {
  if (!selectedProduct.value) return null

  // 查找该商品的库存记录
  const inventory = inventoryData.value.find(item =>
      item.productId === selectedProduct.value.id
  )

  // 如果没有库存记录，创建一个模拟对象
  if (!inventory) {
    return {
      productId: selectedProduct.value.id,
      productName: selectedProduct.value.name,
      quantity: 0,
      unit: selectedProduct.value.unit || '斤',
      minStock: 10,
      costPrice: selectedProduct.value.defaultPrice || 0,
      sellingPrice: selectedProduct.value.defaultPrice || 0,
      supplier: null,
      location: null,
      expiryDate: null
    }
  }

  return inventory
})

// 是否库存紧张
const isLowStock = computed(() => {
  if (!currentInventory.value) return false
  const minStock = currentInventory.value.minStock || 10
  return currentInventory.value.quantity <= minStock
})

// 是否即将过期（7天内）
const isExpiringSoon = computed(() => {
  if (!currentInventory.value?.expiryDate) return false
  return isExpiring(currentInventory.value.expiryDate)
})

// 是否已过期
const isExpired = computed(() => {
  if (!currentInventory.value?.expiryDate) return false
  return isExpiredDate(currentInventory.value.expiryDate)
})

// 获取过期状态类名
const getExpiryStatusClass = computed(() => {
  if (isExpired.value) return 'expired'
  if (isExpiringSoon.value) return 'expiring'
  return ''
})

// 获取过期图标
const getExpiryIcon = computed(() => {
  if (isExpired.value) return 'fa-times-circle'
  if (isExpiringSoon.value) return 'fa-exclamation-circle'
  return 'fa-check-circle'
})

// 计算库存缺口
const calculateStockGap = computed(() => {
  if (!currentInventory.value || !form.quantity) return 0
  const gap = parseFloat(form.quantity) - currentInventory.value.quantity
  return Math.max(0, gap).toFixed(2)
})

// 提交按钮是否禁用
const isSubmitDisabled = computed(() => {
  // 批发模式下，如果销售数量超过库存，禁用提交按钮
  if (form.channel === '批发' && currentInventory.value && form.quantity) {
    return parseFloat(form.quantity) > currentInventory.value.quantity
  }
  return false
})

// ==================== 方法 ====================

// 加载库存数据
const loadInventoryData = async () => {
  try {
    inventoryData.value = await businessDataService.getAllInventory()
  } catch (error) {
    console.error('加载库存数据失败:', error)
  }
}

// 渠道变更处理
const onChannelChange = () => {
  if (form.channel === '批发') {
    // 批发模式下，自动加载库存数据
    loadInventoryData()

    // 如果已经选择了商品，检查库存
    if (selectedProduct.value) {
      validateQuantity()
    }
  }
}

// 客户变更处理
const onCustomerChange = () => {
  console.log('客户变更为:', form.customerId)
}

// 选择支付方式
const selectPaymentMethod = (method) => {
  if (method.disabled) {
    notificationService.showNotification('该客户不允许赊账，请选择其他收款方式', 'error')
    return
  }

  form.paymentMethod = method.value

  // 如果不是赊账，清空赊账相关字段
  if (method.value !== '赊账') {
    form.expectedRepayDate = dateHelper.addDays(dateHelper.getTodayString(), 30)
    form.creditNote = ''
  }
}

const onProductSelected = () => {
  if (!form.productId) {
    selectedProduct.value = null
    form.price = ''
    form.unit = '斤'
    return
  }

  const product = props.products.find(p => p.id === form.productId)
  if (product) {
    selectedProduct.value = product
    form.price = product.defaultPrice || ''
    form.unit = product.unit || '斤'

    // 如果当前是批发模式，加载库存信息
    if (form.channel === '批发') {
      loadInventoryData()
    }
  }
}

// 验证数量
const validateQuantity = () => {
  if (form.channel === '批发' && currentInventory.value && form.quantity) {
    const quantity = parseFloat(form.quantity)
    if (quantity > currentInventory.value.quantity) {
      console.warn(`销售数量超过库存！库存: ${currentInventory.value.quantity}, 销售: ${quantity}`)
    }
  }
}

// 检查和调整库存
const checkAndAdjustStock = () => {
  if (currentInventory.value && form.quantity) {
    const quantity = parseFloat(form.quantity)
    if (quantity <= currentInventory.value.quantity) {
      notificationService.showNotification(`库存充足，可销售。当前库存: ${currentInventory.value.quantity} ${currentInventory.value.unit}`, 'info')
    }
  }
}

// 建议采购
const suggestPurchase = () => {
  purchaseSuggestionVisible.value = true
}

// 打开采购模态框
const openPurchaseModal = () => {
  purchaseSuggestionVisible.value = false
  // 触发父组件的采购管理模态框
  // 这里可以通过事件总线或直接调用父组件方法
  // 暂时先关闭模态框并提示
  notificationService.showNotification('即将跳转到采购管理页面...', 'info')
  // 实际项目中可以 emit 一个事件让父组件打开采购管理
  // emit('open-purchase')
}

// 格式化数量
const formatQuantity = (quantity) => {
  if (quantity === undefined || quantity === null) return '0'
  return quantity.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// 判断是否即将过期
const isExpiring = (expiryDate) => {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date()
  future.setDate(today.getDate() + 7)
  future.setHours(23, 59, 59, 999)
  return expiry >= today && expiry <= future
}

// 判断是否已过期
const isExpiredDate = (expiryDate) => {
  if (!expiryDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(expiryDate) < today
}

const openCategoryManagement = () => {
  emit('open-category')
}

const openCustomerManagement = () => {
  emit('open-customer')
}

const openQuickAddProduct = () => {
  previousProductsLength.value = props.products.length
  quickAddModalVisible.value = true
}

const handleQuickAddProductSuccess = () => {
  quickAddModalVisible.value = false
  emit('refresh-products')
}

const cancelQuickAddCustomer = () => {
  showQuickAddCustomer.value = false
  quickCustomer.name = ''
  quickCustomer.type = '零售客户'
  quickCustomer.phone = ''
}

const saveQuickCustomer = () => {
  if (!quickCustomer.name) {
    notificationService.showNotification('请输入客户名称', 'error')
    return
  }

  const newCustomer = {
    id: Date.now().toString(),
    name: quickCustomer.name,
    type: quickCustomer.type,
    phone: quickCustomer.phone || null,
    creditInfo: { hasCredit: false },
    stats: {
      transactionCount: 0,
      totalAmount: 0,
      lastTransactionDate: null
    },
    createTime: new Date().toISOString()
  }

  const customers = [...props.customers, newCustomer]
  userDataService.saveCustomers(customers)
  form.customerId = newCustomer.id

  showQuickAddCustomer.value = false
  quickCustomer.name = ''
  quickCustomer.type = '零售客户'
  quickCustomer.phone = ''

  notificationService.showNotification('客户添加成功', 'success')
}

const submitForm = async () => {
  // 验证
  let productName = ''
  let productCategory = form.category

  if (!form.productId) {
    notificationService.showNotification('请选择商品', 'error')
    return
  }

  if (!selectedProduct.value) {
    notificationService.showNotification('请选择有效商品', 'error')
    return
  }

  productName = selectedProduct.value.name
  productCategory = selectedProduct.value.category

  if (!form.channel || !form.quantity || !form.price || !form.date) {
    notificationService.showNotification('请填写所有必填项！', 'error')
    return
  }

  // 检查支付方式是否可用
  if (form.paymentMethod === '赊账' && selectedCustomer.value && !selectedCustomer.value.creditInfo?.hasCredit) {
    notificationService.showNotification('该客户不允许赊账，请选择其他收款方式', 'error')
    return
  }

  // 批发模式下检查库存
  if (form.channel === '批发' && currentInventory.value) {
    const quantity = parseFloat(form.quantity)
    if (quantity > currentInventory.value.quantity) {
      const confirm = window.confirm(`销售数量 (${quantity}) 超过当前库存 (${currentInventory.value.quantity} ${currentInventory.value.unit})！确定要继续吗？`)
      if (!confirm) return
    }
  }

  const totalAmount = parseFloat(form.quantity) * parseFloat(form.price)

  // 处理客户信息
  let customerName = '散客'
  let customerId = null
  if (form.customerId) {
    const customer = props.customers.find(c => c.id === form.customerId)
    if (customer) {
      customerName = customer.name
      customerId = customer.id

      if (form.paymentMethod === '赊账') {
        const customers = [...props.customers]
        const index = customers.findIndex(c => c.id === customer.id)
        if (index !== -1) {
          if (!customers[index].creditInfo) {
            customers[index].creditInfo = { hasCredit: true, balance: 0 }
          }
          customers[index].creditInfo.balance = (customers[index].creditInfo.balance || 0) + totalAmount
          userDataService.saveCustomers(customers)
        }
      }
    }
  }

  // 创建记录
  const record = {
    id: Date.now().toString(),
    type: '收入',
    category: productCategory,
    source: form.channel,
    amount: totalAmount,
    date: form.date,
    paymentMethod: form.paymentMethod,
    note: `${productName} ${form.quantity}${form.unit} ${form.note}`.trim(),
    businessType: 'business',
    productId: selectedProduct.value?.id,
    productName: productName,
    channel: form.channel,
    customer: customerName,
    customerId: customerId,
    quantity: parseFloat(form.quantity),
    price: parseFloat(form.price),
    unit: form.unit,
    isPaid: form.paymentMethod !== '赊账',
    expectedRepayDate: form.paymentMethod === '赊账' ? form.expectedRepayDate : null,
    creditNote: form.paymentMethod === '赊账' ? form.creditNote : null,
    // 批发模式特有字段
    isWholesale: form.channel === '批发',
    autoUpdateInventory: autoUpdateInventory.value
  }

  try {
    await businessDataService.addIncomeRecord(record)

    // 批发模式下，如果勾选了自动更新库存，更新库存
    if (form.channel === '批发' && autoUpdateInventory.value && selectedProduct.value) {
      const inventoryItems = await businessDataService.getInventoryByProductId(selectedProduct.value.id)
      if (inventoryItems.length > 0) {
        await businessDataService.updateStockQuantity(
            inventoryItems[0].id,
            parseFloat(form.quantity),
            'subtract'
        )
        console.log(`库存已更新: 减少 ${form.quantity} ${form.unit}`)
      }
    }

    emit('success')
    close()
    notificationService.showNotification(`收入记录成功：${productName} ¥${totalAmount.toFixed(2)}`, 'success')
  } catch (error) {
    console.error('保存收入记录失败:', error)
    notificationService.showNotification('保存收入记录失败，请重试', 'error')
  }
}

const resetForm = () => {
  form.category = ''
  form.productId = ''
  form.manualProductName = ''
  form.channel = ''
  form.customerId = ''
  form.quantity = ''
  form.price = ''
  form.unit = '斤'
  form.paymentMethod = '现金'
  form.date = dateHelper.getTodayString()
  form.note = ''
  form.expectedRepayDate = dateHelper.addDays(dateHelper.getTodayString(), 30)
  form.creditNote = ''
  showQuickAddCustomer.value = false
  selectedProduct.value = null
  autoUpdateInventory.value = true
}

const close = () => {
  resetForm()
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

const closePurchaseSuggestionOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    purchaseSuggestionVisible.value = false
  }
}

const formatNumber = (num) => {
  if (!num) return '0.00'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ==================== 监听器 ====================
// 监听 products 变化，当有新商品时自动选择
watch(() => props.products, (newProducts, oldProducts) => {
  if (newProducts.length > oldProducts.length && !quickAddModalVisible.value) {
    const newProduct = newProducts[newProducts.length - 1]
    if (newProduct.category === form.category) {
      form.productId = newProduct.id
      onProductSelected()
    } else {
      form.category = newProduct.category
      setTimeout(() => {
        form.productId = newProduct.id
        onProductSelected()
      }, 100)
    }
  }
}, { deep: true })

// 监听分类变化，重置商品选择
watch(() => form.category, () => {
  form.productId = ''
  selectedProduct.value = null
})

// 监听客户变化，检查支付方式
watch(() => form.customerId, (newVal) => {
  if (newVal === '__new__') {
    showQuickAddCustomer.value = true
    form.customerId = ''
    return
  }

  const customer = props.customers.find(c => c.id === newVal)
  if (customer && !customer.creditInfo?.hasCredit && form.paymentMethod === '赊账') {
    form.paymentMethod = '现金'
    form.expectedRepayDate = dateHelper.addDays(dateHelper.getTodayString(), 30)
    form.creditNote = ''
  }
})

// 监听模态框显示
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 每次打开模态框时加载库存数据
    loadInventoryData()
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

.income-modal {
  max-width: 500px !important;
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

.income-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
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

/* ==================== 按钮样式 ==================== */
.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-primary {
  background-color: #D5EBE1;
  color: #80A492;
}

.btn-primary:hover:not(:disabled) {
  background-color: #B1D5C8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-warning {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
  border: 1px solid #f39c12;
}

.btn-warning:hover {
  background-color: rgba(243, 156, 18, 0.2);
}

.btn-small {
  padding: 8px 16px;
  font-size: 13px;
  flex: none;
}

/* ==================== 库存信息面板 ==================== */
.inventory-info-panel {
  margin: 15px 0;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.inventory-stat-item {
  padding: 8px;
  background-color: white;
  border-radius: 8px;
  border: 1px solid #D5EBE1;
}

.inventory-stat-item.low-stock {
  border-color: #f39c12;
  background-color: rgba(243, 156, 18, 0.05);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
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
  background-color: #f39c12;
  color: white;
  font-size: 10px;
  border-radius: 12px;
}

/* ==================== 保质期信息 ==================== */
.expiry-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background-color: white;
  border-radius: 8px;
  margin: 10px 0;
  font-size: 13px;
}

.expiry-info.expiring {
  background-color: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.expiry-info.expired {
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.expiry-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  color: white;
  margin-left: 6px;
}

.warning-badge {
  background-color: #f39c12;
}

.expired-badge {
  background-color: #e74c3c;
}

/* ==================== 库存警告 ==================== */
.stock-warning {
  margin: 10px 0;
  padding: 10px;
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-warning i {
  font-size: 14px;
}

.quantity-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  text-align: right;
}

/* ==================== 库存操作 ==================== */
.inventory-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #D5EBE1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #80A492;
}

/* ==================== 采购建议 ==================== */
.purchase-suggestion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #D5EBE1;
}

.suggestion-label {
  color: #999;
  font-size: 13px;
}

.suggestion-value {
  font-weight: 600;
  color: #333;
}

.suggestion-value.warning {
  color: #e74c3c;
}

.suggestion-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

/* ==================== 标签和图标按钮 ==================== */
.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.label-with-action label {
  margin-bottom: 0;
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

.icon-btn.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
  background-color: #D5EBE1;
  color: #80A492;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.icon-btn.small:hover {
  background-color: #B1D5C8;
}

/* ==================== 分类标签 ==================== */
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
}

.category-tag {
  padding: 8px 16px;
  background-color: #D5EBE1;
  border-radius: 30px;
  font-size: 13px;
  color: #80A492;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.category-tag:hover {
  background-color: #B1D5C8;
}

.category-tag.active {
  background-color: #80A492;
  color: white;
}

/* ==================== 支付方式样式 ==================== */
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
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 25px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  position: relative;
}

.payment-tag:hover:not(.disabled) {
  background-color: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

.payment-tag.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

.payment-tag.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f5f5;
  border-color: #ddd;
  color: #999;
}

.payment-tag.disabled:hover {
  background-color: #f5f5f5;
  color: #999;
  border-color: #ddd;
}

.disabled-tag {
  font-size: 10px;
  color: #e74c3c;
  margin-left: 2px;
}

/* ==================== 警告消息 ==================== */
.warning-message {
  margin-top: 8px;
  padding: 10px 12px;
  background-color: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 8px;
  color: #c0392b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-message i {
  font-size: 14px;
  color: #e74c3c;
}

/* ==================== 信用信息面板 ==================== */
.credit-info-panel {
  margin-bottom: 15px;
  padding: 15px;
  background-color: #f8fafc;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.credit-info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
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
}

.credit-warning {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: rgba(243, 156, 18, 0.1);
  border: 1px solid rgba(243, 156, 18, 0.2);
  border-radius: 8px;
  color: #f39c12;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.credit-warning i {
  font-size: 14px;
}

/* ==================== 照片按钮 ==================== */
.photo-btn {
  width: 100%;
  padding: 14px;
  border: 2px dashed #D5EBE1;
  border-radius: 12px;
  background: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.photo-btn:hover {
  border-color: #80A492;
  color: #80A492;
  background-color: rgba(128, 164, 146, 0.05);
}

/* ==================== 编辑表单 ==================== */
.edit-form {
  margin-top: 10px;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.edit-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

/* ==================== 空状态 ==================== */
.empty-tags {
  padding: 20px;
  text-align: center;
  background-color: #f8fafc;
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
  padding: 0 4px;
  font-weight: 500;
}

.text-link:hover {
  color: #608070;
}

/* ==================== 自定义滚动条 ==================== */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
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

  .form-row {
    flex-direction: column;
    gap: 10px;
  }

  .payment-tags {
    flex-direction: column;
  }

  .payment-tag {
    width: 100%;
  }

  .credit-info-row {
    flex-direction: column;
    gap: 4px;
  }

  .credit-info-label {
    width: 100%;
  }

  .form-actions {
    flex-direction: column;
  }

  .inventory-stats {
    grid-template-columns: 1fr;
  }

  .suggestion-actions {
    flex-direction: column;
  }
}
</style>