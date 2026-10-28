<template>
  <header class="app-header flex justify-between items-center pb-2.5 mb-2.5 border-b border-[#3c3c3c]">
    <h2 class="m-0 text-[#569cd6] text-lg flex items-center gap-2">
       Turing Machine Engine <span class="text-xs text-[#8b8b8b]">v1.2.1</span>
    </h2>
    <div class="flex gap-3">
      <button class="icon-btn" @click="$emit('settings')" title="Settings">⚙</button>
      <button class="icon-btn" @click="$emit('about')" title="About">ⓘ</button>
    </div>
  </header>
</template>
<script setup>
defineEmits(['settings', 'about'])
</script>