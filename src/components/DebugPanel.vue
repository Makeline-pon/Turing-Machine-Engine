<template>
  <div class="debug-controls" v-if="visible">
    <button class="debug-btn pause" @click="store.togglePause()">⏸ Pause</button>
    <button class="debug-btn step" @click="store.doStep()">⏭ Step</button>
    <button class="debug-btn stop" @click="store.stopExecution()">⏹ Stop</button>
  </div>
</template>
<script setup>
import { useTuringStore } from '../core/store.js'
defineProps({ visible: Boolean })
const store = useTuringStore()
</script>