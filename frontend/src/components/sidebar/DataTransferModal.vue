<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content data-transfer-modal">
      <div class="modal-header">
        <i class="fas fa-exchange-alt"></i>
        <h3>数据迁移</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- 标签页切换 -->
        <div class="transfer-tabs">
          <button
              class="tab-btn"
              :class="{ active: activeTab === 'export' }"
              @click="activeTab = 'export'"
          >
            <i class="fas fa-file-export"></i>
            <span>导出数据</span>
          </button>
          <button
              class="tab-btn"
              :class="{ active: activeTab === 'import' }"
              @click="activeTab = 'import'"
          >
            <i class="fas fa-file-import"></i>
            <span>导入数据</span>
          </button>
        </div>

        <!-- 导出面板 -->
        <div v-if="activeTab === 'export'" class="export-panel">
          <div class="export-options-container">
            <div class="export-section">
              <div class="section-title">
                <i class="fas fa-chart-line"></i>
                <h4>收支数据</h4>
              </div>
              <div class="option-group">
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.incomeExpense">
                  <span>导出收支数据</span>
                </label>
                <div class="sub-options" v-if="exportOptions.incomeExpense">
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="exportOptions.incomeExpenseType.personal">
                    <span>个人记账</span>
                  </label>
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="exportOptions.incomeExpenseType.business">
                    <span>生意记账</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="export-section">
              <div class="section-title">
                <i class="fas fa-piggy-bank"></i>
                <h4>存钱数据</h4>
              </div>
              <div class="option-group">
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.saving">
                  <span>导出存钱数据</span>
                </label>
                <div class="sub-options" v-if="exportOptions.saving">
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="exportOptions.savingType.personal">
                    <span>个人存钱</span>
                  </label>
                  <label class="option-checkbox">
                    <input type="checkbox" v-model="exportOptions.savingType.group">
                    <span>多人存钱</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="export-section">
              <div class="section-title">
                <i class="fas fa-boxes"></i>
                <h4>库存与商品数据</h4>
              </div>
              <div class="option-group">
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.inventory">
                  <span>导出库存数据</span>
                </label>
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.products">
                  <span>导出商品数据</span>
                </label>
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.categories">
                  <span>导出商品分类</span>
                </label>
              </div>
            </div>

            <div class="export-section">
              <div class="section-title">
                <i class="fas fa-handshake"></i>
                <h4>业务数据</h4>
              </div>
              <div class="option-group">
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.suppliers">
                  <span>导出供应商</span>
                </label>
                <label class="option-checkbox">
                  <input type="checkbox" v-model="exportOptions.customers">
                  <span>导出客户</span>
                </label>
              </div>
            </div>

            <!-- 日期范围筛选 -->
            <div class="export-section">
              <div class="section-title">
                <i class="fas fa-calendar-alt"></i>
                <h4>时间范围（收支数据）</h4>
              </div>
              <div class="date-range">
                <div class="date-input-group">
                  <label>开始日期</label>
                  <input type="date" v-model="dateRange.start" class="date-input">
                </div>
                <span class="date-separator">至</span>
                <div class="date-input-group">
                  <label>结束日期</label>
                  <input type="date" v-model="dateRange.end" class="date-input">
                </div>
                <button class="clear-date-btn" @click="clearDateRange" title="清除日期筛选">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="date-hint">
                <i class="fas fa-info-circle"></i>
                <span>不选择则导出全部数据</span>
              </div>
            </div>

            <div class="export-actions-bar">
              <button class="select-all-btn" @click="selectAll" :disabled="exporting">
                <i class="fas fa-check-double"></i>
                <span>全选</span>
              </button>
              <button class="deselect-all-btn" @click="deselectAll" :disabled="exporting">
                <i class="fas fa-times"></i>
                <span>取消全选</span>
              </button>
            </div>
          </div>

          <div class="export-actions">
            <button class="action-btn export-btn" @click="handleExport" :disabled="exporting">
              <i class="fas fa-download"></i>
              <span>{{ exporting ? '导出中...' : '开始导出' }}</span>
            </button>
          </div>
          <div v-if="exportProgress" class="export-progress">
            <i class="fas fa-spinner fa-spin"></i>
            <span>{{ exportProgress }}</span>
          </div>
        </div>

        <!-- 导入面板 -->
        <div v-if="activeTab === 'import'" class="import-panel">
          <div class="import-options-container">
            <div class="import-section">
              <div class="section-title">
                <i class="fas fa-info-circle"></i>
                <h4>导入说明</h4>
              </div>
              <div class="import-note">
                <i class="fas fa-exclamation-triangle"></i>
                <span>导入数据将覆盖现有数据，请确保已备份重要数据</span>
              </div>
            </div>

            <div class="import-section">
              <div class="section-title">
                <i class="fas fa-file-upload"></i>
                <h4>选择文件</h4>
              </div>
              <div class="import-area"
                   @dragover.prevent="dragOver"
                   @dragleave.prevent="dragLeave"
                   @drop.prevent="handleDrop"
                   :class="{ 'drag-over': isDragging }">
                <input type="file" ref="fileInput" accept=".json" @change="handleFileSelect" style="display: none">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>点击或拖拽文件到此处上传</p>
                <p class="file-hint">支持 JSON 格式文件</p>
                <button class="action-btn select-file-btn" @click="selectFile">
                  <i class="fas fa-folder-open"></i>
                  <span>选择文件</span>
                </button>
              </div>
              <div v-if="selectedFile" class="file-info">
                <i class="fas fa-file"></i>
                <span>{{ selectedFile.name }}</span>
                <button class="remove-file" @click="selectedFile = null">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div class="import-section">
              <div class="section-title">
                <i class="fas fa-check-circle"></i>
                <h4>导入选项</h4>
              </div>
              <div class="option-group">
                <label class="option-checkbox">
                  <input type="checkbox" v-model="importOptions.clearBeforeImport">
                  <span>导入前清空现有数据</span>
                </label>
              </div>
            </div>
          </div>

          <div class="import-actions">
            <button class="action-btn import-btn" @click="handleImport" :disabled="!selectedFile || importing">
              <i class="fas fa-upload"></i>
              <span>{{ importing ? '导入中...' : '开始导入' }}</span>
            </button>
          </div>
          <div v-if="importProgress" class="import-progress">
            <i class="fas fa-spinner fa-spin"></i>
            <span>{{ importProgress }}</span>
          </div>
          <div v-if="importResult" class="import-result">
            <div class="result-item success">
              <i class="fas fa-check-circle"></i>
              <span>成功导入: {{ importResult.successCount }} 条</span>
            </div>
            <div v-if="importResult.failCount > 0" class="result-item fail">
              <i class="fas fa-times-circle"></i>
              <span>失败: {{ importResult.failCount }} 条</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-cancel" @click="close">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import authHelperService from '@/services/utils/auth-helper.service.js'
import notificationService from '@/services/utils/notification.service.js'
import {Export} from "@/services/data_migration/export.js";
import {Import} from "@/services/data_migration/import.js";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// 使用导出和导入逻辑
const { exportToExcel } = Export()
const {
  parseImportFile,
  importIncomeExpenseData,
  importPersonalSavingData,
  importGroupSavingData,
  importProductsData,
  importInventoryData,
  importCategoriesData,
  importSuppliersData,
  importCustomersData,
  clearUserData
} = Import()

// 状态
const activeTab = ref('export')
const currentUser = ref(null)
const exporting = ref(false)
const importing = ref(false)
const exportProgress = ref('')
const importProgress = ref('')
const importResult = ref(null)

// 文件相关
const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)

// 导出选项
const exportOptions = reactive({
  incomeExpense: true,
  incomeExpenseType: {
    personal: true,
    business: true
  },
  saving: true,
  savingType: {
    personal: true,
    group: true
  },
  inventory: true,
  products: true,
  categories: true,
  suppliers: true,
  customers: true
})

// 导入选项
const importOptions = reactive({
  clearBeforeImport: true
})

// 日期范围
const dateRange = reactive({
  start: '',
  end: ''
})

// 获取当前用户
const fetchCurrentUser = async () => {
  const userFromStorage = authHelperService.getCurrentUser()
  if (userFromStorage && userFromStorage.id) {
    currentUser.value = {
      id: userFromStorage.id,
      username: userFromStorage.username || userFromStorage.nickname || '用户'
    }
  } else {
    const savedUserId = localStorage.getItem('userId')
    if (savedUserId) {
      currentUser.value = {
        id: parseInt(savedUserId),
        username: '用户'
      }
    }
  }
}

// ==================== 导出相关 ====================
const selectAll = () => {
  exportOptions.incomeExpense = true
  exportOptions.incomeExpenseType.personal = true
  exportOptions.incomeExpenseType.business = true
  exportOptions.saving = true
  exportOptions.savingType.personal = true
  exportOptions.savingType.group = true
  exportOptions.inventory = true
  exportOptions.products = true
  exportOptions.categories = true
  exportOptions.suppliers = true
  exportOptions.customers = true
}

const deselectAll = () => {
  exportOptions.incomeExpense = false
  exportOptions.incomeExpenseType.personal = false
  exportOptions.incomeExpenseType.business = false
  exportOptions.saving = false
  exportOptions.savingType.personal = false
  exportOptions.savingType.group = false
  exportOptions.inventory = false
  exportOptions.products = false
  exportOptions.categories = false
  exportOptions.suppliers = false
  exportOptions.customers = false
}

const clearDateRange = () => {
  dateRange.start = ''
  dateRange.end = ''
}

const handleExport = async () => {
  if (!currentUser.value?.id) {
    notificationService.showNotification('请先登录', 'warning')
    return
  }

  exporting.value = true
  exportProgress.value = '正在准备导出数据...'

  try {
    const { workbook, sheets } = await exportToExcel(
        currentUser.value.id,
        exportOptions,
        dateRange,
        (msg) => { exportProgress.value = msg }
    )

    if (sheets.length === 0) {
      notificationService.showNotification('没有选择任何数据或数据为空', 'warning')
      return
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `账易数据导出_${currentUser.value.username}_${timestamp}.xlsx`

    XLSX.writeFile(workbook, fileName)
    notificationService.showNotification(`导出成功，共导出 ${sheets.length} 个工作表`, 'success')
    exportProgress.value = ''
  } catch (error) {
    console.error('导出失败:', error)
    notificationService.showNotification('导出失败：' + (error.message || '未知错误'), 'error')
    exportProgress.value = ''
  } finally {
    exporting.value = false
  }
}

// ==================== 导入相关 ====================
const selectFile = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (!file.name.endsWith('.json')) {
      notificationService.showNotification('请选择 JSON 格式的文件', 'warning')
      return
    }
    selectedFile.value = file
    importResult.value = null
  }
}

const dragOver = () => {
  isDragging.value = true
}

const dragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    if (!file.name.endsWith('.json')) {
      notificationService.showNotification('请上传 JSON 格式的文件', 'warning')
      return
    }
    selectedFile.value = file
    importResult.value = null
  }
}

const handleImport = async () => {
  if (!selectedFile.value) return
  if (!currentUser.value?.id) {
    notificationService.showNotification('请先登录', 'warning')
    return
  }

  const confirmImport = confirm('导入数据将覆盖现有数据，是否继续？')
  if (!confirmImport) return

  importing.value = true
  importProgress.value = '正在解析文件...'
  importResult.value = null

  try {
    const data = await parseImportFile(selectedFile.value)

    // 清空现有数据
    if (importOptions.clearBeforeImport) {
      importProgress.value = '正在清空现有数据...'
      await clearUserData(currentUser.value.id)
    }

    const results = {
      successCount: 0,
      failCount: 0
    }

    // 导入收支数据
    if (data.incomeExpense && data.incomeExpense.length > 0) {
      importProgress.value = '正在导入收支数据...'
      const result = await importIncomeExpenseData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入个人存钱数据
    if (data.personalSaving && data.personalSaving.length > 0) {
      importProgress.value = '正在导入个人存钱数据...'
      const result = await importPersonalSavingData(currentUser.value.id, data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入多人存钱数据
    if (data.groupSaving && data.groupSaving.length > 0) {
      importProgress.value = '正在导入多人存钱数据...'
      const result = await importGroupSavingData(currentUser.value.id, data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入商品数据
    if (data.products && data.products.length > 0) {
      importProgress.value = '正在导入商品数据...'
      const result = await importProductsData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入库存数据
    if (data.inventory && data.inventory.length > 0) {
      importProgress.value = '正在导入库存数据...'
      const result = await importInventoryData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入商品分类
    if (data.categories && data.categories.length > 0) {
      importProgress.value = '正在导入商品分类...'
      const result = await importCategoriesData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入供应商
    if (data.suppliers && data.suppliers.length > 0) {
      importProgress.value = '正在导入供应商...'
      const result = await importSuppliersData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    // 导入客户
    if (data.customers && data.customers.length > 0) {
      importProgress.value = '正在导入客户...'
      const result = await importCustomersData(data)
      results.successCount += result.successCount
      results.failCount += result.failCount
    }

    importResult.value = results
    importProgress.value = ''
    notificationService.showNotification(`导入完成，成功 ${results.successCount} 条，失败 ${results.failCount} 条`, 'success')

    selectedFile.value = null
  } catch (error) {
    console.error('导入失败:', error)
    notificationService.showNotification('导入失败：' + error.message, 'error')
    importProgress.value = ''
  } finally {
    importing.value = false
  }
}

// ==================== 通用 ====================
const close = () => {
  emit('update:visible', false)
  emit('close')
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}

// 重置状态
const resetState = () => {
  selectedFile.value = null
  isDragging.value = false
  importResult.value = null
  exportProgress.value = ''
  importProgress.value = ''
  dateRange.start = ''
  dateRange.end = ''
}

// 监听弹框
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await fetchCurrentUser()
    resetState()
  }
})

// 动态导入 XLSX
import * as XLSX from 'xlsx'
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
  background-color: var(--white);
  width: 90%;
  max-width: 600px;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  overflow-y: auto;
}

.data-transfer-modal {
  width: 95%;
  max-width: 650px;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
  position: sticky;
  top: 0;
  background-color: var(--white);
  z-index: 10;
}

.modal-header i {
  font-size: 24px;
  margin-right: 10px;
  color: var(--accent-color);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-color);
  flex: 1;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--tertiary-color);
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
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.modal-body {
  margin-bottom: 20px;
  max-height: calc(85vh - 120px);
  overflow-y: auto;
  padding-right: 5px;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid var(--primary-color);
  position: sticky;
  bottom: 0;
  background-color: var(--white);
}

.modal-btn {
  padding: 12px 30px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-cancel {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.modal-cancel:hover {
  background-color: var(--secondary-color);
}

/* 标签页 */
.transfer-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  background: var(--primary-color);
  padding: 5px;
  border-radius: 30px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 25px;
  background: transparent;
  color: var(--accent-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn.active {
  background: var(--white);
  color: var(--accent-color);
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* 导出面板 */
.export-panel, .import-panel {
  padding: 5px 0;
}

.export-options-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.import-options-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.export-section, .import-section {
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 12px;
  padding: 15px;
  border: 1px solid var(--primary-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--secondary-color);
}

.section-title i {
  font-size: 18px;
  color: var(--accent-color);
}

.section-title h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-dark);
}

.option-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.sub-options {
  margin-left: 28px;
  padding-left: 12px;
  border-left: 2px solid var(--secondary-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 日期范围 */
.date-range {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.date-input-group {
  flex: 1;
  min-width: 120px;
}

.date-input-group label {
  display: block;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 4px;
}

.date-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--secondary-color);
  border-radius: 8px;
  font-size: 13px;
  background-color: var(--white);
}

.clear-date-btn {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s;
  margin-bottom: 8px;
}

.clear-date-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.date-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-light);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 全选/取消全选按钮 */
.export-actions-bar {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 5px;
}

.select-all-btn, .deselect-all-btn {
  padding: 8px 16px;
  border: 1px solid var(--secondary-color);
  border-radius: 20px;
  background: white;
  color: var(--accent-color);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.select-all-btn:hover, .deselect-all-btn:hover {
  background-color: var(--primary-color);
}

/* 导入区域 */
.import-area {
  border: 2px dashed var(--secondary-color);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 15px;
}

.import-area:hover,
.import-area.drag-over {
  border-color: var(--accent-color);
  background-color: rgba(128, 164, 146, 0.05);
}

.import-area i {
  font-size: 48px;
  color: var(--accent-color);
  margin-bottom: 15px;
}

.import-area p {
  font-size: 14px;
  color: var(--text-light);
  margin: 0 0 5px 0;
}

.file-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 15px !important;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 10px;
  margin-top: 15px;
}

.file-info i {
  font-size: 20px;
  color: var(--accent-color);
}

.file-info span {
  flex: 1;
  font-size: 14px;
  color: var(--text-dark);
  word-break: break-all;
}

.remove-file {
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s;
}

.remove-file:hover {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

/* 操作按钮 */
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  color: var(--white);
}

.export-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(128, 164, 146, 0.4);
}

.import-btn {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  color: var(--white);
}

.import-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(128, 164, 146, 0.4);
}

.select-file-btn {
  background-color: transparent;
  border: 1px solid var(--secondary-color);
  color: var(--accent-color);
  width: auto;
  display: inline-flex;
  padding: 8px 20px;
  margin-top: 5px;
}

.select-file-btn:hover {
  background-color: rgba(128, 164, 146, 0.1);
}

.export-actions, .import-actions {
  margin-top: 20px;
}

/* 进度和结果 */
.export-progress, .import-progress {
  text-align: center;
  padding: 10px;
  color: var(--accent-color);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.import-result {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 10px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
}

.result-item.success {
  color: #2ecc71;
}

.result-item.fail {
  color: #e74c3c;
}

.import-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #fff3cd;
  border-radius: 10px;
  color: #856404;
  font-size: 13px;
}

.import-note i {
  font-size: 16px;
}

/* 响应式 */
@media (max-width: 480px) {
  .date-range {
    flex-direction: column;
    align-items: stretch;
  }

  .date-separator {
    text-align: center;
    padding: 0;
  }

  .clear-date-btn {
    align-self: flex-end;
  }

  .export-actions-bar {
    flex-direction: column;
  }

  .transfer-tabs .tab-btn span {
    display: none;
  }

  .transfer-tabs .tab-btn i {
    font-size: 18px;
  }
}
</style>