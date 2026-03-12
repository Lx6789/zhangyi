<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content">
      <div class="modal-header">
        <i class="fas fa-exchange-alt"></i>
        <h3>数据迁移</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="data-transfer-container">
          <!-- 导出数据 -->
          <div class="transfer-section">
            <div class="section-icon">
              <i class="fas fa-file-export"></i>
            </div>
            <div class="section-content">
              <h4>导出数据</h4>
              <p>将您的记账数据导出为文件，用于备份或迁移</p>
              <div class="export-options">
                <div class="option-item">
                  <input type="radio" id="exportAll" value="all" v-model="exportType">
                  <label for="exportAll">导出全部数据</label>
                </div>
                <div class="option-item">
                  <input type="radio" id="exportYear" value="year" v-model="exportType">
                  <label for="exportYear">导出指定年份</label>
                  <select v-if="exportType === 'year'" v-model="selectedYear" class="year-select">
                    <option v-for="year in availableYears" :key="year" :value="year">{{ year }}年</option>
                  </select>
                </div>
              </div>
              <button class="action-btn export-btn" @click="handleExport" :disabled="exporting">
                <i class="fas fa-download"></i>
                <span>{{ exporting ? '导出中...' : '开始导出' }}</span>
              </button>
            </div>
          </div>

          <div class="transfer-divider">
            <span>或</span>
          </div>

          <!-- 导入数据 -->
          <div class="transfer-section">
            <div class="section-icon">
              <i class="fas fa-file-import"></i>
            </div>
            <div class="section-content">
              <h4>导入数据</h4>
              <p>从备份文件恢复数据，支持 JSON 格式</p>
              <div class="import-area"
                   @dragover.prevent="dragOver"
                   @dragleave.prevent="dragLeave"
                   @drop.prevent="handleDrop"
                   :class="{ 'drag-over': isDragging }">
                <input type="file" ref="fileInput" accept=".json" @change="handleFileSelect" style="display: none">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>点击或拖拽文件到此处上传</p>
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
              <button class="action-btn import-btn" @click="handleImport" :disabled="!selectedFile || importing">
                <i class="fas fa-upload"></i>
                <span>{{ importing ? '导入中...' : '开始导入' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 提示信息 -->
        <div class="transfer-note">
          <i class="fas fa-info-circle"></i>
          <span>导入数据将覆盖现有数据，请谨慎操作</span>
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
import { ref, computed, watch } from 'vue'
import businessDataService from '@/services/business-data.service.js'
import notificationService from '@/services/utils/notification.service.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const exportType = ref('all')
const selectedYear = ref(new Date().getFullYear().toString())
const exporting = ref(false)
const importing = ref(false)

// 可用年份列表
const availableYears = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i.toString())
  }
  return years
})

// 监听弹框关闭时重置状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    resetState()
  }
})

// 重置状态
const resetState = () => {
  selectedFile.value = null
  isDragging.value = false
  exportType.value = 'all'
  selectedYear.value = new Date().getFullYear().toString()
}

// 选择文件
const selectFile = () => {
  fileInput.value.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      notificationService.showNotification('请选择 JSON 格式的文件', 'warning')
      return
    }
    selectedFile.value = file
  }
}

// 拖拽相关
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
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      notificationService.showNotification('请上传 JSON 格式的文件', 'warning')
      return
    }
    selectedFile.value = file
  }
}

// 处理导出
const handleExport = async () => {
  exporting.value = true
  try {
    let data
    if (exportType.value === 'all') {
      data = await businessDataService.exportAllData()
    } else {
      data = await businessDataService.exportYearData(selectedYear.value)
    }

    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const fileName = exportType.value === 'all'
        ? `账易数据备份_${new Date().toISOString().split('T')[0]}.json`
        : `账易数据_${selectedYear.value}年_${new Date().toISOString().split('T')[0]}.json`
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)

    notificationService.showNotification('导出成功', 'success')
  } catch (error) {
    console.error('导出失败:', error)
    notificationService.showNotification('导出失败，请重试', 'error')
  } finally {
    exporting.value = false
  }
}

// 处理导入
const handleImport = async () => {
  if (!selectedFile.value) return

  importing.value = true
  try {
    const text = await selectedFile.value.text()
    const data = JSON.parse(text)

    // 确认导入
    const confirmImport = confirm('导入数据将覆盖当前所有数据，是否继续？')
    if (!confirmImport) {
      return
    }

    await businessDataService.importData(data)
    notificationService.showNotification('导入成功', 'success')
    selectedFile.value = null

    // 关闭弹框
    setTimeout(() => {
      close()
    }, 1500)
  } catch (error) {
    console.error('导入失败:', error)
    notificationService.showNotification('导入失败，请检查文件格式', 'error')
  } finally {
    importing.value = false
  }
}

// 关闭弹框
const close = () => {
  emit('update:visible', false)
  emit('close')
}

// 点击遮罩层关闭
const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--overlay);
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
  max-height: 80vh;
  overflow-y: auto;
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
  max-height: calc(80vh - 150px);
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

/* 数据迁移容器 */
.data-transfer-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.transfer-section {
  display: flex;
  gap: 20px;
  padding: 20px;
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 15px;
  border: 1px solid var(--primary-color);
}

.section-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--accent-color);
  flex-shrink: 0;
}

.section-content {
  flex: 1;
}

.section-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-color);
  margin: 0 0 5px 0;
}

.section-content p {
  font-size: 14px;
  color: var(--text-light);
  margin: 0 0 15px 0;
}

/* 导出选项 */
.export-options {
  margin-bottom: 15px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-item input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-color);
}

.option-item label {
  font-size: 14px;
  color: var(--text-dark);
  cursor: pointer;
}

.year-select {
  margin-left: 10px;
  padding: 5px 10px;
  border: 1px solid var(--secondary-color);
  border-radius: 8px;
  background-color: var(--white);
  color: var(--text-dark);
  font-size: 14px;
}

/* 导入区域 */
.import-area {
  border: 2px dashed var(--secondary-color);
  border-radius: 12px;
  padding: 20px;
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
  font-size: 40px;
  color: var(--accent-color);
  margin-bottom: 10px;
}

.import-area p {
  font-size: 14px;
  color: var(--text-light);
  margin: 0 0 10px 0;
}

/* 文件信息 */
.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: rgba(213, 235, 225, 0.2);
  border-radius: 10px;
  margin-bottom: 15px;
}

.file-info i.fa-file {
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
  font-size: 16px;
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
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
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
  background-color: var(--accent-color);
  color: var(--white);
}

.export-btn:hover:not(:disabled) {
  background-color: #6a8f7e;
}

.import-btn {
  background-color: var(--primary-color);
  color: var(--accent-color);
}

.import-btn:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.select-file-btn {
  background-color: transparent;
  border: 1px solid var(--secondary-color);
  color: var(--accent-color);
  width: auto;
  display: inline-flex;
  padding: 8px 16px;
}

.select-file-btn:hover {
  background-color: rgba(128, 164, 146, 0.1);
}

/* 分隔线 */
.transfer-divider {
  text-align: center;
  position: relative;
}

.transfer-divider::before,
.transfer-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - 30px);
  height: 1px;
  background-color: var(--secondary-color);
}

.transfer-divider::before {
  left: 0;
}

.transfer-divider::after {
  right: 0;
}

.transfer-divider span {
  background-color: var(--white);
  padding: 0 10px;
  color: var(--text-light);
  font-size: 14px;
}

/* 提示信息 */
.transfer-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #fff3cd;
  border-radius: 10px;
  color: #856404;
  font-size: 13px;
  border: 1px solid #ffeeba;
}

.transfer-note i {
  font-size: 16px;
}

@media (max-width: 480px) {
  .transfer-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .option-item {
    justify-content: center;
  }

  .year-select {
    margin-left: 0;
    margin-top: 5px;
    width: 100%;
  }
}
</style>