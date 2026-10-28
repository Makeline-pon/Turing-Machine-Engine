<template>
  <div class="p-4 text-center text-[#8b8b8b]">
    Visual Editor is currently under construction.
    <button @click="$emit('close')" class="block mx-auto mt-4 px-4 py-2 bg-[#569cd6] text-white rounded">Close</button>
  </div>
</template>
<script setup>
defineEmits(['close'])
</script>