<template>
  <section class="add-savings-form">
    <div class="section-title">
      <div class="title-with-back">
        <h2>{{ formTitle }}</h2>
        <button v-if="isEditing" class="back-to-add-btn" @click="resetToAdd">
          <i class="fas fa-plus-circle"></i>
          <span>新增</span>
        </button>
      </div>
      <i class="fas fa-plus-circle"></i>
    </div>

    <form @submit.prevent="submitForm">
      <!-- 存钱目标名称 -->
      <div class="form-group">
        <label><i class="fas fa-tag"></i> 存钱目标名称</label>
        <input
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="例如：买一台新电脑"
            required
        >
      </div>

      <!-- 存钱理由 -->
      <div class="form-group">
        <label><i class="fas fa-comment"></i> 存钱理由</label>
        <textarea
            v-model="form.reason"
            class="form-input form-textarea"
            placeholder="为什么要存钱？..."
            required
        ></textarea>
      </div>

      <!-- 金额相关 -->
      <div class="form-row">
        <div class="form-group">
          <label><i class="fas fa-bullseye"></i> 目标金额</label>
          <input
              v-model.number="form.targetAmount"
              type="number"
              class="form-input"
              min="1"
              step="0.01"
              placeholder="输入目标金额"
              required
          >
        </div>
        <div class="form-group">
          <label><i class="fas fa-wallet"></i> 已存金额</label>
          <input
              v-model.number="form.currentAmount"
              type="number"
              class="form-input"
              min="0"
              step="0.01"
              :placeholder="currentAmountPlaceholder"
              :required="false"
          >
          <div class="input-hint" v-if="!isEditing">
            <i class="fas fa-info-circle"></i> 留空则默认为0元
          </div>
        </div>
      </div>

      <!-- 日期和类型 -->
      <div class="form-row">
        <div class="form-group">
          <label><i class="fas fa-calendar-alt"></i> 截止日期</label>
          <input
              v-model="form.deadline"
              type="date"
              class="form-input"
              :min="today"
              required
          >
        </div>
        <div class="form-group">
          <label><i class="fas fa-list"></i> 存钱类型</label>
          <select v-model="form.type" class="form-input">
            <option value="日常储蓄">日常储蓄</option>
            <option value="旅行基金">旅行基金</option>
            <option value="教育基金">教育基金</option>
            <option value="购房基金">购房基金</option>
            <option value="购车基金">购车基金</option>
            <option value="应急资金">应急资金</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>

      <!-- 验证提示 -->
      <div v-if="validationError" class="validation-error">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ validationError }}</span>
      </div>

      <!-- 表单操作按钮 -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="resetForm">
          <i class="fas fa-redo"></i> 重置
        </button>
        <button type="submit" class="btn btn-primary" :disabled="submitting || !isFormValid">
          <i v-if="submitting" class="fas fa-spinner fa-spin"></i>
          <i v-else :class="isEditing ? 'fas fa-save' : 'fas fa-check'"></i>
          <span>{{ submitButtonText }}</span>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { savingService } from '@/services'
import { notificationService } from '@/services'

const props = defineProps({
  formTitle: {
    type: String,
    required: true
  },
  initialForm: {
    type: Object,
    default: () => ({
      name: '',
      reason: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      type: '日常储蓄'
    })
  },
  isEditing: {
    type: Boolean,
    required: true
  },
  isEditingOwnPlan: {
    type: Boolean,
    required: true
  },
  currentSavingsType: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    required: true
  },
  editingId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits([
  'submit-success',
  'reset-form'
])

// ========== 工具函数（必须先定义） ==========
const getDefaultDeadline = () => {
  const today = new Date()
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return oneMonthLater.toISOString().split('T')[0]
}

const getIconByType = (type) => {
  const icons = {
    '日常储蓄': 'fas fa-coins',
    '旅行基金': 'fas fa-plane',
    '教育基金': 'fas fa-graduation-cap',
    '购房基金': 'fas fa-home',
    '购车基金': 'fas fa-car',
    '应急资金': 'fas fa-first-aid',
    '其他': 'fas fa-star'
  }
  return icons[type] || 'fas fa-piggy-bank'
}

const getColorByType = (type) => {
  const colors = {
    '日常储蓄': '#2ecc71',
    '旅行基金': '#3498DB',
    '教育基金': '#9B59B6',
    '购房基金': '#E74C3C',
    '购车基金': '#F39C12',
    '应急资金': '#E67E22',
    '其他': '#80A492'
  }
  return colors[type] || '#80A492'
}

const calculateProgress = (current, target) => {
  if (!target || target <= 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

// ========== 表单数据 ==========
const form = reactive({
  name: '',
  reason: '',
  targetAmount: '',
  currentAmount: '',
  deadline: getDefaultDeadline(),
  type: '日常储蓄'
})

// 提交状态
const submitting = ref(false)

// 验证错误
const validationError = ref('')

// 获取今天日期（用于日期选择器的最小值）
const today = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

// 已存金额的占位符文本
const currentAmountPlaceholder = computed(() => {
  return props.isEditing ? '当前已存金额' : '留空则默认为0'
})

// 表单是否有效
const isFormValid = computed(() => {
  // 目标金额必须有值且大于0
  if (!form.targetAmount || form.targetAmount <= 0) return false

  // 名称和理由不能为空
  if (!form.name.trim() || !form.reason.trim()) return false

  // 截止日期不能为空
  if (!form.deadline) return false

  // 如果已存金额有值，需要验证是否超过目标金额
  if (form.currentAmount !== '' && form.currentAmount !== null) {
    const current = Number(form.currentAmount)
    const target = Number(form.targetAmount)
    if (current > target) return false
  }

  return true
})

// 提交按钮文本
const submitButtonText = computed(() => {
  if (submitting.value) return '提交中...'
  return props.isEditing ? '更新计划' : '创建计划'
})

// ========== 监听器 ==========
// 监听初始表单数据变化
watch(() => props.initialForm, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    Object.assign(form, {
      name: newVal.name || '',
      reason: newVal.reason || '',
      targetAmount: newVal.targetAmount || '',
      currentAmount: newVal.currentAmount !== undefined ? newVal.currentAmount : '',
      deadline: newVal.deadline || getDefaultDeadline(),
      type: newVal.type || '日常储蓄'
    })
  }
}, { immediate: true, deep: true })

// 监听当前金额变化，验证是否超过目标金额
watch(() => form.currentAmount, () => {
  validateAmounts()
})

// 监听目标金额变化
watch(() => form.targetAmount, () => {
  validateAmounts()
})

// ========== 方法 ==========
// 验证金额
const validateAmounts = () => {
  // 如果已存金额为空，不进行验证
  if (form.currentAmount === '' || form.currentAmount === null) {
    validationError.value = ''
    return
  }

  const current = Number(form.currentAmount) || 0
  const target = Number(form.targetAmount) || 0

  if (target > 0 && current > target) {
    validationError.value = '已存金额不能大于目标金额'
  } else {
    validationError.value = ''
  }
}

// 初始化表单（用于新增模式）
const initForm = () => {
  Object.assign(form, {
    name: '',
    reason: '',
    targetAmount: '',
    currentAmount: '',  // 新增模式默认为空字符串
    deadline: getDefaultDeadline(),
    type: '日常储蓄'
  })
  validationError.value = ''
}

// 重置表单
const resetForm = () => {
  initForm()
  emit('reset-form')
}

// 切换到新增模式
const resetToAdd = () => {
  resetForm()
}

// 提交表单 - 包含存储逻辑
const submitForm = async () => {
  // 验证表单
  if (!form.name.trim()) {
    validationError.value = '请输入存钱目标名称'
    return
  }

  if (!form.reason.trim()) {
    validationError.value = '请输入存钱理由'
    return
  }

  if (!form.targetAmount || form.targetAmount <= 0) {
    validationError.value = '请输入有效的目标金额'
    return
  }

  if (!form.deadline) {
    validationError.value = '请选择截止日期'
    return
  }

  // 处理已存金额
  let finalCurrentAmount = 0

  if (props.isEditing) {
    // 编辑模式：如果用户没有修改，保持原值；如果用户清空了，使用原值
    finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
        ? Number(form.currentAmount)
        : Number(props.initialForm.currentAmount || 0)
  } else {
    // 新增模式：如果用户没有填写，默认为0
    finalCurrentAmount = form.currentAmount !== '' && form.currentAmount !== null
        ? Number(form.currentAmount)
        : 0
  }

  const target = Number(form.targetAmount)

  // 验证已存金额是否超过目标金额
  if (finalCurrentAmount > target) {
    validationError.value = '已存金额不能大于目标金额'
    return
  }

  // 验证通过，开始提交
  validationError.value = ''
  submitting.value = true

  try {
    // 创建提交数据
    const submitData = {
      name: form.name.trim(),
      reason: form.reason.trim(),
      targetAmount: target,
      currentAmount: finalCurrentAmount,
      deadline: form.deadline,
      type: form.type,
      // 添加前端需要的显示属性
      icon: getIconByType(form.type),
      color: getColorByType(form.type),
      progress: calculateProgress(finalCurrentAmount, target),
      completed: finalCurrentAmount >= target
    }

    let response

    if (props.isEditing) {
      // 编辑模式 - 调用更新API
      response = await savingService.updatePersonalSavings(props.editingId, submitData)

      if (response.code === 200) {
        notificationService.showNotification('计划更新成功', 'success')
        // 提交成功后，将完整数据（包括ID）发送给父组件
        emit('submit-success', {
          ...submitData,
          id: props.editingId
        }, 'update')
      } else {
        notificationService.showNotification(response.message || '更新失败', 'error')
        return
      }
    } else {
      // 新增模式 - 调用创建API
      response = await savingService.createPersonalSavings(submitData)

      if (response.code === 200 && response.data) {
        notificationService.showNotification('计划创建成功', 'success')
        // 提交成功后，将完整数据（包括服务器返回的ID）发送给父组件
        emit('submit-success', {
          ...submitData,
          id: response.data.id || Date.now() // 优先使用服务器返回的ID
        }, 'create')
      } else {
        notificationService.showNotification(response.message || '创建失败', 'error')
        return
      }
    }

    // 成功后重置表单
    resetForm()

  } catch (error) {
    console.error('提交失败:', error)
    notificationService.showNotification('操作失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

// 组件挂载时初始化
onMounted(() => {
  if (!props.isEditing) {
    initForm()
  }
})
</script>

<style scoped>
.add-savings-form {
  background-color: var(--white);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 5px 15px var(--shadow);
  scroll-margin-top: 20px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--primary-color);
}

.title-with-back {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.section-title i {
  color: var(--tertiary-color);
  font-size: 18px;
}

.back-to-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 13px;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.back-to-add-btn:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
}

.back-to-add-btn i {
  font-size: 14px;
  color: var(--accent-color);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-dark);
  transition: all 0.3s;
  background-color: rgba(213, 235, 225, 0.1);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-input:read-only {
  background-color: rgba(213, 235, 225, 0.3);
  cursor: not-allowed;
}

.form-textarea {
  min-height: 100px;
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

/* 输入提示 */
.input-hint {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-hint i {
  font-size: 12px;
  color: var(--accent-color);
}

/* 验证错误提示 */
.validation-error {
  background-color: #fee;
  color: #e74c3c;
  padding: 12px 15px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  border: 1px solid #fcc;
}

.validation-error i {
  font-size: 16px;
}

/* 表单操作按钮 */
.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.btn-secondary {
  background-color: rgba(128, 164, 146, 0.1);
  color: var(--accent-color);
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgba(128, 164, 146, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>