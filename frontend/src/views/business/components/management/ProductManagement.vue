<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content product-modal">
      <div class="modal-header product-header">
        <i class="fas fa-boxes" style="color: #80A492;"></i>
        <h3>商品管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="product-management">
          <!-- 搜索框 -->
          <div class="search-section">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                  v-model="searchKeyword"
                  type="text"
                  class="search-input"
                  placeholder="搜索商品名称、分类、描述..."
                  @input="searchProducts"
              >
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button class="btn btn-secondary category-manage-btn" @click="openCategoryManagement">
              <i class="fas fa-tags"></i> 分类管理
            </button>
            <button class="btn btn-primary add-product-btn" @click="openAddProductModal">
              <i class="fas fa-plus"></i> 新增商品
            </button>
          </div>

          <!-- 分类筛选 -->
          <div class="category-filter">
            <div
                class="filter-chip"
                :class="{ active: selectedFilterCategory === '全部' }"
                @click="selectedFilterCategory = '全部'"
            >
              全部
            </div>
            <div
                v-for="category in filterCategories"
                :key="category"
                class="filter-chip"
                :class="{ active: selectedFilterCategory === category }"
                @click="selectedFilterCategory = category"
            >
              {{ category }}
            </div>
            <div v-if="filterCategories.length === 0" class="filter-chip disabled">
              暂无分类
            </div>
          </div>

          <!-- 商品列表 -->
          <div class="product-list">
            <div v-if="loading" class="loading-state">
              <i class="fas fa-spinner fa-spin"></i>
              <p>加载中...</p>
            </div>

            <div v-else-if="filteredProducts.length === 0" class="empty-state">
              <i class="fas fa-box-open"></i>
              <p>暂无商品</p>
              <button class="btn btn-primary" @click="openAddProductModal">
                添加第一个商品
              </button>
            </div>

            <div v-else class="product-grid">
              <div v-for="product in filteredProducts" :key="product.id" class="product-card">
                <div class="product-header">
                  <h4>{{ product.name }}</h4>
                  <div class="product-actions">
                    <button class="icon-btn edit" @click="editProduct(product)" title="编辑">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" @click="confirmDeleteProduct(product)" title="删除">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="product-details">
                  <div class="detail-item">
                    <span class="detail-label">分类：</span>
                    <span class="detail-value">{{ product.category }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">单位：</span>
                    <span class="detail-value">{{ product.unit }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">参考售价：</span>
                    <span class="detail-value price">¥ {{ formatNumber(product.defaultPrice || 0) }}</span>
                  </div>
                  <div class="detail-item" v-if="product.produceDate">
                    <span class="detail-label">生产日期：</span>
                    <span class="detail-value">{{ product.produceDate }}</span>
                  </div>
                  <div class="detail-item" v-if="product.description">
                    <span class="detail-label">描述：</span>
                    <span class="detail-value">{{ product.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 新增/编辑商品模态框 -->
  <div class="modal" :class="{ active: addEditModalVisible }" @click="closeAddEditOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas" :class="editingProductId ? 'fa-edit' : 'fa-plus-circle'" style="color: #80A492;"></i>
        <h3>{{ editingProductId ? '编辑商品' : '新增商品' }}</h3>
        <button class="modal-close" @click="closeAddEditModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="saveProduct">
          <div class="form-group">
            <label><i class="fas fa-tag"></i> 商品名称 <span class="required">*</span></label>
            <input
                v-model="productForm.name"
                type="text"
                class="form-input"
                placeholder="例如：大白菜"
                required
            >
          </div>

          <div class="form-group">
            <label><i class="fas fa-tags"></i> 商品分类 <span class="required">*</span></label>
            <div class="category-select">
              <div class="custom-select-display" @click="openCategorySelector">
                <span :class="{ placeholder: !productForm.category }">
                  {{ productForm.category || '选择分类' }}
                </span>
                <i class="fas fa-chevron-down"></i>
              </div>
              <button type="button" class="icon-btn small" @click="openCategoryManagement" title="管理分类">
                <i class="fas fa-cog"></i>
              </button>
            </div>
            <div v-if="categoryNames.length === 0" class="form-hint">
              暂无分类，请先
              <button type="button" class="text-link" @click="openCategoryManagement">添加分类</button>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-balance-scale"></i> 单位 <span class="required">*</span></label>
            <div class="custom-select-display" @click="openUnitSelector">
              <span :class="{ placeholder: !productForm.unit }">
                {{ productForm.unit || '选择单位' }}
              </span>
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-yen-sign"></i> 参考售价</label>
            <div class="input-group">
              <span class="input-prefix">¥</span>
              <input
                  v-model="productForm.defaultPrice"
                  type="number"
                  class="form-input"
                  placeholder="例如：5"
                  min="0"
                  step="0.01"
              >
            </div>
          </div>

          <!-- 生产日期（使用你自己的日期选择器） -->
          <div class="form-group">
            <label><i class="fas fa-calendar-alt"></i> 生产日期</label>
            <div class="input-wrapper" @click="openProduceDatePicker">
              <input
                  v-model="productForm.produceDate"
                  type="text"
                  class="form-input"
                  placeholder="点击选择生产日期"
                  readonly
              >
            </div>
          </div>

          <div class="form-group">
            <label><i class="fas fa-align-left"></i> 描述/备注</label>
            <textarea
                v-model="productForm.description"
                class="form-input form-textarea"
                placeholder="例如：产地、规格、保质期等"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeAddEditModal">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-check"></i> {{ editingProductId ? '保存修改' : '添加商品' }}
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
import { notificationService } from "@/services/index.js"
import productService from "@/services/api/business/product.service.js";
import baseService from "@/services/api/business/base.service.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'update', 'open-category'])

// ==================== 常量 ====================
const productUnits = productService.getProductUnits()

// 单位选项（带图标）
const unitOptions = [
  { value: '斤', label: '斤', icon: '⚖️' },
  { value: '公斤', label: '公斤', icon: '⚖️' },
  { value: '个', label: '个', icon: '🔢' },
  { value: '份', label: '份', icon: '🍽️' },
  { value: '箱', label: '箱', icon: '📦' },
  { value: '袋', label: '袋', icon: '🎒' },
  { value: '瓶', label: '瓶', icon: '🍾' },
  { value: '包', label: '包', icon: '📦' }
]

// ==================== 状态 ====================
const products = ref([])
const filteredProducts = ref([])
const searchKeyword = ref('')
const selectedFilterCategory = ref('全部')
const loading = ref(false)

// 新增/编辑相关
const addEditModalVisible = ref(false)
const editingProductId = ref('')
const productForm = reactive({
  name: '',
  category: '',
  unit: '',
  defaultPrice: null,
  produceDate: '',
  description: ''
})

// 删除确认相关
const deleteConfirmVisible = ref(false)
const deleteConfirmMessage = ref('')
const deleteConfirmProduct = ref(null)

// ==================== 自定义选择器方法 ====================

/**
 * 打开分类选择器
 */
const openCategorySelector = async () => {
  const categories = categoryNames.value
  if (categories.length === 0) {
    notificationService.showNotification('暂无分类，请先添加分类', 'warning')
    return
  }

  const items = categories.map(cat => ({
    value: cat,
    label: cat,
    icon: '📁'
  }))

  const selected = await notificationService.selectList({
    title: '选择商品分类',
    items: items,
    cancelText: '取消'
  })

  if (selected) {
    productForm.category = selected
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
    productForm.unit = selected
  }
}

// ==================== 打开生产日期选择器 ====================
const openProduceDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择生产日期',
    defaultDate: productForm.produceDate || new Date()
  })
  if (date) {
    productForm.produceDate = date
  }
}

// ==================== 计算属性 ====================
const categoryNames = computed(() => {
  return props.categories.map(c => c.name).sort()
})
const filterCategories = computed(() => {
  return props.categories.map(c => c.name).sort()
})

// ==================== 方法 ====================
const loadProducts = async () => {
  loading.value = true
  try {
    products.value = await productService.getAllProducts()
    filterProducts()
  } catch (error) {
    console.error('加载商品失败:', error)
    notificationService.showNotification('加载商品失败', 'error')
  } finally {
    loading.value = false
  }
}

const filterProducts = () => {
  filteredProducts.value = productService.filterProducts(products.value, {
    keyword: searchKeyword.value,
    category: selectedFilterCategory.value
  })
}

const searchProducts = () => {
  filterProducts()
}

const openCategoryManagement = () => {
  emit('open-category')
}

const openAddProductModal = () => {
  editingProductId.value = ''
  const defaultForm = productService.getProductFormDefault()
  productForm.name = defaultForm.name
  productForm.category = defaultForm.category
  productForm.unit = defaultForm.unit
  productForm.defaultPrice = defaultForm.defaultPrice
  productForm.produceDate = ''
  productForm.description = defaultForm.description
  addEditModalVisible.value = true
}

const editProduct = (product) => {
  editingProductId.value = product.id
  productForm.name = product.name
  productForm.category = product.category
  productForm.unit = product.unit
  productForm.defaultPrice = product.defaultPrice
  productForm.produceDate = product.produceDate || ''
  productForm.description = product.description || ''
  addEditModalVisible.value = true
}

const saveProduct = async () => {
  const validation = productService.validateProductForm(productForm)
  if (!validation.valid) {
    notificationService.showNotification(validation.errors.join('，'), 'error')
    return
  }

  try {
    const productData = {
      name: productForm.name.trim(),
      category: productForm.category,
      unit: productForm.unit,
      defaultPrice: productForm.defaultPrice ? parseFloat(productForm.defaultPrice) : null,
      produceDate: productForm.produceDate || null,
      description: productForm.description || '',
      updateTime: new Date().toISOString()
    }

    if (editingProductId.value) {
      await productService.updateProduct(editingProductId.value, productData)
      notificationService.showNotification('商品更新成功！', 'success')
    } else {
      await productService.addProduct(productData)
      notificationService.showNotification('商品添加成功！', 'success')
    }

    await loadProducts()
    emit('update')
    closeAddEditModal()
  } catch (error) {
    console.error('保存商品失败:', error)
    notificationService.showNotification(error.message || '保存商品失败', 'error')
  }
}

const confirmDeleteProduct = (product) => {
  deleteConfirmMessage.value = `确定要删除商品 "${product.name}" 吗？`
  deleteConfirmProduct.value = product
  deleteConfirmVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteConfirmProduct.value) return

  try {
    await productService.deleteProduct(deleteConfirmProduct.value.id)
    await loadProducts()
    emit('update')
    notificationService.showNotification('商品删除成功！', 'success')
  } catch (error) {
    console.error('删除商品失败:', error)
    notificationService.showNotification(error.message || '删除商品失败', 'error')
  } finally {
    deleteConfirmVisible.value = false
    deleteConfirmProduct.value = null
  }
}

const closeAddEditModal = () => {
  addEditModalVisible.value = false
  editingProductId.value = ''
}

const close = () => {
  emit('update:visible', false)
}

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

const closeConfirmOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    deleteConfirmVisible.value = false
  }
}

const formatNumber = (num) => {
  return baseService.formatNumber(num)
}

// ==================== 监听器 ====================
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadProducts()
  }
})

watch([selectedFilterCategory, searchKeyword], () => {
  filterProducts()
})

watch(() => props.categories, () => {
  filterProducts()
}, { deep: true })

onMounted(() => {
  if (props.visible) {
    loadProducts()
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

.modal-content.product-modal {
  max-width: 900px;
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

.product-header {
  border-radius: 20px 20px 0 0;
}

/* ==================== 模态框主体 ==================== */
.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

/* ==================== 商品管理样式 ==================== */
.product-management {
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

.category-manage-btn,
.add-product-btn {
  flex: 1;
}

/* 分类筛选 */
.category-filter {
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

.filter-chip.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f5f5f5;
}

.filter-chip.disabled:hover {
  background-color: #f5f5f5;
  color: #666;
  border-color: #D5EBE1;
}

/* 商品网格 */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 5px;
}

.product-card {
  background-color: white;
  border: 1px solid #D5EBE1;
  border-radius: 16px;
  padding: 18px;
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
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #D5EBE1;
}

.product-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #80A492;
  margin: 0;
}

.product-actions {
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

.icon-btn.small {
  width: 36px;
  height: 36px;
  font-size: 16px;
  background-color: #D5EBE1;
  color: #80A492;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.icon-btn.small:hover {
  background-color: #B1D5C8;
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

/* 商品详情 */
.product-details {
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

/* 空状态和加载状态 */
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
  cursor: pointer;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
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
  background-color: rgba(128, 164, 146, 0.05);
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
  font-family: inherit;
  cursor: text !important;
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

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  padding-top: 10px;
  border-top: 1px solid #D5EBE1;
}

/* 分类选择 */
.category-select {
  display: flex;
  gap: 10px;
  align-items: center;
}

.category-select .custom-select-display {
  flex: 1;
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
  font-weight: 500;
}

.text-link:hover {
  color: #608070;
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
.product-grid::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track,
.product-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb,
.product-grid::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover,
.product-grid::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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

  .product-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .category-filter {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .filter-chip {
    flex-shrink: 0;
  }

  .confirm-actions {
    flex-direction: column;
  }

  .category-select {
    flex-direction: column;
  }

  .category-select .icon-btn.small {
    width: 100%;
  }
}
</style>