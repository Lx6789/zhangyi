<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content expense-modal">
      <div class="modal-header expense-header">
        <i class="fas fa-receipt" style="color: #80A492;"></i>
        <h3>支出记账</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="submitForm">
          <!-- 支出类型选择 -->
          <div class="form-group">
            <label><i class="fas fa-list"></i> 支出类型</label>
            <select v-model="form.type" class="form-select" @change="handleTypeChange" required>
              <option value="">选择支出类型</option>
              <option value="进货采购">📦 进货采购 (更新库存)</option>
              <option value="租金水电">🏢 租金水电</option>
              <option value="员工工资">👥 员工工资</option>
              <option value="设备工具">🔧 设备工具</option>
              <option value="包装物料">📦 包装物料</option>
              <option value="运输费用">🚚 运输费用</option>
              <option value="平台费用">📱 平台费用</option>
              <option value="税费杂费">📄 税费杂费</option>
              <option value="库存损耗">⚠️ 库存损耗 (减少库存)</option>
              <option value="退货退款">🔄 退货退款 (减少库存)</option>
              <option value="其他支出">📌 其他支出</option>
            </select>
          </div>

          <!-- 具体项目 - 仅在不是"进货采购"时显示 -->
          <div class="form-group" v-if="form.type && form.type !== '进货采购'">
            <label><i class="fas fa-tag"></i> 具体项目</label>
            <select v-model="form.subtype" class="form-select" :required="form.type && form.type !== '进货采购'">
              <option value="">选择具体项目</option>
              <option v-for="subtype in subtypesList" :key="subtype" :value="subtype">
                {{ subtype }}
              </option>
            </select>
          </div>

          <!-- 金额和日期 -->
          <div class="form-row">
            <div class="form-group">
              <label><i class="fas fa-yen-sign"></i> 金额 (元)</label>
              <input
                  v-model="form.amount"
                  type="number"
                  class="form-input"
                  placeholder="例如：500"
                  min="0.01"
                  step="0.01"
                  required
                  @input="calculateFromAmount"
              >
            </div>

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
          </div>

          <!-- ==================== 库存相关字段（仅进货采购、库存损耗、退货退款） ==================== -->
          <div v-if="showInventoryFields" class="inventory-section">
            <div class="section-divider">
              <span class="divider-text">📦 库存管理</span>
            </div>

            <!-- 商品类型选择（从数据库查询） -->
            <div class="form-group">
              <label><i class="fas fa-tags"></i> 商品类型 <span class="required">*</span></label>
              <div v-if="loadingProductTypes" class="loading-types">
                <i class="fas fa-spinner fa-spin"></i> 加载商品类型中...
              </div>
              <div v-else class="product-type-selector">
                <div
                    v-for="type in productTypes"
                    :key="type.id"
                    class="product-type-card"
                    :class="{ active: form.productType === type.name }"
                    @click="selectProductType(type.name)"
                >
                  <span>{{ type.name }}</span>
                  <span v-if="type.isDefault" class="default-badge">默认</span>
                </div>
              </div>
              <div v-if="!loadingProductTypes && productTypes.length === 0" class="form-hint">
                暂无商品类型，请先在
                <button type="button" class="text-link" @click="openCategoryManagement">分类管理</button>
                中添加
              </div>
            </div>

            <!-- 商品选择（根据所选类型从数据库中筛选） -->
            <div class="form-group" v-if="form.productType">
              <label><i class="fas fa-box"></i> 选择商品 <span class="required">*</span></label>
              <div v-if="loadingProductsByType" class="loading-products">
                <i class="fas fa-spinner fa-spin"></i> 加载商品中...
              </div>
              <div v-else class="product-select-wrapper">
                <select v-model="form.inventoryProductId" class="form-select" @change="onProductSelected" required>
                  <option value="">请选择商品</option>
                  <option
                      v-for="product in filteredProductsByType"
                      :key="product.id"
                      :value="product.id"
                  >
                    {{ product.name }} ({{ product.unit }})
                  </option>
                </select>
                <button
                    type="button"
                    class="quick-add-btn"
                    @click="openQuickAddProduct"
                    title="快速新增商品"
                >
                  <i class="fas fa-plus"></i>
                </button>
                <button
                    type="button"
                    class="quick-add-btn"
                    @click="refreshProductsList"
                    title="刷新商品列表"
                >
                  <i class="fas fa-sync-alt"></i>
                </button>
              </div>
              <div v-if="!loadingProductsByType && filteredProductsByType.length === 0" class="form-hint">
                该分类下暂无商品，请先
                <button type="button" class="text-link" @click="openQuickAddProduct">添加商品</button>
              </div>
            </div>

            <!-- 当前库存信息 -->
            <div v-if="selectedProduct" class="stock-info-card">
              <div class="stock-header">
                <i class="fas fa-warehouse"></i>
                <span>当前库存信息</span>
              </div>
              <div class="stock-details">
                <div class="stock-item">
                  <span class="stock-label">商品名称：</span>
                  <span class="stock-value">{{ selectedProduct.name }}</span>
                </div>
                <div class="stock-item">
                  <span class="stock-label">商品类型：</span>
                  <span class="stock-value">{{ selectedProduct.category }}</span>
                </div>
                <div class="stock-item">
                  <span class="stock-label">单位：</span>
                  <span class="stock-value">{{ selectedProduct.unit || '斤' }}</span>
                </div>
                <div class="stock-item">
                  <span class="stock-label">当前库存：</span>
                  <span class="stock-value" :class="getStockStatusClass">
                    {{ currentInventoryItem?.quantity || 0 }} {{ selectedProduct.unit || '斤' }}
                  </span>
                </div>
                <div class="stock-item" v-if="currentInventoryItem?.location">
                  <span class="stock-label">存放位置：</span>
                  <span class="stock-value">{{ currentInventoryItem.location }}</span>
                </div>
                <div class="stock-item" v-if="currentInventoryItem?.expiryDate">
                  <span class="stock-label">保质期至：</span>
                  <span class="stock-value" :class="getExpiryStatusClass(currentInventoryItem.expiryDate)">
                    {{ formatDate(currentInventoryItem.expiryDate) }}
                    <span v-if="isExpiring(currentInventoryItem.expiryDate)" class="badge warning">即将过期</span>
                    <span v-if="isExpired(currentInventoryItem.expiryDate)" class="badge expired">已过期</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- 无库存提示 -->
            <div v-else-if="selectedProduct && !currentInventoryItem" class="info-message">
              <i class="fas fa-info-circle"></i>
              该商品暂无库存，将自动创建新库存记录
            </div>

            <!-- 数量调整 -->
            <div class="form-row">
              <div class="form-group">
                <label><i class="fas fa-weight"></i> 数量</label>
                <input
                    v-model="form.quantity"
                    type="number"
                    class="form-input"
                    placeholder="例如：100"
                    min="0.01"
                    step="0.01"
                    required
                    @input="calculateFromQuantity"
                >
              </div>

              <div class="form-group">
                <label><i class="fas fa-balance-scale"></i> 单位</label>
                <input
                    v-model="form.unit"
                    type="text"
                    class="form-input"
                    readonly
                >
              </div>
            </div>

            <!-- 单价 (对进货采购显示) -->
            <div class="form-group" v-if="form.type === '进货采购'">
              <label><i class="fas fa-tag"></i> 单价 (元/{{ form.unit }})</label>
              <input
                  v-model="form.unitPrice"
                  type="number"
                  class="form-input"
                  placeholder="例如：2.5"
                  min="0.01"
                  step="0.01"
                  @input="calculateFromPrice"
              >
              <div class="field-hint" v-if="form.quantity && form.unitPrice">
                <i class="fas fa-calculator"></i>
                小计：¥{{ formatNumber(form.quantity * form.unitPrice) }}
              </div>
            </div>

            <!-- 损耗原因 (对库存损耗显示) -->
            <div v-if="form.type === '库存损耗'" class="form-group">
              <label><i class="fas fa-exclamation-triangle"></i> 损耗原因</label>
              <select v-model="form.lossReason" class="form-select">
                <option value="">请选择损耗原因</option>
                <option value="自然损耗">自然损耗</option>
                <option value="过期损耗">过期损耗</option>
                <option value="损坏损耗">损坏损耗</option>
                <option value="盘点差异">盘点差异</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <!-- 退货原因 (对退货退款显示) -->
            <div v-if="form.type === '退货退款'" class="form-group">
              <label><i class="fas fa-undo-alt"></i> 退货原因</label>
              <input
                  v-model="form.returnReason"
                  type="text"
                  class="form-input"
                  placeholder="例如：质量问题、客户退货等"
              >
            </div>

            <!-- 库存预警 -->
            <div v-if="showInventoryWarning" class="warning-message">
              <i class="fas fa-exclamation-circle"></i>
              {{ inventoryWarningMessage }}
            </div>

            <!-- 更新库存开关 -->
            <div class="form-group">
              <label class="checkbox-label">
                <input class="checkbox" type="checkbox" v-model="form.updateInventory">
                <i class="fas fa-sync-alt"></i>
                <span>{{ updateInventoryText }}</span>
              </label>
            </div>
          </div>

          <!-- 供应商/收款方 -->
          <div class="form-group">
            <label><i class="fas fa-user"></i> 供应商/收款方</label>
            <input
                v-model="form.supplier"
                type="text"
                class="form-input"
                :placeholder="supplierPlaceholder"
                list="supplier-list"
            >
            <datalist id="supplier-list">
              <option v-for="s in supplierHistory" :key="s" :value="s"></option>
            </datalist>
          </div>

          <!-- 支付方式 -->
          <div class="form-group">
            <label><i class="fas fa-credit-card"></i> 支付方式</label>
            <div class="payment-tags">
              <div
                  v-for="method in paymentMethods"
                  :key="method.value"
                  class="payment-tag"
                  :class="{ active: form.paymentMethod === method.value }"
                  @click="form.paymentMethod = method.value"
              >
                {{ method.label }}
              </div>
            </div>
          </div>

          <!-- 备注 -->
          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备注</label>
            <textarea
                v-model="form.note"
                class="form-input form-textarea"
                :placeholder="notePlaceholder"
            ></textarea>
          </div>

          <!-- 表单按钮 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="close">
              取消
            </button>

            <button
                v-if="form.type === '进货采购' && selectedProduct"
                type="button"
                class="btn btn-info"
                @click="openPurchaseManagement"
            >
              <i class="fas fa-truck"></i> 创建采购订单
            </button>

            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> 记录支出
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 快速新增商品模态框 -->
  <QuickAddProductModal
      v-model:visible="quickAddProductVisible"
      :categories="productTypes"
      @success="handleQuickAddProductSuccess"
      @open-category="openCategoryManagement"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import dateHelper from '@/services/utils/date-helper.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import QuickAddProductModal from './QuickAddProductModal.vue'
import { notificationService } from "@/services/index.js"
import expenseService from "@/services/api/business/expense.service.js";
import inventoryService from "@/services/api/business/inventory.service.js";
import baseService from "@/services/api/business/base.service.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  products: {
    type: Array,
    default: () => []
  },
  inventoryItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success', 'refresh-products', 'open-category', 'open-purchase'])

// ==================== 常量 ====================
const expenseSubtypesMap = expenseService.getExpenseSubtypesMap()
const paymentMethods = expenseService.getPaymentMethods()

// 表单数据
const form = reactive({
  type: '',
  subtype: '',
  amount: '',
  date: dateHelper.getTodayString(),
  supplier: '',
  paymentMethod: '现金',
  note: '',
  productType: '',
  inventoryProductId: '',
  quantity: '',
  unit: '斤',
  unitPrice: '',
  updateInventory: true,
  lossReason: '',
  returnReason: ''
})

// 状态
const loadingProductTypes = ref(false)
const loadingProductsByType = ref(false)
const productTypes = ref([])
const supplierHistory = ref([])
const quickAddProductVisible = ref(false)
const subtypesList = ref([])
const selectedProduct = ref(null)
const isRefreshing = ref(false)

// ==================== 计算属性 ====================
const filteredProductsByType = computed(() => {
  if (!form.productType) return []
  return props.products.filter(p => p.category === form.productType)
})

const currentInventoryItem = computed(() => {
  if (!form.inventoryProductId) return null
  return props.inventoryItems.find(item => item.productId === form.inventoryProductId)
})

const showInventoryFields = computed(() => {
  return expenseService.isInventoryAffectingExpense(form.type)
})

const getStockStatusClass = computed(() => {
  return inventoryService.getStockStatusClass(currentInventoryItem.value)
})

const updateInventoryText = computed(() => {
  return expenseService.getUpdateInventoryText(form.type)
})

const supplierPlaceholder = computed(() => {
  return expenseService.getSupplierPlaceholder(form.type)
})

const notePlaceholder = computed(() => {
  return expenseService.getNotePlaceholder(form.type)
})

const showInventoryWarning = computed(() => {
  if (!currentInventoryItem.value || !form.quantity) return false
  if (form.type === '库存损耗' || form.type === '退货退款') {
    const checkResult = expenseService.checkStockSufficiency(
        currentInventoryItem.value.quantity,
        parseFloat(form.quantity),
        currentInventoryItem.value.minStock || 10
    )
    return checkResult.warning
  }
  return false
})

const inventoryWarningMessage = computed(() => {
  if (!currentInventoryItem.value || !form.quantity) return ''
  const checkResult = expenseService.checkStockSufficiency(
      currentInventoryItem.value.quantity,
      parseFloat(form.quantity),
      currentInventoryItem.value.minStock || 10
  )
  return checkResult.message || ''
})

// ==================== 方法 ====================
const openDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择日期',
    defaultDate: form.date || new Date()
  })
  if (date) {
    form.date = date
  }
}

const loadProductTypes = async () => {
  loadingProductTypes.value = true
  try {
    productTypes.value = await businessDataService.getAllCategories()
  } catch (error) {
    console.error('加载商品类型失败:', error)
    productTypes.value = []
  } finally {
    loadingProductTypes.value = false
  }
}

const loadProductsByType = async (type) => {
  if (!type) return
  loadingProductsByType.value = true
  try { } catch (error) {
    console.error('加载商品失败:', error)
  } finally {
    loadingProductsByType.value = false
  }
}

const handleTypeChange = () => {
  updateSubtypes()
  resetInventoryFields()
  if (form.type === '进货采购') loadProductTypes()
}

const updateSubtypes = () => {
  subtypesList.value = expenseService.getExpenseSubtypes(form.type)
  form.subtype = ''
}

const selectProductType = (type) => {
  form.productType = type
  form.inventoryProductId = ''
  selectedProduct.value = null
  loadProductsByType(type)
}

const resetInventoryFields = () => {
  form.productType = ''
  form.inventoryProductId = ''
  form.quantity = ''
  form.unit = '斤'
  form.unitPrice = ''
  form.lossReason = ''
  form.returnReason = ''
  selectedProduct.value = null
}

const onProductSelected = () => {
  if (!form.inventoryProductId) {
    selectedProduct.value = null
    form.unit = '斤'
    return
  }
  const product = props.products.find(p => p.id === form.inventoryProductId)
  if (product) {
    selectedProduct.value = product
    form.unit = product.unit || '斤'
    if (form.type === '进货采购' && currentInventoryItem.value) {
      form.unitPrice = currentInventoryItem.value.costPrice || ''
    }
  }
}

const calculateFromAmount = () => {
  if (form.type === '进货采购' && form.quantity && form.amount) {
    form.unitPrice = parseFloat(form.amount) / parseFloat(form.quantity)
  }
}

const calculateFromQuantity = () => {
  if (form.type === '进货采购' && form.unitPrice && form.quantity) {
    form.amount = expenseService.calculatePurchaseTotal(form.unitPrice, form.quantity)
  } else if ((form.type === '库存损耗' || form.type === '退货退款') && currentInventoryItem.value?.costPrice && form.quantity) {
    form.amount = expenseService.calculateLossAmount(form.quantity, currentInventoryItem.value.costPrice)
  }
}

const calculateFromPrice = () => {
  if (form.type === '进货采购' && form.quantity && form.unitPrice) {
    form.amount = expenseService.calculatePurchaseTotal(form.unitPrice, form.quantity)
  }
}

const openQuickAddProduct = () => {
  quickAddProductVisible.value = true
}

const refreshProductsList = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  loadingProductsByType.value = true
  try {
    emit('refresh-products')
    await new Promise(resolve => setTimeout(resolve, 300))
    if (form.productType) await loadProductsByType(form.productType)
    notificationService.showNotification('商品列表已刷新', 'success')
  } catch (error) {
    notificationService.showNotification('刷新商品列表失败', 'error')
  } finally {
    loadingProductsByType.value = false
    setTimeout(() => isRefreshing.value = false, 500)
  }
}

const handleQuickAddProductSuccess = async () => {
  quickAddProductVisible.value = false
  loadingProductsByType.value = true
  try {
    emit('refresh-products')
    await loadProductTypes()
    await new Promise(resolve => setTimeout(resolve, 500))
    if (form.productType) await loadProductsByType(form.productType)
  } catch (error) {
    notificationService.showNotification('刷新商品列表失败，请手动刷新', 'error')
  } finally {
    loadingProductsByType.value = false
  }
}

const openCategoryManagement = () => {
  emit('open-category')
}

const openPurchaseManagement = () => {
  const purchaseData = {
    supplier: form.supplier,
    productId: selectedProduct.value?.id,
    productName: selectedProduct.value?.name,
    quantity: form.quantity,
    unitPrice: form.unitPrice,
    unit: form.unit,
    date: form.date,
    note: form.note
  }
  localStorage.setItem('pending_purchase_data', JSON.stringify(purchaseData))
  close()
  setTimeout(() => emit('open-purchase'), 100)
  notificationService.showNotification('已跳转到采购管理，可继续创建采购订单', 'info')
}

const resetForm = () => {
  form.type = ''
  form.subtype = ''
  subtypesList.value = []
  form.amount = ''
  form.date = dateHelper.getTodayString()
  form.supplier = ''
  form.paymentMethod = '现金'
  form.note = ''
  form.productType = ''
  form.inventoryProductId = ''
  form.quantity = ''
  form.unit = '斤'
  form.unitPrice = ''
  form.updateInventory = true
  form.lossReason = ''
  form.returnReason = ''
  selectedProduct.value = null
  productTypes.value = []
}

const submitForm = async () => {
  const validation = expenseService.validateExpenseForm(form, form.type !== '进货采购')
  if (!validation.valid) {
    notificationService.showNotification(validation.errors.join('，'), 'error')
    return
  }

  if (showInventoryFields.value) {
    const inventoryValidation = expenseService.validateInventoryFields(form)
    if (!inventoryValidation.valid) {
      notificationService.showNotification(inventoryValidation.errors.join('，'), 'error')
      return
    }
  }

  try {
    const record = expenseService.createExpenseRecord({
      ...form,
      selectedProduct: selectedProduct.value
    })
    await businessDataService.addExpenseRecord(record)
    let inventoryUpdated = false

    if (showInventoryFields.value && form.updateInventory && selectedProduct.value) {
      const quantity = parseFloat(form.quantity)
      if (form.type === '进货采购') {
        const updateData = expenseService.processPurchaseInventoryUpdate(
            currentInventoryItem.value,
            selectedProduct.value,
            quantity,
            parseFloat(form.unitPrice),
            form.supplier
        )
        if (updateData.exists) {
          await businessDataService.updateInventoryItem(updateData.id, updateData)
        } else {
          await businessDataService.addInventoryItem(updateData)
        }
        inventoryUpdated = true
      } else if (form.type === '库存损耗' || form.type === '退货退款') {
        const updateData = expenseService.processLossInventoryUpdate(
            currentInventoryItem.value,
            quantity
        )
        if (updateData.error) {
          notificationService.showNotification(updateData.error, 'error')
          return
        }
        if (updateData.exists) {
          await businessDataService.updateInventoryItem(updateData.id, updateData)
          inventoryUpdated = true
        }
      }
      supplierHistory.value = expenseService.updateSupplierHistory(supplierHistory.value, form.supplier)
    }

    emit('success')
    close()
    const successMsg = expenseService.formatExpenseSuccessMessage(form, inventoryUpdated)
    notificationService.showNotification(successMsg, 'success')
  } catch (error) {
    console.error('保存支出记录失败:', error)
    notificationService.showNotification('保存支出记录失败，请重试', 'error')
  }
}

// 辅助函数
const formatNumber = (num) => baseService.formatNumber(num)
const formatDate = (dateStr) => dateHelper.formatDate(dateStr)
const isExpiring = (expiryDate) => inventoryService.isExpiring(expiryDate)
const isExpired = (expiryDate) => inventoryService.isExpired(expiryDate)
const getExpiryStatusClass = (expiryDate) => inventoryService.getExpiryStatusClass(expiryDate)

const close = () => {
  resetForm()
  emit('update:visible', false)
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) close()
}

watch(() => props.visible, (newVal) => {
  if (newVal) resetForm()
})

watch(() => props.products, (newProducts) => {
  if (form.productType && newProducts.length) {
    const newProduct = newProducts.find(p => p.category === form.productType)
    if (newProduct && !form.inventoryProductId) {
      form.inventoryProductId = newProduct.id
      onProductSelected()
    }
  }
}, { deep: true })
</script>

<style scoped>
/* 样式保持不变，已优化整洁 */
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
  max-width: 550px;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
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
  font-weight: 600;
  color: #80A492;
  flex: 1;
  margin: 0;
}

.modal-close {
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

.form-input[readonly] {
  background-color: #f8fafc;
  color: #666;
  cursor: not-allowed;
  border-color: #D5EBE1;
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

.btn-info {
  background-color: #3498db;
  color: white;
}

.btn-info:hover {
  background-color: #2980b9;
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
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 25px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.payment-tag:hover {
  background-color: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

.payment-tag.active {
  background-color: #80A492;
  color: white;
  border-color: #80A492;
}

.inventory-section {
  margin-top: 15px;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 16px;
  border: 1px solid #D5EBE1;
}

.section-divider {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.divider-text {
  font-size: 14px;
  font-weight: 600;
  color: #80A492;
  background: white;
  padding: 6px 16px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
}

.loading-types,
.loading-products {
  padding: 15px;
  text-align: center;
  color: #80A492;
  background: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.product-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 5px;
  max-height: 200px;
  overflow-y: auto;
  padding: 5px;
}

.product-type-card {
  padding: 8px 16px;
  border-radius: 30px;
  border: 1px solid #D5EBE1;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
  font-weight: 500;
}

.product-type-card:hover {
  background: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

.product-type-card.active {
  background: #80A492;
  color: white;
  border-color: #80A492;
}

.default-badge {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 12px;
  margin-left: 4px;
}

.product-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.quick-add-btn {
  width: 42px;
  height: 42px;
  border: 1px dashed #80A492;
  border-radius: 12px;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.quick-add-btn:hover {
  background: #D5EBE1;
  border-style: solid;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.text-link {
  background: none;
  border: none;
  color: #80A492;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
}

.stock-info-card {
  margin: 15px 0;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
}

.stock-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #D5EBE1;
  color: #80A492;
  font-weight: 500;
  font-size: 14px;
}

.stock-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-item {
  display: flex;
  font-size: 13px;
}

.stock-label {
  width: 85px;
  color: #999;
}

.stock-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.stock-value.normal { color: #2ecc71; }
.stock-value.warning { color: #f39c12; }
.stock-value.danger { color: #e74c3c; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  margin-left: 6px;
  color: white;
}

.badge.warning { background: #f39c12; }
.badge.expired { background: #e74c3c; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 10px 15px;
  background: white;
  border-radius: 12px;
  border: 1px solid #D5EBE1;
  font-size: 14px;
  color: #80A492;
}

.checkbox-label:hover {
  background: #f8fafc;
  border-color: #80A492;
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: #80A492;
}

.warning-message {
  margin: 10px 0;
  padding: 12px 16px;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.2);
  border-radius: 12px;
  color: #c0392b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-message {
  margin: 10px 0;
  padding: 12px 16px;
  background: rgba(52, 152, 219, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.2);
  border-radius: 12px;
  color: #2980b9;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-hint {
  font-size: 12px;
  color: #80A492;
  margin-top: 6px;
  background: #f8fafc;
  padding: 6px 10px;
  border-radius: 8px;
}

.modal-body::-webkit-scrollbar,
.product-type-selector::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track,
.product-type-selector::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.modal-body::-webkit-scrollbar-thumb,
.product-type-selector::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

@media (max-width: 480px) {
  .form-row { flex-direction: column; gap: 10px; }
  .form-actions { flex-direction: column; }
  .product-select-wrapper { flex-wrap: wrap; }
  .quick-add-btn { width: 100%; }
}
</style>