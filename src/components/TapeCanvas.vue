<template>
  <div v-if="visible" class="canvas-container">
    <canvas ref="canvas" style="width:100%; height:200px; background:#181818;"></canvas>
  </div>
</template>
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useTuringStore } from '../core/store.js'
defineProps({ visible: Boolean })
const store = useTuringStore()
const canvas = ref(null)

watch(() => store.lastCanvasData, (data) => {
  if (!data || !canvas.value) return
  const ctx = canvas.value.getContext('2d')
  const rect = canvas.value.getBoundingClientRect()
  canvas.value.width = rect.width
  canvas.value.height = rect.height
  ctx.clearRect(0, 0, rect.width, rect.height)

  // 绘制简化的纸带
  const tape = data.tapes[0]
  if (!tape) return
  const cellW = 30
  const centerX = rect.width / 2
  
  tape.cells.forEach(cell => {
    const relIdx = cell.index - tape.head
    const x = centerX + relIdx * cellW - cellW / 2
    if (x < 0 || x > rect.width) return
    ctx.strokeStyle = cell.isHead ? '#569cd6' : '#3c3c3c'
    ctx.fillStyle = cell.isHead ? '#569cd6' : '#cccccc'
    ctx.strokeRect(x, 50, cellW, 30)
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(cell.symbol, x + cellW/2, 65)
  })
}, { deep: true })
</script>