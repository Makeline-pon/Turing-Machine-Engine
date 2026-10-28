import { defineStore } from 'pinia'
import TuringWorker from './worker.js?worker'
import { CAMPAIGNS } from '../data/levels.js'
import { parseRulesText, highlightSyntax, tapeToDecimal } from './lexer.js'

export const useTuringStore = defineStore('turing', {
    state: () => ({
        state: 'MENU',
        isRunningTM: false,
        wizardState: '',
        customData: {
            tapes: [],
            tapeCount: 0,
            currentTapeInput: 0,
            startState: '',
            haltState: '',
            rulesList: [],
            campaignId: null
        },
        currentBreakpoints: new Set(),
        isPaused: false,
        logs: [],
        lastCanvasData: null,
        currentSnapshots: [],
        perfStats: '',
        dynamicStatus: '',
        isImmersive: false,
        drawerOpen: false,
        modalOpen: false,
        modalType: '',
        favorites: [],
        campaignProgress: [],
        inputDisabled: false,
        inputLabel: 'Send',
        inputStop: false
    }),
    getters: {
        activeRules(state) {
            return state.customData.rulesList.filter(r => r.active)
        },
        campaignLevelActive(state) {
            if (!state.customData.campaignId) return null
            return CAMPAIGNS.find(c => c.id === state.customData.campaignId) || null
        }
    },
    actions: {
        init() {
            this._worker = new TuringWorker()
            this._worker.onmessage = (e) => this._onWorkerMessage(e.data)
            this.loadFavorites()
            this.loadCampaignProgress()
            this.printTitle('Welcome to Turing Machine Engine v1.2.1')
            this.printLine('<div style="margin-bottom:10px; color:#aaa;">Type <b>1</b> for Custom, <b>2</b> for Guide, <b>3</b> for Macros, <b>5</b> for Campaign.</div>')
            this.printTitle('Main Menu')
            this.printLine('<span style="color:var(--c-blue)">1.</span> Custom Turing Machine')
            this.printLine('<span style="color:var(--c-blue)">2.</span> Interactive Guide')
            this.printLine('<span style="color:var(--c-blue)">3.</span> Open Macros')
            this.printLine('<span style="color:var(--c-blue)">4.</span> Show Presets')
            this.printLine('<span style="color:var(--c-blue)">5.</span> Campaign Mode (Levels)')
            this.printSystem('Please enter a number:')
        },
        destroy() {
            if (this._worker) {
                this._worker.terminate()
                this._worker = null
            }
        },
        // ---------------- Logs ----------------
        printSystem(text) {
            this._pushLog({ kind: 'system', html: `&#8226; ${text}` })
        },
        printLine(html, type = '') {
            this._pushLog({ kind: 'line', type, html })
        },
        printPromptInput(text, highlightHTML) {
            this._pushLog({ kind: 'user', html: `<span class="prompt-arrow">❯</span> <span style="color:var(--c-text)">${highlightHTML}</span>` })
        },
        printTitle(text) {
            this._pushLog({ kind: 'title', html: text })
        },
        clearLogs() {
            this.logs = []
        },
        _pushLog(entry) {
            this.logs = [...this.logs, entry]
            if (this.logs.length > 1000) {
                this.logs = this.logs.slice(-1000)
            }
        },
        // ---------------- Input dispatch ----------------
        submitInput(text) {
            if (this.isRunningTM) {
                this.stopExecution()
                return
            }
            this.inputStop = false
            this.inputDisabled = false
            this.inputLabel = 'Send'
            if (text === '') return
            this.printPromptInput(text, highlightSyntax(text))
            this.handleInput(text)
        },
        handleInput(raw) {
            const input = String(raw)
            if (this.state === 'GUIDE') {
                this._handleGuideInput(input)
                return
            }
            if (this.state === 'CAMPAIGN_MENU') {
                if (input.toLowerCase() === 'exit') { this.showMenu() }
                else {
                    const id = parseInt(input)
                    const found = CAMPAIGNS.find(c => c.id === id)
                    if (found) this.startCampaignLevel(id)
                    else this.printLine('Invalid level.', 'log-error')
                }
                return
            }

            switch (this.state) {
                case 'MENU':
                    if (input === '1') this.startCustom()
                    else if (input === '2') this.showGuideMenu()
                    else if (input === '3') { this.drawerOpen = true }
                    else if (input === '4') {
                        this.state = 'MENU'
                        this.printTitle('Presets')
                        this.printSystem('Presets are shown visually below. Scroll up.')
                    } else if (input === '5') this.showCampaignMenu()
                    else {
                        this.printLine('Invalid command.', 'log-error')
                        this.showMenu()
                    }
                    break
                case 'INPUT_TAPE_COUNT': {
                    const count = parseInt(input)
                    if (isNaN(count) || count < 1) {
                        this.printLine('Please enter a valid number >= 1.', 'log-error')
                        return
                    }
                    this.customData.tapes = []
                    this.customData.tapeCount = count
                    this.customData.currentTapeInput = 0
                    this.state = 'INPUT_TAPE'
                    this.printSystem(`Enter initial tape #${this.customData.currentTapeInput + 1} (use _ for blank, $VAR for variables):`)
                    break
                }
                case 'INPUT_TAPE':
                    this.customData.tapes.push(input)
                    this.customData.currentTapeInput++
                    if (this.customData.currentTapeInput < this.customData.tapeCount) {
                        this.printSystem(`Enter initial tape #${this.customData.currentTapeInput + 1}:`)
                    } else {
                        this.state = 'INPUT_START'
                        this.printSystem('Enter start state (e.g., q0):')
                    }
                    break
                case 'INPUT_START':
                    this.customData.startState = input
                    this.state = 'INPUT_HALT'
                    this.printSystem('Enter halt state (e.g., halt):')
                    break
                case 'INPUT_HALT':
                    this.customData.haltState = input
                    this.state = 'INPUT_RULES'
                    this.customData.rulesList = []
                    this.printSystem('Enter transition rules (type END to finish):')
                    break
                case 'INPUT_RULES': {
                    if (input.trim().toUpperCase() === 'END') {
                        if (this.activeRules.length === 0) {
                            this.printLine('Error: Need at least one active rule.', 'log-error')
                            return
                        }
                        this.state = 'INPUT_TIME'
                        this.printSystem('Rules locked. Enter max run time (seconds), -1 for infinite:')
                    } else {
                        const parsed = parseRulesText(input)
                        if (parsed.length > 0) {
                            this.customData.rulesList = [...this.customData.rulesList, ...parsed]
                        } else {
                            this.printLine(`Failed to parse rules from: ${input}`, 'log-error')
                        }
                    }
                    break
                }
                case 'INPUT_RULES_CAMPAIGN': {
                    const up = input.trim().toUpperCase()
                    if (up === 'END') {
                        this.cancelCustom()
                        return
                    }
                    if (up === 'RUN') {
                        const activeRules = this.activeRules
                        if (activeRules.length === 0) {
                            this.printLine('Add some rules first.', 'log-error')
                            return
                        }
                        this.startExecution({
                            tapes: this.customData.tapes,
                            startState: this.customData.startState,
                            haltState: this.customData.haltState,
                            rules: activeRules
                        }, -1, true)
                    } else {
                        const parsed = parseRulesText(input)
                        if (parsed.length > 0) {
                            this.customData.rulesList = [...this.customData.rulesList, ...parsed]
                        } else {
                            this.printLine(`Failed to parse rules from: ${input}`, 'log-error')
                        }
                    }
                    break
                }
                case 'INPUT_TIME': {
                    let timeLimit = -1
                    if (input.trim() !== '-1') {
                        const t = parseFloat(input)
                        if (isNaN(t) || t < 0) {
                            this.printLine('Invalid time format. Try again:', 'log-error')
                            return
                        }
                        timeLimit = t
                    }
                    this.executeCustom(timeLimit)
                    break
                }
                case 'WIZARD_DONE':
                    this.showMenu()
                    break
            }
        },
        // ---------------- Guide ----------------
        showGuideMenu() {
            this.state = 'GUIDE'
            this.printTitle('Interactive Guide')
            this.printLine(GUIDE_PAGES.menu)
            this.printSystem("Please enter a number (or 'exit'):")
        },
        _handleGuideInput(input) {
            const cmd = String(input).trim().toLowerCase()
            if (cmd === 'exit') { this.showMenu(); return }
            if (cmd === 'menu') { this.showGuideMenu(); return }
            if (GUIDE_PAGES[cmd]) {
                this.printTitle(`Guide Module ${cmd}`)
                this.printLine(GUIDE_PAGES[cmd])
                this.printSystem("Type 'menu' to go back, or 'exit' to quit:")
            } else {
                this.printLine("Invalid module. Enter 1-5, 'menu', or 'exit'.", 'log-error')
            }
        },
        // ---------------- Campaign ----------------
        showCampaignMenu() {
            this.state = 'CAMPAIGN_MENU'
            this.campaignListSnapshot = CAMPAIGNS.map(c => ({ ...c, passed: this.campaignProgress.includes(c.id) }))
            this.printTitle('Campaign Mode')
            this.printSystem('Pick a level from the list on the screen, or type its number.')
            this.printSystem("Enter 'exit' to return to main menu.")
        },
        startCampaignLevel(id) {
            const level = CAMPAIGNS.find(c => c.id === id)
            if (!level) {
                this.printLine('Invalid level.', 'log-error')
                return
            }
            this.customData = {
                tapes: [level.tape],
                startState: level.start,
                haltState: level.halt,
                rulesList: [],
                campaignId: id
            }
            this.currentBreakpoints = new Set()
            this.printTitle(level.name)
            this.printSystem(level.desc)
            this.printSystem(`Initial Tape: ${level.tape} | Expected: ${level.expected}`)
            this.printSystem(`Start: ${level.start} | Halt: ${level.halt}`)
            this.state = 'INPUT_RULES_CAMPAIGN'
            this.printLine(`<span style="color:var(--c-yellow)">Hint: ${level.hint}</span>`)
            this.printSystem("Enter transition rules (type RUN to test, or END to abort):")
        },
        markCampaignPassed(id) {
            if (!this.campaignProgress.includes(id)) {
                this.campaignProgress = [...this.campaignProgress, id]
                this.saveCampaignProgress()
            }
        },
        // ---------------- Custom ----------------
        startCustom() {
            this.state = 'INPUT_TAPE_COUNT'
            this.customData = { tapes: [], tapeCount: 0, currentTapeInput: 0, startState: '', haltState: '', rulesList: [], campaignId: null }
            this.currentBreakpoints = new Set()
            this.printSystem('How many tapes? (1 for standard single tape, 2+ for multi-tape):')
        },
        cancelCustom() {
            this.printLine('Cancelled.')
            this.showMenu()
        },
        showMenu() {
            this.state = 'MENU'
            this.printTitle('Main Menu')
            this.printLine('<span style="color:var(--c-blue)">1.</span> Custom Turing Machine')
            this.printLine('<span style="color:var(--c-blue)">2.</span> Interactive Guide')
            this.printLine('<span style="color:var(--c-blue)">3.</span> Open Macros')
            this.printLine('<span style="color:var(--c-blue)">4.</span> Show Presets')
            this.printLine('<span style="color:var(--c-blue)">5.</span> Campaign Mode (Levels)')
            this.printSystem('Please enter a number:')
        },
        // ---------------- Run / Stop ----------------
        startExecution(config, timeLimit, isCampaign = false) {
            this.state = 'WIZARD_RUNNING'
            this.isRunningTM = true
            this.inputDisabled = true
            this.inputStop = true
            this.inputLabel = 'STOP (Esc)'
            this.printTitle('Execution Started')
            this.lastCanvasData = null
            this.currentSnapshots = []
            this.perfStats = ''
            this.dynamicStatus = '[Initializing Worker...]'
            this._isCampaignRun = isCampaign
            this._worker.postMessage({
                type: 'start',
                config: { ...config, macros: this.favorites },
                timeLimit,
                breakpoints: Array.from(this.currentBreakpoints)
            })
        },
        stopExecution() {
            if (!this.isRunningTM) return
            this._worker.postMessage({ type: 'stop' })
        },
        togglePause() {
            if (this.state === 'WIZARD_RUNNING') {
                this._worker.postMessage({ type: 'pause' })
                this.state = 'WIZARD_PAUSED'
                this.isPaused = true
            } else if (this.state === 'WIZARD_PAUSED') {
                this._worker.postMessage({ type: 'resume' })
                this.state = 'WIZARD_RUNNING'
                this.isPaused = false
            }
        },
        doStep() {
            if (this.state === 'WIZARD_PAUSED') {
                this._worker.postMessage({ type: 'step' })
                this.state = 'WIZARD_RUNNING'
                this.isPaused = false
            }
        },
        toggleImmersive() {
            this.isImmersive = !this.isImmersive
        },
        toggleDrawer() {
            this.drawerOpen = !this.drawerOpen
        },
        openModal(type) {
            this.modalType = type
            this.modalOpen = true
        },
        closeModal() {
            this.modalOpen = false
            this.modalType = ''
        },
        _onWorkerMessage(msg) {
            switch (msg.type) {
                case 'tick':
                    this.lastCanvasData = msg.canvasData
                    this.dynamicStatus = `[Running] Steps: ${msg.stepCount} | State: <span class="hl-state">${msg.canvasData ? msg.canvasData.state : ''}</span>`
                    this.perfStats = `Speed: ${msg.sps.toLocaleString()} steps/sec`
                    break
                case 'halted':
                    this._finish('halted', msg.stepCount, msg.canvasData, msg.sps, msg.snapshots)
                    break
                case 'timeout':
                    this._finish('timeout', msg.stepCount, msg.canvasData, msg.sps, msg.snapshots)
                    break
                case 'cancelled':
                    this._finish('cancelled', msg.stepCount, msg.canvasData, msg.sps, msg.snapshots)
                    break
                case 'breakpoint':
                    this.state = 'WIZARD_PAUSED'
                    this.isRunningTM = true
                    this.isPaused = true
                    this.dynamicStatus = `[Paused] Breakpoint hit: <span class="hl-state" style="color:var(--c-red)">${msg.state}</span>`
                    this.lastCanvasData = msg.canvasData
                    break
                case 'step_done':
                    this.state = 'WIZARD_PAUSED'
                    this.isRunningTM = true
                    this.isPaused = true
                    this.lastCanvasData = msg.canvasData
                    if (msg.snapshots) this.currentSnapshots = msg.snapshots
                    break
            }
        },
        _finish(status, stepCount, canvasData, sps = 0, snapshots = []) {
            this.isRunningTM = false
            this.isPaused = false
            this.inputDisabled = false
            this.inputStop = false
            this.inputLabel = 'Send'
            this.state = 'WIZARD_DONE'
            if (canvasData) {
                this.lastCanvasData = canvasData
                this.perfStats = `Speed: ${sps.toLocaleString()} steps/sec`
                if (snapshots && snapshots.length) this.currentSnapshots = snapshots
            }
            this.dynamicStatus = ''

            const tapeStrs = canvasData
                ? canvasData.tapes.map(t => t.cells.map(c => c.symbol).join('').replace(/_/g, ''))
                : []

            if (status === 'halted') {
                this.wizardState = 'success'
                this.printLine('✨ Turing Machine halted successfully!', 'log-success')
                this.printLine(`> Total steps: <span class="hl-num">${(stepCount || 0).toLocaleString()}</span>`)
                if (tapeStrs.length) {
                    this.printLine(`> Final Tape(s): <span class="hl-sym">${tapeStrs.join(' | ')}</span>`)
                }
                if (this._isCampaignRun && this.campaignLevelActive) {
                    const expected = this.campaignLevelActive.expected
                    const actual = tapeStrs[0] || ''
                    if (actual === expected) {
                        this.printLine('<br><span style="font-size:20px; color:var(--c-gold)">🎉 LEVEL PASSED!</span>', 'log-success')
                        this.markCampaignPassed(this.campaignLevelActive.id)
                        this.showCampaignMenu()
                        return
                    } else {
                        this.printLine(`<br><span style="color:var(--c-red); font-size:16px;">❌ Level Failed.</span> Expected: ${expected}, Got: ${actual}`, 'log-error')
                        this.printSystem("Type 'RUN' to retry or END to abort.")
                        this.state = 'INPUT_RULES_CAMPAIGN'
                        return
                    }
                }
                if (tapeStrs.length) {
                    this.printLine(`> Human Readable (Tape 1 Decimal): <span class="hl-kw" style="font-size:16px;">${tapeToDecimal(tapeStrs[0])}</span>`)
                }
            } else if (status === 'timeout') {
                this.wizardState = 'error'
                this.printLine('⏰ Timeout interrupted!', 'log-error')
            } else if (status === 'cancelled') {
                this.wizardState = 'cancelled'
                this.printLine('🛑 Emergency Stop triggered by user.', 'log-error')
            } else {
                this.wizardState = ''
            }
            this.printSystem('Type anything to return to menu...')
        },
        // ---------------- Breakpoints ----------------
        toggleBreakpoint(stateName) {
            const s = new Set(this.currentBreakpoints)
            if (s.has(stateName)) s.delete(stateName)
            else s.add(stateName)
            this.currentBreakpoints = s
            if (this.isRunningTM && this._worker) {
                this._worker.postMessage({ type: 'update_breakpoints', breakpoints: Array.from(s) })
            }
        },
        // ---------------- Macros / Favorites ----------------
        loadFavorites() {
            try {
                this.favorites = JSON.parse(localStorage.getItem('tm_favorites') || '[]')
            } catch (e) {
                this.favorites = []
            }
        },
        saveFavorites() {
            localStorage.setItem('tm_favorites', JSON.stringify(this.favorites))
        },
        addFavorite() {
            const name = prompt('Enter a name:', 'TM_' + Date.now())
            if (name === null) return
            const description = prompt('Description:', '')
            if (description === null) return
            const cd = this.customData
            if (!cd || !cd.tapes || !cd.tapes.length) {
                alert('No data.')
                return
            }
            this.favorites = [...this.favorites, {
                name,
                description,
                tapes: cd.tapes,
                startState: cd.startState,
                haltState: cd.haltState,
                rulesList: cd.rulesList
            }]
            this.saveFavorites()
            this.drawerOpen = true
        },
        deleteFavorite(index) {
            const arr = [...this.favorites]
            arr.splice(index, 1)
            this.favorites = arr
            this.saveFavorites()
        },
        runFavorite(index) {
            const macro = this.favorites[index]
            if (!macro) return
            this.drawerOpen = false
            this.customData = {
                tapes: [...(macro.tapes || [])],
                startState: macro.startState,
                haltState: macro.haltState,
                rulesList: macro.rulesList,
                campaignId: null
            }
            this.currentBreakpoints = new Set()
            this.printTitle(`Loaded Macro: ${macro.name}`)
            this.startExecution({
                tapes: this.customData.tapes,
                startState: this.customData.startState,
                haltState: this.customData.haltState,
                rules: macro.rulesList.filter(r => r.active)
            }, -1, false)
        },
        loadCampaignProgress() {
            try {
                this.campaignProgress = JSON.parse(localStorage.getItem('tm_campaign_progress') || '[]')
            } catch (e) {
                this.campaignProgress = []
            }
        },
        saveCampaignProgress() {
            localStorage.setItem('tm_campaign_progress', JSON.stringify(this.campaignProgress))
        }
    }
})

const GUIDE_PAGES = {
    menu: `
        <strong style="color:var(--c-yellow)">Course Menu</strong><br>
        <span style="color:var(--c-cyan)">1.</span> Basic: What is a Turing Machine?<br>
        <span style="color:var(--c-cyan)">2.</span> Basic: Syntax and Rules<br>
        <span style="color:var(--c-cyan)">3.</span> Advanced: Variables & Macros<br>
        <span style="color:var(--c-cyan)">4.</span> Advanced: Debugging & Timeline<br>
        <span style="color:var(--c-cyan)">5.</span> Practice: Build your first machine!<br><br>
        Type a number (1-5) to enter a module. Type <span class="hl-kw">exit</span> to return to Main Menu.
    `,
    '1': `
        <strong style="color:var(--c-yellow)">Module 1: What is a Turing Machine?</strong><br>
        A Turing Machine is an abstract machine that manipulates symbols on a strip of tape according to a table of rules.<br><br>
        • <strong>Tape (纸带):</strong> An infinite strip divided into cells. We use <span class="hl-blank">_</span> to represent a blank cell.<br>
        • <strong>Head (读写头):</strong> Reads/writes one cell at a time and moves Left (L) or Right (R).<br>
        • <strong>State (状态):</strong> The machine's current "mood" or memory. It starts at <span class="hl-kw">start</span> and halts at <span class="hl-kw">halt</span>.<br><br>
        <em>Type 'menu' to go back.</em>
    `,
    '2': `
        <strong style="color:var(--c-yellow)">Module 2: Syntax and Rules</strong><br>
        A rule dictates: "If I am in <b>State A</b> reading <b>Symbol X</b>, then change to <b>State B</b>, write <b>Symbol Y</b>, and move <b>Direction D</b>."<br><br>
        Format: <span class="hl-state">CurrentState</span> <span class="hl-sym">Read</span> <span class="hl-arrow">-></span> <span class="hl-state">NextState</span> <span class="hl-sym">Write</span> <span class="hl-dir">Direction</span><br>
        Example: <span class="hl-state">start</span> <span class="hl-sym">1</span> <span class="hl-arrow">-></span> <span class="hl-state">q1</span> <span class="hl-sym">0</span> <span class="hl-dir">R</span> (If at 'start' and read 1, write 0, move Right, and go to 'q1')<br><br>
        <em>Type 'menu' to go back.</em>
    `,
    '3': `
        <strong style="color:var(--c-yellow)">Module 3: Variables & Macros</strong><br>
        You can save your machines as <b>Macros</b> to reuse them later.<br>
        If you type <span class="hl-var">$A</span> or <span class="hl-var">$0</span> in the initial tape, the engine will prompt you to input a decimal number when running it, and automatically convert it to binary!<br><br>
        Example: Tape = <span class="hl-var">$0</span>+<span class="hl-var">$1</span><br>
        When run, asks for A and B (e.g., 5 and 3), converts to 101+11.<br>
        You can even use <span class="hl-call">CALL_MacroName_ReturnState</span> to call another macro!<br><br>
        <em>Type 'menu' to go back.</em>
    `,
    '4': `
        <strong style="color:var(--c-yellow)">Module 4: Debugging & Timeline</strong><br>
        While your machine is running or after it halts, you have powerful tools:<br>
        • <strong>Breakpoints (断点):</strong> Click any state name in the rule table to toggle a red breakpoint. Execution pauses when entering that state.<br>
        • <strong>Step (单步):</strong> Pause and execute exactly 1 instruction.<br>
        • <strong>Timeline (时间轴):</strong> Drag the slider at the bottom of the canvas to replay history snapshots!<br><br>
        <em>Type 'menu' to go back.</em>
    `,
    '5': `
        <strong style="color:var(--c-yellow)">Module 5: Practical Test!</strong><br>
        Let's create a machine that flips every <b>0</b> to <b>1</b>, and every <b>1</b> to <b>0</b>.<br><br>
        <b>Your Task:</b> Go to Main Menu, select <b>1. Custom Machine</b>.<br>
        Tapes = 1, Tape input = 1010. Start = <b>flip</b>, Halt = <b>halt</b>.<br>
        Rules (type END to finish):<br>
        <code style="background:#333; padding:5px; display:block; color:#aaa;">
        flip 0 -> flip 1 R<br>
        flip 1 -> flip 0 R<br>
        flip _ -> halt _ N
        </code><br>
        Try it! If you get 0101, you pass! (Or try Campaign Mode Level 1!)<br><br>
        <em>Type 'menu' to go back.</em>
    `
}