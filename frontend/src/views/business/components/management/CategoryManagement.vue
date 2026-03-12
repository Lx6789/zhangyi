<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay($event)">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-tags"></i>
        <h3>分类管理</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="category-management">
        <!-- 添加新分类 -->
        <div class="form-group">
          <label><i class="fas fa-plus-circle"></i> 添加新分类</label>
          <div class="add-category-form">
            <input
                v-model="newCategoryName"
                type="text"
                class="form-input"
                placeholder="输入分类名称"
                @keyup.enter="addCategory"
                :disabled="loading"
            >
            <button
                class="btn btn-primary"
                @click="addCategory"
                :disabled="!newCategoryName.trim() || loading"
            >
              <i class="fas fa-plus"></i> 添加
            </button>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>

        <!-- 分类列表 -->
        <div v-else class="category-list">
          <div class="category-list-header">
            <span>分类名称</span>
            <span>操作</span>
          </div>

          <div
              v-for="category in sortedCategories"
              :key="category.id"
              class="category-item"
          >
            <div class="category-info">
              <i :class="category.icon || 'fas fa-tag'"></i>
              <div v-if="editingId === category.id" class="category-edit">
                <input
                    v-model="editingName"
                    type="text"
                    class="form-input small"
                    @keyup.enter="updateCategory(category.id)"
                    @keyup.esc="cancelEdit"
                    ref="editInput"
                    :disabled="saving"
                >
              </div>
              <span v-else class="category-name">
                {{ category.name }}
                <span v-if="category.isDefault" class="default-badge">默认</span>
              </span>
            </div>

            <div class="category-actions">
              <button
                  v-if="!category.isDefault"
                  class="icon-btn edit"
                  @click="startEdit(category)"
                  :disabled="saving"
                  title="编辑"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                  v-if="!category.isDefault"
                  class="icon-btn delete"
                  @click="deleteCategory(category)"
                  :disabled="saving"
                  title="删除"
              >
                <i class="fas fa-trash"></i>
              </button>
              <span v-if="category.isDefault" class="default-action">系统分类</span>
            </div>
          </div>

          <div v-if="sortedCategories.length === 0" class="empty-categories">
            <i class="fas fa-tags"></i>
            <p>暂无分类，请添加</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import businessDataService from '@/services/business-data.service.js'
import {notificationService} from "@/services/index.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'update', 'back'])

// ==================== 状态 ====================
const categories = ref([])
const loading = ref(false)
const saving = ref(false)

// 新增分类
const newCategoryName = ref('')

// 编辑分类
const editingId = ref('')
const editingName = ref('')

// ==================== 计算属性 ====================
const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => {
    // 默认分类排在前面
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    // 按排序顺序
    return (a.sortOrder || 999) - (b.sortOrder || 999)
  })
})

// ==================== 方法 ====================

// 加载分类数据
const loadCategories = async () => {
  loading.value = true
  try {
    categories.value = await businessDataService.getAllCategories()
    console.log('分类加载成功:', categories.value.length)
  } catch (error) {
    console.error('加载分类失败:', error)
    notificationService.showNotification('加载分类失败', 'error')
  } finally {
    loading.value = false
  }
}

// 添加分类
const addCategory = async () => {
  if (!newCategoryName.value.trim()) {
    notificationService.showNotification('请输入分类名称', 'error')
    return
  }

  // 检查是否已存在（忽略大小写）
  const exists = categories.value.some(
      c => c.name.toLowerCase() === newCategoryName.value.trim().toLowerCase()
  )

  if (exists) {
    notificationService.showNotification('该分类已存在', 'error')
    return
  }

  saving.value = true
  try {
    const newCategory = {
      name: newCategoryName.value.trim(),
      icon: 'fas fa-tag',
      sortOrder: categories.value.filter(c => !c.isDefault).length + 1,
      isDefault: false
    }

    await businessDataService.addCategory(newCategory)
    await loadCategories()
    emit('update')

    newCategoryName.value = ''
    notificationService.showNotification('分类添加成功', 'success')
  } catch (error) {
    console.error('添加分类失败:', error)
    notificationService.showNotification(error.message || '添加分类失败', 'error')
  } finally {
    saving.value = false
  }
}

// 开始编辑
const startEdit = (category) => {
  editingId.value = category.id
  editingName.value = category.name
  nextTick(() => {
    const input = document.querySelector('.category-edit input')
    if (input) input.focus()
  })
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = ''
  editingName.value = ''
}

// 更新分类
const updateCategory = async (categoryId) => {
  if (!editingName.value.trim()) {
    notificationService.showNotification('分类名称不能为空', 'error')
    return
  }

  // 检查是否已存在（排除自己）
  const exists = categories.value.some(
      c => c.id !== categoryId &&
          c.name.toLowerCase() === editingName.value.trim().toLowerCase()
  )

  if (exists) {
    notificationService.showNotification('该分类名称已存在', 'error')
    return
  }

  saving.value = true
  try {
    await businessDataService.updateCategory(categoryId, {
      name: editingName.value.trim()
    })

    await loadCategories()
    emit('update')

    editingId.value = ''
    editingName.value = ''
    notificationService.showNotification('分类更新成功', 'success')
  } catch (error) {
    console.error('更新分类失败:', error)
    notificationService.showNotification(error.message || '更新分类失败', error)
  } finally {
    saving.value = false
  }
}

// 删除分类
const deleteCategory = async (category) => {
  if (!confirm(`确定要删除分类 "${category.name}" 吗？`)) {
    return
  }

  saving.value = true
  try {
    await businessDataService.deleteCategory(category.id)
    await loadCategories()
    emit('update')
    notificationService.showNotification('分类删除成功', 'success')
  } catch (error) {
    console.error('删除分类失败:', error)
    notificationService.showNotification(error.message || '删除分类失败', 'error')
  } finally {
    saving.value = false
  }
}

// 关闭模态框
const close = () => {
  emit('update:visible', false)
  // 发出返回事件，告诉父组件返回上一个页面
  emit('back')
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadCategories()
    // 重置状态
    newCategoryName.value = ''
    editingId.value = ''
    editingName.value = ''
  }
})

// 初始化
onMounted(() => {
  if (props.visible) {
    loadCategories()
  }
})
</script>

<style scoped>
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

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #D5EBE1;
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
}

.modal-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 24px;
  color: #99BCAC;
  cursor: pointer;
}

/* 分类管理样式 */
.category-management {
  padding: 5px 0;
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
}

.form-input {
  width: 100%;
  padding: 14px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 15px;
  color: #333;
  transition: all 0.3s;
  background-color: rgba(213, 235, 225, 0.1);
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-input.small {
  padding: 8px 12px;
  font-size: 14px;
}

.btn {
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.add-category-form {
  display: flex;
  gap: 10px;
}

.add-category-form .form-input {
  flex: 1;
}

.add-category-form .btn {
  flex: 0 0 auto;
  padding: 14px 24px;
}

/* 分类列表 */
.category-list {
  margin-top: 20px;
  border: 1px solid #D5EBE1;
  border-radius: 12px;
  overflow: hidden;
}

.category-list-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 15px;
  background-color: #D5EBE1;
  color: #80A492;
  font-weight: 600;
  font-size: 14px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid rgba(213, 235, 225, 0.5);
}

.category-item:last-child {
  border-bottom: none;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.category-info i {
  width: 20px;
  color: #80A492;
  font-size: 16px;
}

.category-name {
  font-size: 15px;
  color: #333;
}

.default-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #D5EBE1;
  color: #80A492;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.category-edit {
  flex: 1;
  max-width: 200px;
}

.category-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn.edit {
  color: #3498db;
}

.icon-btn.edit:hover:not(:disabled) {
  background-color: rgba(52, 152, 219, 0.1);
}

.icon-btn.delete {
  color: #e74c3c;
}

.icon-btn.delete:hover:not(:disabled) {
  background-color: rgba(231, 76, 60, 0.1);
}

.default-action {
  color: #999;
  font-size: 12px;
  font-style: italic;
  padding: 0 8px;
}

/* 空状态 */
.empty-categories {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-categories i {
  font-size: 48px;
  color: #99BCAC;
  margin-bottom: 15px;
}

.empty-categories p {
  font-size: 14px;
}

.modal {
  z-index: 2100; /* 从 2000 改为 2100 */
}

/* 加载状态 */
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

/* 响应式 */
@media (max-width: 480px) {
  .add-category-form {
    flex-direction: column;
  }

  .category-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .category-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .category-edit {
    max-width: 100%;
  }
}
</style>