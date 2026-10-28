<template>
  <div v-if="open" class="fixed inset-0 bg-black/50 z-50 flex justify-end">
    <div class="w-80 h-full bg-[#1f1f1f] p-4 flex flex-col border-l border-[#ffd700]">
      <div class="flex justify-between items-center mb-4 border-b border-[#3c3c3c] pb-2">
        <span class="text-[#ffd700] font-bold">⭐ Macros</span>
        <button @click="$emit('close')" class="text-white">✕</button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-for="(item, i) in items" :key="i" class="mb-2 p-2 border border-[#3c3c3c] rounded">
          <div class="text-[#ffd700]">{{ item.name }}</div>
          <div class="flex gap-2 mt-2">
            <button @click="$emit('run', i)" class="text-sm bg-[#569cd6] px-2 py-1 rounded">Run</button>
            <button @click="$emit('del', i)" class="text-sm bg-[#f44747] px-2 py-1 rounded">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
defineProps({ open: Boolean, items: Array })
defineEmits(['close', 'run', 'del'])
</script>