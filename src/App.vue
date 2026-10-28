<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useTuringStore } from './core/store.js'
import Header from './components/Header.vue'
import FavoriteDrawer from './components/FavoriteDrawer.vue'
import TapeCanvas from './components/TapeCanvas.vue'
import RuleEditor from './components/RuleEditor.vue'
import DebugPanel from './components/DebugPanel.vue'
import StateDiagramEditor from './components/StateDiagramEditor.vue'
import CampaignView from './components/CampaignView.vue'

const store = useTuringStore()
const userInput = ref('')
const inputEl = ref(null)
const outputEl = ref(null)

const modalVisible = computed(() => store.modalOpen)
const modalTitle = computed(() => {
    if (store.modalType === 'about') return 'About Turing Machine Engine'
    if (store.modalType === 'settings') return 'Settings'
    return 'Visual State Editor'
})

function showWizard() {
    const s = store.state
    return s.startsWith('INPUT_') || s.startsWith('WIZARD_') || s === 'GUIDE'
}
function showRulesPanel() {
    return ['INPUT_HALT', 'INPUT_RULES', 'INPUT_RULES_CAMPAIGN',
        'WIZARD_RUNNING', 'WIZARD_PAUSED', 'WIZARD_DONE'].includes(store.state)
}

function submitInput() {
    if (store.isRunningTM) { store.stopExecution(); return }
    const text = userInput.value
    if (!text) return
    userInput.value = ''
    store.submitInput(text)
}

function onKey(e) {
    const tag = e.target && e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (e.key === 'Escape' && store.isRunningTM) store.stopExecution()
    else if (e.key === ' ' && store.isRunningTM) { e.preventDefault(); store.togglePause() }
    else if (e.key === 'ArrowRight' && store.isRunningTM) { e.preventDefault(); store.doStep() }
    else if (e.key.toLowerCase() === 'f' && store.isRunningTM) store.toggleImmersive()
}

async function scrollToBottom() {
    await nextTick()
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight
}

watch(() => store.dynamicStatus, scrollToBottom)
watch(() => store.logs.length, scrollToBottom)

onMounted(() => {
    store.init()
    window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    store.destroy()
})

function closeTopModal() { store.closeModal() }

function copyResult() {
    const d = store.lastCanvasData
    if (!d || !d.tapes.length) return
    const bits = d.tapes[0].cells.map(c => c.symbol).join('').replace(/[^01]/g, '').replace(/^0+(?=\d)/, '') || '0'
    navigator.clipboard.writeText(bits).then(() => alert('Copied: ' + bits))
}
function exportMacros() {
    navigator.clipboard.writeText(JSON.stringify(store.favorites, null, 2)).then(() => alert('Copied!'))
}
function importMacros() {
    const txt = prompt('Paste JSON array of macros:')
    if (!txt) return
    try {
        const data = JSON.parse(txt)
        if (Array.isArray(data)) {
            store.favorites = [...store.favorites, ...data]
            store.saveFavorites()
        }
    } catch (e) {
        alert('Invalid JSON')
    }
}
</script>

<template>
    <div :class="['flex flex-col h-full transition-all', store.isImmersive ? 'immersive' : '']">
        <Header
            class="app-header flex justify-between items-center pb-2.5 mb-2.5 border-b border-tborder"
            @settings="store.openModal('settings')"
            @about="store.openModal('about')"
        />

        <div class="output flex-1 overflow-y-auto pr-1 scroll-smooth" ref="outputEl">
            <template v-for="(log, i) in store.logs" :key="i">
                <div v-if="log.kind === 'title'" class="section-title">{{ log.html }}</div>
                <div v-else-if="log.kind === 'system'" class="log-line log-system" v-html="log.html"></div>
                <div v-else-if="log.kind === 'user'" class="log-line log-user" v-html="log.html"></div>
                <div v-else class="log-line" :class="log.type" v-html="log.html"></div>
            </template>

            <div v-if="store.dynamicStatus" class="log-line dynamic-status" v-html="store.dynamicStatus"></div>

            <div v-if="store.state === 'CAMPAIGN_MENU'" class="mt-3">
                <CampaignView />
            </div>

            <div v-if="showWizard() || store.state === 'WIZARD_DONE'" :class="['wizard-box', store.wizardState ? 'state-' + store.wizardState : '']">
                <button
                    v-if="['INPUT_TAPE_COUNT','INPUT_TAPE','INPUT_START','INPUT_HALT','INPUT_RULES','INPUT_TIME'].includes(store.state)"
                    class="btn-cancel"
                    @click="store.cancelCustom()"
                >Cancel</button>

                <TapeCanvas
                    :visible="store.lastCanvasData !== null"
                    :show-timeline="store.currentSnapshots.length > 0"
                />

                <RuleEditor :visible="showRulesPanel()" />

                <DebugPanel :visible="store.isRunningTM || store.state === 'WIZARD_PAUSED'" />

                <div v-if="store.state === 'WIZARD_DONE' && store.wizardState === 'success'" class="mt-3 flex gap-2 flex-wrap">
                    <button class="btn-action btn-save-star" @click="store.addFavorite()">⭐ Save Macro</button>
                    <button class="btn-action" @click="copyResult()">📋 Copy Result</button>
                </div>
            </div>
        </div>

        <div class="input-area mt-3 flex items-center rounded-lg p-1.5" style="background:#1f1f1f; border:1px solid #3c3c3c; box-shadow:0 4px 10px rgba(0,0,0,.3);">
            <div style="padding: 8px 12px; color:#569cd6; font-weight:bold;">❯</div>
            <input
                v-model="userInput"
                type="text"
                class="flex-1 bg-transparent text-white outline-none text-sm px-2 py-2"
                placeholder="Type here..."
                autocomplete="off"
                ref="inputEl"
                :disabled="store.inputDisabled || store.isRunningTM"
                @keydown.enter="submitInput"
            />
            <button
                class="rounded-md px-5 py-2 font-bold text-white transition-all"
                :class="store.inputStop ? 'bg-[#f44747] hover:bg-[#ff3333]' : 'bg-[#569cd6] hover:bg-[#1177bb]'"
                @click="submitInput"
            >{{ store.inputLabel }}</button>
        </div>

        <FavoriteDrawer
            :open="store.drawerOpen"
            :items="store.favorites"
            @close="store.drawerOpen = false"
            @run="store.runFavorite($event)"
            @del="store.deleteFavorite($event)"
            @copy="exportMacros()"
            @import-clipboard="importMacros()"
        />

        <div v-if="modalVisible" class="modal-overlay open" @click.self="closeTopModal">
            <div class="modal-box" @click.stop>
                <div class="modal-header">
                    <span>{{ modalTitle }}</span>
                    <button class="close-btn" @click="closeTopModal">×</button>
                </div>
                <div class="modal-body">
                    <StateDiagramEditor v-if="store.modalType === 'diagram'" @close="store.closeModal()" />
                    <div v-else-if="store.modalType === 'about'" style="padding: 20px;">
                        <p><strong>Version:</strong> v1.2.1 (Vue 3 / Vite / Tailwind)</p>
                        <p>Supports Multi-Tape, Canvas visualization, visual state editor, campaign levels, and timeline replay.</p>
                        <h4 style="color:#dcdcaa; margin: 15px 0 5px;">Changelog</h4>
                        <ul>
                            <li><span class="changelog-version">v1.2.1</span> - Fixed interactive guide content and exit logic.</li>
                            <li><span class="changelog-version">v1.2.0</span> - Visual State Editor, Campaign Levels, Timeline Replay.</li>
                            <li><span class="changelog-version">v1.0.0</span> - Welcome screen, Interactive Guide.</li>
                        </ul>
                    </div>
                    <div v-else style="padding: 60px 0; text-align: center; color: var(--c-muted);">⚙️<br><br>No settings yet.</div>
                </div>
            </div>
        </div>
        
        <button 
            v-if="!store.isImmersive"
            @click="store.drawerOpen = true" 
            class="fixed bottom-[85px] right-[25px] w-[56px] h-[56px] rounded-full bg-[#ffd700] text-[#1e1e1e] text-[26px] flex justify-center items-center shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform z-50 cursor-pointer"
            title="Open Macros"
        >
            📁
        </button>
    </div>
</template>