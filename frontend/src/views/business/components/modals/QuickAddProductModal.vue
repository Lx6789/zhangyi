<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-icon">
          <i class="fas fa-plus-circle"></i>
        </div>
        <h3>快速新增商品</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveProduct" class="quick-form">
          <!-- 商品名称 -->
          <div class="form-group highlight">
            <label>
              <i class="fas fa-tag"></i>
              <span>商品名称 <span class="required">*</span></span>
            </label>
            <div class="input-wrapper">
              <input
                  ref="nameInput"
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  placeholder="例如：苹果、大米..."
                  required
              >
            </div>
          </div>

          <!-- 商品分类 -->
          <div class="form-group">
            <label>
              <i class="fas fa-folder"></i>
              <span>商品分类 <span class="required">*</span></span>
            </label>
            <div class="category-select-wrapper">
              <select v-model="form.category" class="form-select" required>
                <option value="" disabled>请选择商品分类</option>
                <option
                    v-for="category in props.categories"
                    :key="category.id"
                    :value="category.name"
                >
                  {{ category.name }}
                  <span v-if="category.isDefault" class="default-badge">默认</span>
                </option>
              </select>
              <button
                  type="button"
                  class="icon-btn small"
                  @click="openCategoryManagement"
                  title="管理分类"
              >
                <i class="fas fa-cog"></i>
              </button>
            </div>
            <div v-if="props.categories.length === 0" class="field-hint">
              <i class="fas fa-info-circle"></i>
              暂无分类，请先
              <button type="button" class="text-link" @click="openCategoryManagement">添加分类</button>
            </div>
          </div>

          <!-- 单位 -->
          <div class="form-group">
            <label>
              <i class="fas fa-balance-scale"></i>
              <span>单位 <span class="required">*</span></span>
            </label>
            <select v-model="form.unit" class="form-select" required>
              <option value="" disabled>请选择单位</option>
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

          <!-- 参考售价 -->
          <div class="form-group">
            <label>
              <i class="fas fa-yen-sign"></i>
              <span>参考售价（可选）</span>
            </label>
            <div class="input-wrapper with-prefix">
              <span class="input-prefix">¥</span>
              <input
                  v-model="form.defaultPrice"
                  type="number"
                  class="form-input with-prefix-input"
                  placeholder="例如：5.00"
                  min="0"
                  step="0.01"
              >
            </div>
          </div>

          <!-- 生产日期（你自己的日期选择器） -->
          <div class="form-group">
            <label>
              <i class="fas fa-calendar-alt"></i>
              <span>生产日期（可选）</span>
            </label>
            <div class="input-wrapper" @click="openProduceDatePicker">
              <input
                  v-model="form.produceDate"
                  type="text"
                  class="form-input"
                  placeholder="点击选择生产日期"
                  readonly
              >
            </div>
          </div>

          <!-- 备注 -->
          <div class="form-group">
            <label>
              <i class="fas fa-align-left"></i>
              <span>备注（可选）</span>
            </label>
            <textarea
                v-model="form.description"
                class="form-input form-textarea"
                placeholder="商品描述、产地、规格等信息..."
                rows="2"
            ></textarea>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="close">
              <i class="fas fa-times"></i> 取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-check"></i>
              {{ saving ? '保存中...' : '快速添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import productService from '@/services/api/business/product.service.js'
import { notificationService } from "@/services/index.js"

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

const emit = defineEmits(['update:visible', 'success', 'open-category'])

// 状态
const saving = ref(false)
const nameInput = ref(null)

// 表单数据
const form = reactive({
  name: '',
  category: '',
  unit: '',
  defaultPrice: '',
  produceDate: '',
  description: ''
})

// 打开生产日期选择器
const openProduceDatePicker = async () => {
  const date = await notificationService.datePicker({
    title: '选择生产日期',
    defaultDate: form.produceDate || new Date()
  })
  if (date) {
    form.produceDate = date
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(form, {
    name: '',
    category: '',
    unit: '',
    defaultPrice: '',
    produceDate: '',
    description: ''
  })
}

// 保存商品
const saveProduct = async () => {
  const trimName = form.name.trim()
  if (!trimName) {
    notificationService.showNotification('请输入商品名称', 'error')
    return
  }
  if (!form.category) {
    notificationService.showNotification('请选择商品分类', 'error')
    return
  }
  if (!form.unit) {
    notificationService.showNotification('请选择单位', 'error')
    return
  }

  try {
    const existingProducts = await productService.getAllProducts()
    const isDuplicate = existingProducts.some(
        p => p.name.toLowerCase() === trimName.toLowerCase()
    )
    if (isDuplicate) {
      notificationService.showNotification(`商品 "${trimName}" 已存在，请勿重复添加`, 'error')
      return
    }

    saving.value = true
    const productData = {
      name: trimName,
      category: form.category,
      unit: form.unit,
      defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : null,
      produceDate: form.produceDate || null,
      description: form.description.trim() || null,
      createTime: new Date().toISOString()
    }

    await productService.addProduct(productData)
    notificationService.showNotification(`商品 "${trimName}" 添加成功`, 'success')

    emit('success')
    close()
  } catch (error) {
    console.error('添加商品失败:', error)
    notificationService.showNotification('添加商品失败，请重试', 'error')
  } finally {
    saving.value = false
  }
}

// 打开分类管理
const openCategoryManagement = () => {
  emit('open-category')
}

// 关闭模态框
const close = () => {
  resetForm()
  emit('update:visible', false)
}

// 点击遮罩关闭
const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) close()
}

// 打开弹窗自动聚焦
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
    setTimeout(() => nameInput.value?.focus(), 100)
  }
})

// 自动选中默认分类
watch(() => props.categories, (val) => {
  if (val?.length && !form.category) {
    const defaultCat = val.find(c => c.isDefault) || val[0]
    form.category = defaultCat.name
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2150;
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
  max-width: 450px;
  border-radius: 24px;
  padding: 25px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #D5EBE1;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #80A492 0%, #6b8f80 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.header-icon i {
  font-size: 24px;
  color: white;
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

.modal-body {
  padding: 5px 0;
}

.quick-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  margin-bottom: 0;
  position: relative;
}

.form-group.highlight {
  background: rgba(128, 164, 146, 0.05);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(128, 164, 146, 0.2);
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #5f7a6e;
  margin-bottom: 8px;
}

.form-group label i {
  color: #80A492;
  font-size: 14px;
  width: 18px;
}

.required {
  color: #e74c3c;
  margin-left: 2px;
}

.default-badge {
  font-size: 10px;
  background: rgba(128, 164, 146, 0.2);
  padding: 2px 6px;
  border-radius: 12px;
  margin-left: 6px;
  color: #80A492;
}

.input-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.input-wrapper.with-prefix {
  display: flex;
  align-items: center;
}

.input-prefix {
  padding: 0 12px;
  background: #f0f5f2;
  color: #80A492;
  font-weight: 600;
  font-size: 15px;
  height: 46px;
  display: flex;
  align-items: center;
  border: 1px solid #D5EBE1;
  border-right: none;
  border-radius: 12px 0 0 12px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #D5EBE1;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s;
  background: white;
  box-sizing: border-box;
  cursor: pointer;
}

.form-input.with-prefix-input {
  border-left: none;
  border-radius: 0 12px 12px 0;
  padding-left: 8px;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-textarea {
  min-height: 60px;
  resize: vertical;
  font-family: inherit;
  cursor: text !important;
}

.category-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.category-select-wrapper .form-select {
  flex: 1;
}

.form-select {
  width: 100%;
  padding: 12px 35px 12px 16px;
  border: 1px solid #D5EBE1;
  border-radius: 12px;
  font-size: 14px;
  background: white;
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

.icon-btn.small {
  width: 40px;
  height: 40px;
  border: 1px solid #B1D5C8;
  border-radius: 8px;
  background: white;
  color: #80A492;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.icon-btn.small:hover {
  background: #D5EBE1;
  border-color: #80A492;
}

.field-hint {
  font-size: 11px;
  color: #99BCAC;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.field-hint i {
  font-size: 12px;
}

.text-link {
  background: none;
  border: none;
  color: #80A492;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 4px;
  font-size: 11px;
}

.text-link:hover {
  color: #608070;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 10px;
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
  background: linear-gradient(135deg, #80A492 0%, #6b8f80 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(128, 164, 146, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(128, 164, 146, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #D5EBE1;
}

.btn-secondary:hover {
  background: #D5EBE1;
  color: #80A492;
  border-color: #80A492;
}

@media (max-width: 480px) {
  .modal-content {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .header-icon {
    width: 40px;
    height: 40px;
  }

  .header-icon i {
    font-size: 20px;
  }

  .modal-header h3 {
    font-size: 18px;
  }
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}
</style>