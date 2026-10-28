<template>
  <div class="p-4 bg-[#1f1f1f] rounded-lg border border-[#3c3c3c] mb-4">
    <h3 class="text-[#dcdcaa] font-bold mb-2">Campaign Mode</h3>
    <div class="flex gap-2 flex-col">
      <button v-for="level in levels" :key="level.id" class="text-left p-2 bg-[#282828] rounded hover:bg-[#3c3c3c]" @click="store.startCampaignLevel(level.id)">
        {{ level.name }}
      </button>
    </div>
  </div>
</template>
<script setup>
import { useTuringStore } from '../core/store.js'
import { CAMPAIGNS as levels } from '../data/levels.js'
const store = useTuringStore()
</script>