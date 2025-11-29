<template>
  <div class="container" style="max-width: 100%;">
    <div class="page-header" style="max-width: 1200px; margin: 0 auto 30px auto;">
      <div>
        <h1 class="page-title">编辑 PPT 大纲</h1>
        <p class="page-subtitle">
          共 {{ pptStore.pageTotal }} 页 · 调整页面顺序、修改标题和内容
        </p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button
          class="btn btn-secondary"
          @click="goBack"
          style="background: white; border: 1px solid var(--border-color);"
        >
          上一步
        </button>
        <button class="btn btn-primary" @click="startGeneration">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          开始生成 PPT
        </button>
      </div>
    </div>

    <div class="outline-grid">
      <div
        v-for="(page, idx) in pptStore.outline.pages"
        :key="page.index"
        class="card outline-card"
        :draggable="true"
        @dragstart="onDragStart($event, idx)"
        @dragover.prevent="onDragOver($event, idx)"
        @drop="onDrop($event, idx)"
        :class="{ 'dragging-over': dragOverIndex === idx }"
      >
        <!-- 卡片顶部 -->
        <div class="card-top-bar">
          <div class="page-info">
            <span class="page-number">P{{ idx + 1 }}</span>
            <span class="page-type" :class="page.type">
              {{ getPageTypeName(page.type) }}
            </span>
          </div>

          <div class="card-controls">
            <div class="drag-handle" title="拖拽排序">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="9" cy="5" r="1"></circle>
                <circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <circle cx="15" cy="19" r="1"></circle>
              </svg>
            </div>
            <button class="icon-btn" @click="deletePage(idx)" title="删除此页">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- 标题 -->
        <div class="form-group">
          <label class="form-label-sm">标题</label>
          <input
            v-model="page.title"
            class="form-input-sm"
            placeholder="幻灯片标题"
            @input="updatePage(page.index, { title: page.title })"
          />
        </div>

        <!-- 副标题（仅封面） -->
        <div v-if="page.type === 'cover'" class="form-group">
          <label class="form-label-sm">副标题</label>
          <input
            v-model="page.subtitle"
            class="form-input-sm"
            placeholder="副标题（可选）"
            @input="updatePage(page.index, { subtitle: page.subtitle })"
          />
        </div>

        <!-- 要点列表（非封面、章节页） -->
        <div v-if="page.type !== 'cover' && page.type !== 'section'" class="form-group">
          <label class="form-label-sm">要点</label>
          <div v-for="(bullet, bIdx) in page.bullets || []" :key="bIdx" class="bullet-item">
            <input
              v-model="page.bullets![bIdx]"
              class="form-input-sm"
              placeholder="要点内容"
              @input="updateBullets(page.index, page.bullets!)"
            />
            <button
              class="icon-btn-sm"
              @click="removeBullet(page.index, bIdx)"
              title="删除"
            >
              ×
            </button>
          </div>
          <button class="btn-add-bullet" @click="addBullet(page.index)">
            + 添加要点
          </button>
        </div>

        <!-- 备注（可选） -->
        <div class="form-group">
          <label class="form-label-sm">演讲备注（可选）</label>
          <textarea
            v-model="page.notes"
            class="form-textarea-sm"
            rows="2"
            placeholder="添加演讲备注..."
            @input="updatePage(page.index, { notes: page.notes })"
          />
        </div>
      </div>

      <!-- 添加页面按钮 -->
      <div class="card add-card-dashed" @click="showAddPageMenu = true">
        <div class="add-content">
          <div class="add-icon">+</div>
          <span>添加页面</span>
        </div>
      </div>
    </div>

    <!-- 添加页面菜单 -->
    <div v-if="showAddPageMenu" class="modal-overlay" @click="showAddPageMenu = false">
      <div class="modal-content" @click.stop>
        <h3>选择页面类型</h3>
        <div class="page-type-grid">
          <button class="page-type-btn" @click="addPage('content')">
            <div class="page-type-icon">📄</div>
            <div class="page-type-name">内容页</div>
          </button>
          <button class="page-type-btn" @click="addPage('section')">
            <div class="page-type-icon">📑</div>
            <div class="page-type-name">章节页</div>
          </button>
          <button class="page-type-btn" @click="addPage('summary')">
            <div class="page-type-icon">📝</div>
            <div class="page-type-name">总结页</div>
          </button>
        </div>
      </div>
    </div>

    <div style="height: 100px;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePptStore, type PptPage } from '../../stores/ppt'

const router = useRouter()
const pptStore = usePptStore()

const dragOverIndex = ref<number | null>(null)
const draggedIndex = ref<number | null>(null)
const showAddPageMenu = ref(false)

const getPageTypeName = (type: string) => {
  const names = {
    cover: '封面',
    toc: '目录',
    section: '章节',
    content: '内容',
    summary: '总结',
    thankyou: '结束'
  }
  return names[type as keyof typeof names] || '内容'
}

// 拖拽逻辑
const onDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
  }
}

const onDragOver = (e: DragEvent, index: number) => {
  if (draggedIndex.value === index) return
  dragOverIndex.value = index
}

const onDrop = (e: DragEvent, index: number) => {
  dragOverIndex.value = null
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    pptStore.movePage(draggedIndex.value, index)
  }
  draggedIndex.value = null
}

// 页面操作
const updatePage = (index: number, updates: Partial<PptPage>) => {
  pptStore.updatePage(index, updates)
}

const deletePage = (index: number) => {
  if (confirm('确定要删除这一页吗？')) {
    pptStore.deletePage(index)
  }
}

const addPage = (type: 'content' | 'section' | 'summary') => {
  const newPage: PptPage = {
    index: pptStore.outline.pages.length,
    type,
    title: type === 'section' ? '新章节' : '新页面',
    layout: type === 'section' ? 'section_header' : 'title_and_bullets',
    bullets: type !== 'section' ? [] : undefined
  }
  pptStore.addPage(newPage)
  showAddPageMenu.value = false

  nextTick(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  })
}

// 要点操作
const updateBullets = (pageIndex: number, bullets: string[]) => {
  pptStore.updatePage(pageIndex, { bullets })
}

const addBullet = (pageIndex: number) => {
  const page = pptStore.outline.pages.find(p => p.index === pageIndex)
  if (page) {
    const bullets = page.bullets || []
    bullets.push('')
    pptStore.updatePage(pageIndex, { bullets })
  }
}

const removeBullet = (pageIndex: number, bulletIndex: number) => {
  const page = pptStore.outline.pages.find(p => p.index === pageIndex)
  if (page && page.bullets) {
    const bullets = [...page.bullets]
    bullets.splice(bulletIndex, 1)
    pptStore.updatePage(pageIndex, { bullets })
  }
}

const goBack = () => {
  pptStore.backToInput()
  router.push('/ppt')
}

const startGeneration = () => {
  router.push('/ppt/generate')
}
</script>

<style scoped>
/* 网格布局 */
.outline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.outline-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
  cursor: grab;
}

.outline-card:active {
  cursor: grabbing;
}

.outline-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.dragging-over {
  border-color: #667eea;
  background: #f8f9ff;
}

/* 卡片顶部 */
.card-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-number {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.page-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.page-type.cover { background: #dbeafe; color: #1e40af; }
.page-type.toc { background: #e0e7ff; color: #4338ca; }
.page-type.section { background: #fce7f3; color: #be185d; }
.page-type.content { background: #d1fae5; color: #065f46; }
.page-type.summary { background: #fef3c7; color: #92400e; }

.card-controls {
  display: flex;
  gap: 8px;
}

.drag-handle {
  cursor: grab;
  padding: 4px;
}

.drag-handle:active {
  cursor: grabbing;
}

.icon-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s;
}

.icon-btn:hover {
  color: #ef4444;
}

/* 表单样式 */
.form-group {
  margin-bottom: 12px;
}

.form-label-sm {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

.form-input-sm {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input-sm:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-textarea-sm {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
}

.form-textarea-sm:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

/* 要点列表 */
.bullet-item {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.bullet-item .form-input-sm {
  flex: 1;
}

.icon-btn-sm {
  width: 28px;
  height: 28px;
  padding: 0;
  background: #f3f4f6;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  color: #9ca3af;
  transition: all 0.2s;
}

.icon-btn-sm:hover {
  background: #fee2e2;
  color: #ef4444;
}

.btn-add-bullet {
  width: 100%;
  padding: 6px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-bullet:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

/* 添加卡片 */
.add-card-dashed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-card-dashed:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.add-content {
  text-align: center;
  color: #9ca3af;
}

.add-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.page-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.page-type-btn {
  padding: 20px 12px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.page-type-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.page-type-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.page-type-name {
  font-size: 14px;
  color: #374151;
}

/* 通用样式 */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-subtitle {
  color: #6b7280;
  font-size: 14px;
}
</style>
