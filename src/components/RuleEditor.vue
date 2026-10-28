<template>
  <div v-if="visible" class="rules-table-container">
    <table class="rules-table">
      <tr><th>Current</th><th>Read</th><th>Next</th><th>Write</th><th>Dir</th></tr>
      <tr v-for="(rule, i) in store.customData.rulesList" :key="i" :class="{ 'disabled': !rule.active }">
        <td>{{ rule.state }}</td>
        <td>{{ rule.reads.join(',') }}</td>
        <td>{{ rule.nextState }}</td>
        <td>{{ rule.writes.join(',') }}</td>
        <td>{{ rule.moves.join(',') }}</td>
      </tr>
    </table>
  </div>
</template>
<script setup>
import { useTuringStore } from '../core/store.js'
defineProps({ visible: Boolean })
const store = useTuringStore()
</script>