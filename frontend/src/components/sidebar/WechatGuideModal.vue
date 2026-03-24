<template>
  <div class="modal" :class="{ active: visible }" @click="closeOnOverlay">
    <div class="modal-content wechat-guide-modal">
      <div class="modal-header">
        <i class="fab fa-weixin"></i>
        <h3>微信账单导出教程</h3>
        <button class="modal-close" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <div class="guide-content">
          <!-- 步骤说明 -->
          <div class="steps-summary">
            <div class="step-item" v-for="(step, index) in steps" :key="index">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-text">{{ step }}</div>
            </div>
          </div>

          <!-- 图片展示区 -->
          <div class="images-gallery">
            <div
                v-for="(image, index) in images"
                :key="index"
                class="image-item"
                @click="openImageModal(image, index)"
            >
              <img :src="image.src" :alt="image.alt" loading="lazy">
              <div class="image-caption">{{ image.caption }}</div>
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

    <!-- 图片放大查看弹窗 -->
    <div
        class="image-modal"
        :class="{ active: imageModalVisible }"
        @click="closeImageModal"
    >
      <div class="image-modal-content" @click.stop>
        <button class="image-modal-close" @click="closeImageModal">
          <i class="fas fa-times"></i>
        </button>
        <img :src="currentImageSrc" :alt="currentImageAlt">
        <div class="image-modal-nav">
          <button
              class="nav-btn prev-btn"
              @click="prevImage"
              :disabled="currentImageIndex === 0"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="image-counter">{{ currentImageIndex + 1 }} / {{ images.length }}</span>
          <button
              class="nav-btn next-btn"
              @click="nextImage"
              :disabled="currentImageIndex === images.length - 1"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div class="image-modal-caption">{{ currentImageCaption }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'close'])

// 步骤说明文本
const steps = [
  '打开微信，点击右下角"我"',
  '点击"服务"进入支付页面',
  '点击右上角"..."，选择"账单"',
  '点击右上角"常见问题"',
  '选择"下载账单"',
  '选择"用于个人对账"',
  '选择账单时间范围',
  '填写邮箱地址，确认导出',
  '查收邮件，下载Excel文件'
]

// 图片列表（按数字顺序排列）
const images = [
  {
    src: new URL('@/assets/1.png', import.meta.url).href,
    alt: '微信账单导出步骤1',
    caption: '步骤1：点击服务'
  },
  {
    src: new URL('@/assets/2.png', import.meta.url).href,
    alt: '微信账单导出步骤2',
    caption: '步骤2：点击钱包'
  },
  {
    src: new URL('@/assets/3.png', import.meta.url).href,
    alt: '微信账单导出步骤3',
    caption: '步骤3：进入账单'
  },
  {
    src: new URL('@/assets/4.png', import.meta.url).href,
    alt: '微信账单导出步骤4',
    caption: '步骤4：点击更多'
  },
  {
    src: new URL('@/assets/5.png', import.meta.url).href,
    alt: '微信账单导出步骤5',
    caption: '步骤5：点击下载账单'
  }
]

// 图片放大查看相关
const imageModalVisible = ref(false)
const currentImageIndex = ref(0)

const currentImageSrc = computed(() => images[currentImageIndex.value]?.src || '')
const currentImageAlt = computed(() => images[currentImageIndex.value]?.alt || '')
const currentImageCaption = computed(() => images[currentImageIndex.value]?.caption || '')

const openImageModal = (image, index) => {
  currentImageIndex.value = index
  imageModalVisible.value = true
}

const closeImageModal = () => {
  imageModalVisible.value = false
}

const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

const nextImage = () => {
  if (currentImageIndex.value < images.length - 1) {
    currentImageIndex.value++
  }
}

const close = () => {
  emit('update:visible', false)
  emit('close')
  closeImageModal()
}

const closeOnOverlay = (event) => {
  if (event.target.classList.contains('modal')) {
    close()
  }
}
</script>

<style scoped>
/* 基础模态框样式 */
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
  max-width: 800px;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  max-height: 85vh;
  /* 隐藏外层滚动条 */
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
}

.wechat-guide-modal {
  width: 90%;
  max-width: 800px;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
  flex-shrink: 0;
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
  /* 内容区域滚动 */
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

/* modal-body 自定义滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #B1D5C8;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #80A492;
}

/* Firefox 滚动条样式 */
.modal-body {
  scrollbar-width: thin;
  scrollbar-color: #B1D5C8 #f1f1f1;
}

.modal-footer {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid var(--primary-color);
  flex-shrink: 0;
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

/* 教程内容样式 */
.guide-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 步骤说明区域 */
.steps-summary {
  background-color: rgba(213, 235, 225, 0.1);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--primary-color);
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 10px;
  transition: background-color 0.3s;
}

.step-item:hover {
  background-color: rgba(128, 164, 146, 0.1);
}

.step-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--accent-color), var(--secondary-color));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-dark);
  line-height: 1.5;
}

/* 图片展示区 */
.images-gallery {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 5px;
}

.image-item {
  background-color: var(--white);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid var(--primary-color);
  display: flex;
  flex-direction: column;
}

.image-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.image-item img {
  width: 100%;
  height: auto;
  display: block;
  background-color: #f5f5f5;
}

.image-caption {
  padding: 12px;
  font-size: 13px;
  color: var(--text-light);
  text-align: center;
  background-color: rgba(213, 235, 225, 0.2);
  border-top: 1px solid var(--primary-color);
  font-weight: 500;
}

/* 图片放大查看弹窗 */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.image-modal.active {
  opacity: 1;
  visibility: visible;
}

.image-modal-content {
  position: relative;
  max-width: 95%;
  max-height: 95%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-modal-content img {
  max-width: 100%;
  max-height: 80vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.image-modal-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.image-modal-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.image-counter {
  color: white;
  font-size: 14px;
  padding: 5px 12px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
}

.image-modal-caption {
  margin-top: 15px;
  color: white;
  font-size: 14px;
  text-align: center;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  max-width: 90%;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .wechat-guide-modal {
    width: 95%;
    max-width: 95%;
  }

  .step-text {
    font-size: 12px;
  }

  .image-caption {
    font-size: 11px;
    padding: 8px;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .image-counter {
    font-size: 12px;
  }

  .image-modal-content img {
    max-height: 70vh;
  }
}

@media (max-width: 480px) {
  .steps-summary {
    padding: 12px;
  }

  .step-item {
    padding: 4px;
  }

  .step-number {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .step-text {
    font-size: 11px;
  }
}
</style>