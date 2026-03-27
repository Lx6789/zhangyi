<template>
  <div class="modal" :class="{ active: visible }" @click.self="close">
    <div class="modal-content cloud-backup-modal">
      <div class="modal-header">
        <i class="fas fa-cloud-upload-alt" style="color: #80A492;"></i>
        <h3>云端备份</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- 标签页切换 -->
        <div class="backup-tabs">
          <button
              class="tab-btn"
              :class="{ active: activeTab === 'upload' }"
              @click="activeTab = 'upload'"
          >
            <i class="fas fa-cloud-upload-alt"></i>
            <span>上传备份</span>
          </button>
          <button
              class="tab-btn"
              :class="{ active: activeTab === 'restore' }"
              @click="activeTab = 'restore'"
          >
            <i class="fas fa-cloud-download-alt"></i>
            <span>恢复备份</span>
          </button>
          <button
              class="tab-btn"
              :class="{ active: activeTab === 'history' }"
              @click="activeTab = 'history'"
          >
            <i class="fas fa-history"></i>
            <span>备份历史</span>
          </button>
        </div>

        <!-- 上传备份标签页 -->
        <div v-if="activeTab === 'upload'" class="upload-section">
          <div class="section-info">
            <i class="fas fa-info-circle"></i>
            <span>选择要上传的数据类型，点击"开始备份"上传到云端</span>
          </div>

          <!-- 数据选择区域 -->
          <div class="data-select-group">
            <div class="select-all-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="selectAll" @change="handleSelectAll">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">全选</span>
              </label>
              <span class="selected-count">已选择 {{ selectedCount }} / {{ totalCount }} 项</span>
            </div>

            <div class="data-categories">
              <!-- 个人记账 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('personal') }" @click="toggleDataType('personal')">
                <div class="category-icon personal">
                  <i class="fas fa-user"></i>
                </div>
                <div class="category-info">
                  <h4>个人记账</h4>
                  <p>日常收支、个人消费记录</p>
                  <span class="data-count">约 {{ dataCounts.personal }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('personal')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 生意记账 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('business') }" @click="toggleDataType('business')">
                <div class="category-icon business">
                  <i class="fas fa-calculator"></i>
                </div>
                <div class="category-info">
                  <h4>生意记账</h4>
                  <p>生意收支、客户交易记录</p>
                  <span class="data-count">约 {{ dataCounts.business }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('business')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 个人存钱计划 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('personal_saving') }" @click="toggleDataType('personal_saving')">
                <div class="category-icon personal_saving">
                  <i class="fas fa-piggy-bank"></i>
                </div>
                <div class="category-info">
                  <h4>个人存钱计划</h4>
                  <p>个人存钱目标、存钱记录</p>
                  <span class="data-count">约 {{ dataCounts.personal_saving }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('personal_saving')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 客户管理 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('customer') }" @click="toggleDataType('customer')">
                <div class="category-icon customer">
                  <i class="fas fa-users"></i>
                </div>
                <div class="category-info">
                  <h4>客户管理</h4>
                  <p>客户信息、赊账记录</p>
                  <span class="data-count">约 {{ dataCounts.customer }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('customer')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 商品管理 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('product') }" @click="toggleDataType('product')">
                <div class="category-icon product">
                  <i class="fas fa-boxes"></i>
                </div>
                <div class="category-info">
                  <h4>商品管理</h4>
                  <p>商品信息、分类、供应商</p>
                  <span class="data-count">约 {{ dataCounts.product }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('product')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 库存管理 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('inventory') }" @click="toggleDataType('inventory')">
                <div class="category-icon inventory">
                  <i class="fas fa-warehouse"></i>
                </div>
                <div class="category-info">
                  <h4>库存管理</h4>
                  <p>库存记录、采购历史</p>
                  <span class="data-count">约 {{ dataCounts.inventory }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('inventory')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 支出记录 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('expense') }" @click="toggleDataType('expense')">
                <div class="category-icon expense">
                  <i class="fas fa-arrow-down"></i>
                </div>
                <div class="category-info">
                  <h4>支出记录</h4>
                  <p>日常支出、采购支出记录</p>
                  <span class="data-count">约 {{ dataCounts.expense }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('expense')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 收入记录 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('income') }" @click="toggleDataType('income')">
                <div class="category-icon income">
                  <i class="fas fa-arrow-up"></i>
                </div>
                <div class="category-info">
                  <h4>收入记录</h4>
                  <p>销售收入、其他收入记录</p>
                  <span class="data-count">约 {{ dataCounts.income }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('income')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 支出还款记录 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('expense_repayment') }" @click="toggleDataType('expense_repayment')">
                <div class="category-icon expense_repayment">
                  <i class="fas fa-undo-alt"></i>
                </div>
                <div class="category-info">
                  <h4>支出还款记录</h4>
                  <p>应付账款还款历史</p>
                  <span class="data-count">约 {{ dataCounts.expense_repayment }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('expense_repayment')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 收入收款记录 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('income_collection') }" @click="toggleDataType('income_collection')">
                <div class="category-icon income_collection">
                  <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="category-info">
                  <h4>收入收款记录</h4>
                  <p>应收账款收款历史</p>
                  <span class="data-count">约 {{ dataCounts.income_collection }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('income_collection')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>

              <!-- 客户还款记录 -->
              <div class="category-card" :class="{ selected: selectedDataTypes.includes('customer_repayment') }" @click="toggleDataType('customer_repayment')">
                <div class="category-icon customer_repayment">
                  <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="category-info">
                  <h4>客户还款记录</h4>
                  <p>客户还款历史</p>
                  <span class="data-count">约 {{ dataCounts.customer_repayment }} 条</span>
                </div>
                <div class="category-check">
                  <i v-if="selectedDataTypes.includes('customer_repayment')" class="fas fa-check-circle"></i>
                  <i v-else class="far fa-circle"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- 备份备注 -->
          <div class="form-group">
            <label><i class="fas fa-comment"></i> 备份备注（可选）</label>
            <textarea
                v-model="backupNote"
                class="form-input form-textarea"
                placeholder="填写备份说明，方便日后识别..."
                rows="2"
                maxlength="200"
            ></textarea>
            <span class="char-count">{{ backupNote.length }}/200</span>
          </div>

          <!-- 上传按钮 -->
          <div class="action-buttons">
            <button class="btn btn-secondary" @click="resetSelection">
              <i class="fas fa-undo-alt"></i> 重置选择
            </button>
            <button class="btn btn-primary" @click="uploadBackup" :disabled="selectedCount === 0 || uploading">
              <i v-if="uploading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-cloud-upload-alt"></i>
              {{ uploading ? '上传中...' : `开始备份 (${selectedCount}项)` }}
            </button>
          </div>

          <!-- 上传进度 -->
          <div v-if="uploading" class="progress-bar-container">
            <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
            <span class="progress-text">{{ uploadProgress }}%</span>
          </div>
        </div>

        <!-- 恢复备份标签页 -->
        <div v-if="activeTab === 'restore'" class="restore-section">
          <div class="section-info warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>恢复数据将覆盖当前数据，请谨慎操作！建议先备份当前数据</span>
          </div>

          <div class="backup-list" v-if="backups.length > 0">
            <div class="list-header">
              <span>备份时间</span>
              <span>数据大小</span>
              <span>包含数据类型</span>
              <span>操作</span>
            </div>
            <div v-for="backup in backups" :key="backup.id" class="backup-item" :class="{ 'restoring': restoringBackupId === backup.id }">
              <div class="backup-time">
                <i class="far fa-calendar-alt"></i>
                {{ formatDate(backup.backupTime) }}
              </div>
              <div class="backup-size">
                {{ formatSize(backup.dataSize) }}
              </div>
              <div class="backup-types">
                <span v-for="type in backup.dataTypes" :key="type" class="type-badge" :class="type">
                  {{ getDataTypeName(type) }}
                </span>
              </div>
              <div class="backup-actions">
                <button class="icon-btn restore" @click="restoreBackup(backup)" :disabled="restoringBackupId === backup.id" title="恢复">
                  <i v-if="restoringBackupId === backup.id" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-download"></i>
                </button>
                <button class="icon-btn delete" @click="deleteBackup(backup)" title="删除">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="fas fa-cloud"></i>
            <p>暂无备份记录</p>
            <p class="hint-text">点击"上传备份"开始创建第一个备份</p>
          </div>
        </div>

        <!-- 备份历史标签页 -->
        <div v-if="activeTab === 'history'" class="history-section">
          <div class="backup-stats" v-if="backups.length > 0">
            <div class="stat-card">
              <div class="stat-value">{{ backups.length }}</div>
              <div class="stat-label">备份总数</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ formatTotalSize() }}</div>
              <div class="stat-label">总占用空间</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ getLatestBackupTime() }}</div>
              <div class="stat-label">最近备份</div>
            </div>
          </div>

          <div class="backup-timeline" v-if="backups.length > 0">
            <div v-for="backup in backups" :key="backup.id" class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <span class="timeline-time">{{ formatDateTime(backup.backupTime) }}</span>
                  <span class="timeline-size">{{ formatSize(backup.dataSize) }}</span>
                </div>
                <div class="timeline-body">
                  <div class="timeline-types">
                    <span v-for="type in backup.dataTypes" :key="type" class="type-badge small" :class="type">
                      {{ getDataTypeName(type) }}
                    </span>
                  </div>
                  <div class="timeline-note" v-if="backup.note">
                    <i class="fas fa-comment"></i>
                    {{ backup.note }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="fas fa-history"></i>
            <p>暂无备份历史</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { notificationService } from '@/services'
import backupService from '@/services/api/backup.service.js'
import businessDataService from '@/services/cache/business-cache.service.js'
import { authHelperService } from '@/services'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// ==================== 状态 ====================
const activeTab = ref('upload')
const uploading = ref(false)
const uploadProgress = ref(0)
const backupNote = ref('')
const backups = ref([])
const restoringBackupId = ref(null)

// 选择的数据类型
const selectedDataTypes = ref([
  'personal', 'business', 'personal_saving',
  'customer', 'product', 'inventory',
  'expense', 'income', 'expense_repayment',
  'income_collection', 'customer_repayment'
])

// 各类型数据统计
const dataCounts = reactive({
  personal: 0,
  business: 0,
  personal_saving: 0,
  customer: 0,
  product: 0,
  inventory: 0,
  expense: 0,
  income: 0,
  expense_repayment: 0,
  income_collection: 0,
  customer_repayment: 0
})

// ==================== 计算属性 ====================
const totalCount = computed(() => Object.keys(dataCounts).length)

const selectedCount = computed(() => selectedDataTypes.value.length)

const selectAll = computed({
  get: () => selectedDataTypes.value.length === totalCount.value,
  set: (val) => {
    if (val) {
      selectedDataTypes.value = [...Object.keys(dataCounts)]
    } else {
      selectedDataTypes.value = []
    }
  }
})

// ==================== 辅助函数 ====================
const getDataTypeName = (type) => backupService.getDataTypeName(type)

const formatDate = (dateStr) => backupService.formatDate(dateStr)

const formatDateTime = (dateStr) => backupService.formatDateTime(dateStr)

const formatSize = (bytes) => backupService.formatSize(bytes)

const formatTotalSize = () => {
  const total = backups.value.reduce((sum, b) => sum + (b.dataSize || 0), 0)
  return formatSize(total)
}

const getLatestBackupTime = () => {
  if (backups.value.length === 0) return '无'
  const latest = backups.value[0]
  return formatDate(latest.backupTime)
}

// 切换数据类型选择
const toggleDataType = (type) => {
  const index = selectedDataTypes.value.indexOf(type)
  if (index === -1) {
    selectedDataTypes.value.push(type)
  } else {
    selectedDataTypes.value.splice(index, 1)
  }
}

const handleSelectAll = () => {
  if (selectAll.value) {
    selectedDataTypes.value = [...Object.keys(dataCounts)]
  } else {
    selectedDataTypes.value = []
  }
}

const resetSelection = () => {
  selectedDataTypes.value = [...Object.keys(dataCounts)]
  backupNote.value = ''
}

// 加载数据统计
const loadDataCounts = async () => {
  try {
    const counts = await backupService.getDataCounts()
    Object.assign(dataCounts, counts)
  } catch (error) {
    console.error('加载数据统计失败:', error)
  }
}

// 上传备份
const uploadBackup = async () => {
  if (selectedDataTypes.value.length === 0) {
    notificationService.showNotification('请至少选择一种数据类型', 'warning')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const result = await backupService.uploadBackup({
      dataTypes: selectedDataTypes.value,
      note: backupNote.value,
      onProgress: (progress) => {
        uploadProgress.value = progress
      }
    })

    notificationService.showNotification(result.message, 'success')

    // 重置进度
    setTimeout(() => {
      uploadProgress.value = 0
    }, 1000)

    // 刷新备份列表
    await loadBackups()

    // 可选：切换到历史标签页
    if (activeTab.value === 'upload') {
      setTimeout(() => {
        activeTab.value = 'history'
      }, 1500)
    }
  } catch (error) {
    console.error('上传备份失败:', error)
    notificationService.showNotification('上传失败：' + (error.message || '网络错误'), 'error')
    uploadProgress.value = 0
  } finally {
    uploading.value = false
  }
}

// 加载备份列表
const loadBackups = async () => {
  try {
    backups.value = await backupService.getBackupList()
  } catch (error) {
    console.error('加载备份列表失败:', error)
    backups.value = []
  }
}

// 恢复备份
const restoreBackup = async (backup) => {
  const confirm = window.confirm(
      `确定要恢复 ${formatDateTime(backup.backupTime)} 的备份吗？\n` +
      `包含数据类型：${backup.dataTypes.map(t => getDataTypeName(t)).join('、')}\n\n` +
      `⚠️ 警告：当前数据将被覆盖！`
  )
  if (!confirm) return

  restoringBackupId.value = backup.id

  try {
    const result = await backupService.restoreBackup(backup)
    notificationService.showNotification(result.message, 'success')
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    console.error('恢复备份失败:', error)
    notificationService.showNotification('恢复失败：' + (error.message || '网络错误'), 'error')
  } finally {
    restoringBackupId.value = null
  }
}

// 删除备份
const deleteBackup = async (backup) => {
  const confirm = window.confirm(`确定要删除 ${formatDateTime(backup.backupTime)} 的备份吗？`)
  if (!confirm) return

  try {
    const result = await backupService.deleteBackup(backup)
    notificationService.showNotification(result.message, 'success')
    await loadBackups()
  } catch (error) {
    console.error('删除备份失败:', error)
    notificationService.showNotification('删除失败：' + (error.message || '网络错误'), 'error')
  }
}

// 关闭弹窗
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// 初始化服务
const initService = () => {
  const currentUser = authHelperService.getCurrentUser()
  if (currentUser) {
    backupService.init(currentUser.id)
  }
}

// 监听 visible 变化
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    initService()
    await loadDataCounts()
    await loadBackups()
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
  max-width: 800px;
  border-radius: 20px;
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

.modal-body {
  padding: 25px;
  overflow-y: auto;
  max-height: calc(85vh - 80px);
}

/* 标签页 */
.backup-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  background: #f8f9fa;
  padding: 5px;
  border-radius: 30px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 25px;
  background: transparent;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn.active {
  background: #80A492;
  color: white;
}

.tab-btn i {
  font-size: 16px;
}

/* 信息提示 */
.section-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #e8f4fd;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #0066cc;
}

.section-info.warning {
  background: #fff3e0;
  color: #e67e22;
}

.section-info i {
  font-size: 18px;
}

/* 数据选择区域 */
.data-select-group {
  margin-bottom: 20px;
}

.select-all-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #80A492;
  border-radius: 4px;
  display: inline-block;
  position: relative;
}

.checkbox-label input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  font-size: 14px;
  color: #80A492;
}

.checkbox-text {
  font-size: 14px;
  color: #333;
}

.selected-count {
  font-size: 13px;
  color: #80A492;
}

.data-categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.category-card:hover {
  border-color: #80A492;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-card.selected {
  border-color: #80A492;
  background: rgba(128, 164, 146, 0.05);
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
}

.category-icon.personal { background: #2ecc71; }
.category-icon.business { background: #3498db; }
.category-icon.personal_saving { background: #f39c12; }
.category-icon.customer { background: #e74c3c; }
.category-icon.product { background: #9b59b6; }
.category-icon.inventory { background: #1abc9c; }
.category-icon.expense { background: #e67e22; }
.category-icon.income { background: #2ecc71; }
.category-icon.expense_repayment { background: #f1c40f; }
.category-icon.income_collection { background: #3498db; }
.category-icon.customer_repayment { background: #9b59b6; }

.category-info {
  flex: 1;
}

.category-info h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #333;
}

.category-info p {
  font-size: 11px;
  color: #999;
  margin: 0 0 4px 0;
}

.data-count {
  font-size: 10px;
  color: #80A492;
  background: rgba(128, 164, 146, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.category-check {
  font-size: 18px;
  color: #80A492;
}

/* 表单 */
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
  padding: 12px 15px;
  border: 1px solid #B1D5C8;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #80A492;
  box-shadow: 0 0 0 2px rgba(128, 164, 146, 0.2);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* 按钮 */
.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
}

/* 进度条 */
.progress-bar-container {
  margin-top: 15px;
  position: relative;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #80A492;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 11px;
  color: #80A492;
}

/* 备份列表 */
.backup-list {
  max-height: 400px;
  overflow-y: auto;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 80px 1fr 80px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #80A492;
  margin-bottom: 10px;
}

.backup-item {
  display: grid;
  grid-template-columns: 1fr 80px 1fr 80px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.backup-item.restoring {
  opacity: 0.6;
  background: #f8f9fa;
}

.backup-item:hover {
  border-color: #80A492;
  background: rgba(128, 164, 146, 0.05);
}

.backup-time {
  font-size: 13px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.backup-size {
  font-size: 12px;
  color: #666;
}

.backup-types {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  color: white;
}

.type-badge.personal { background: #2ecc71; }
.type-badge.business { background: #3498db; }
.type-badge.personal_saving { background: #f39c12; }
.type-badge.customer { background: #e74c3c; }
.type-badge.product { background: #9b59b6; }
.type-badge.inventory { background: #1abc9c; }
.type-badge.expense { background: #e67e22; }
.type-badge.income { background: #2ecc71; }
.type-badge.expense_repayment { background: #f1c40f; }
.type-badge.income_collection { background: #3498db; }
.type-badge.customer_repayment { background: #9b59b6; }
.type-badge.small {
  padding: 2px 6px;
  font-size: 9px;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.restore {
  color: #3498db;
}

.icon-btn.restore:hover {
  background: rgba(52, 152, 219, 0.1);
}

.icon-btn.delete {
  color: #e74c3c;
}

.icon-btn.delete:hover {
  background: rgba(231, 76, 60, 0.1);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 统计卡片 */
.backup-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #80A492;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

/* 时间线 */
.backup-timeline {
  position: relative;
  padding-left: 20px;
}

.backup-timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 8px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #80A492;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #e0e0e0;
}

.timeline-content {
  background: white;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.timeline-time {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.timeline-size {
  font-size: 12px;
  color: #80A492;
}

.timeline-body {
  font-size: 12px;
}

.timeline-types {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.timeline-note {
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state i {
  font-size: 60px;
  color: #B1D5C8;
  margin-bottom: 15px;
}

.empty-state p {
  font-size: 14px;
  margin: 5px 0;
}

.hint-text {
  font-size: 12px;
  color: #B1D5C8;
}

/* 响应式 */
@media (max-width: 600px) {
  .modal-content {
    width: 95%;
  }

  .data-categories {
    grid-template-columns: 1fr;
  }

  .list-header,
  .backup-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .backup-stats {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>