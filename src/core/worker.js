// Self-contained Turing Machine Web Worker.
// Protocol messages (parent -> worker): start, pause, resume, step, stop, update_breakpoints
// Protocol messages (worker -> parent): tick, halted, timeout, cancelled, breakpoint, step_done

class TuringMachine {
    constructor(config) {
        this.blankSymbol = '_'
        this.tapes = (config.tapes || []).map(tapeStr => {
            const m = new Map()
            for (let i = 0; i < tapeStr.length; i++) {
                if (tapeStr[i] !== this.blankSymbol) m.set(i, tapeStr[i])
            }
            return m
        })
        this.heads = new Array(this.tapes.length).fill(0)
        this.allMacros = {}
        if (config.macros) {
            for (const m of config.macros) this.allMacros[m.name] = m
        }
        this.callStack = []
        this.context = {
            rules: this.parseRules(config.rules || []),
            startState: config.startState,
            haltState: config.haltState
        }
        this.currentState = this.context.startState
    }

    parseRules(rules) {
        const map = new Map()
        for (const r of rules) {
            map.set(r.state + '|' + r.reads.join(','), r)
        }
        return map
    }

    step() {
        if (this.currentState === this.context.haltState) {
            if (this.callStack.length > 0) {
                const prev = this.callStack.pop()
                this.context = prev.context
                this.currentState = prev.returnState
            } else {
                return 'halted'
            }
        }

        const readSymbols = this.tapes.map((t, i) => t.get(this.heads[i]) || this.blankSymbol)
        const key = this.currentState + '|' + readSymbols.join(',')
        const rule = this.context.rules.get(key)

        if (!rule) {
            this.currentState = this.context.haltState
            return 'running'
        }

        for (let i = 0; i < this.tapes.length; i++) {
            const writeSym = rule.writes[i] || this.blankSymbol
            const moveDir = rule.moves[i] || 'N'
            if (writeSym === this.blankSymbol) this.tapes[i].delete(this.heads[i])
            else this.tapes[i].set(this.heads[i], writeSym)
            if (moveDir === 'L') this.heads[i]--
            else if (moveDir === 'R') this.heads[i]++
        }

        const callMatch = rule.nextState.match(/^CALL_([a-zA-Z0-9_]+)_([a-zA-Z0-9_]+)$/)
        if (callMatch) {
            const macroName = callMatch[1]
            const returnState = callMatch[2]
            const macro = this.allMacros[macroName]
            if (macro) {
                this.callStack.push({ context: this.context, returnState })
                this.context = {
                    rules: this.parseRules(macro.rulesList),
                    startState: macro.startState,
                    haltState: macro.haltState
                }
                this.currentState = this.context.startState
            } else {
                this.currentState = returnState
            }
        } else {
            this.currentState = rule.nextState
        }

        return this.currentState === this.context.haltState && this.callStack.length === 0 ? 'halted' : 'running'
    }

    getStateForCanvas() {
        return {
            tapes: this.tapes.map((tape, idx) => {
                const head = this.heads[idx]
                let min = head, max = head
                for (const k of tape.keys()) {
                    if (k < min) min = k
                    if (k > max) max = k
                }
                const displayMin = Math.min(min, head - 30)
                const displayMax = Math.max(max, head + 30)
                const cells = []
                for (let i = displayMin; i <= displayMax; i++) {
                    cells.push({ index: i, symbol: tape.get(i) || this.blankSymbol, isHead: i === head })
                }
                return { head, cells }
            }),
            state: this.currentState
        }
    }
}

let tm = null
let stepCount = 0
let isRunning = false
let isPaused = false
let isStepMode = false
let breakpoints = new Set()
let maxTimeMs = Infinity
let startTime = 0
let currentSpeedBatch = 50000
let historySnapshots = []

function executeLoop() {
    if (!isRunning) return
    if (isPaused && !isStepMode) return

    const batchLimit = isStepMode ? 1 : currentSpeedBatch
    let batchHalted = false
    let hitBreakpoint = false

    for (let i = 0; i < batchLimit; i++) {
        if (!isRunning) break
        const status = tm.step()
        stepCount++

        if (stepCount % 100 === 0 || status === 'halted') {
            if (historySnapshots.length > 1000) historySnapshots.shift()
            historySnapshots.push({ step: stepCount, data: tm.getStateForCanvas() })
        }

        if (status === 'halted') { batchHalted = true; break }
        if (breakpoints.has(tm.currentState)) { hitBreakpoint = true; break }
    }

    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    const sps = Math.round(stepCount / (elapsed / 1000)) || 0

    self.postMessage({ type: 'tick', canvasData: tm.getStateForCanvas(), stepCount, sps })

    if (batchHalted) {
        isRunning = false
        self.postMessage({ type: 'halted', stepCount, canvasData: tm.getStateForCanvas(), sps, snapshots: historySnapshots })
        return
    }
    if (hitBreakpoint) {
        isPaused = true
        isStepMode = false
        self.postMessage({ type: 'breakpoint', state: tm.currentState, canvasData: tm.getStateForCanvas() })
        return
    }
    if (isStepMode) {
        isPaused = true
        isStepMode = false
        self.postMessage({ type: 'step_done', canvasData: tm.getStateForCanvas(), snapshots: historySnapshots })
        return
    }
    if ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime > maxTimeMs) {
        isRunning = false
        self.postMessage({ type: 'timeout', stepCount, canvasData: tm.getStateForCanvas(), snapshots: historySnapshots })
        return
    }
    setTimeout(executeLoop, 0)
}

self.onmessage = function (e) {
    const msg = e.data
    switch (msg.type) {
        case 'start':
            tm = new TuringMachine(msg.config)
            stepCount = 0
            isRunning = true
            isPaused = false
            isStepMode = false
            startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
            maxTimeMs = msg.timeLimit === -1 ? Infinity : msg.timeLimit * 1000
            breakpoints = new Set(msg.breakpoints || [])
            historySnapshots = []
            historySnapshots.push({ step: 0, data: tm.getStateForCanvas() })
            setTimeout(executeLoop, 0)
            break
        case 'pause':
            isPaused = true
            isStepMode = false
            break
        case 'resume':
            isPaused = false
            isStepMode = false
            setTimeout(executeLoop, 0)
            break
        case 'step':
            isPaused = false
            isStepMode = true
            setTimeout(executeLoop, 0)
            break
        case 'stop':
            isRunning = false
            self.postMessage({ type: 'cancelled', stepCount, canvasData: tm ? tm.getStateForCanvas() : null, snapshots: historySnapshots })
            break
        case 'update_breakpoints':
            breakpoints = new Set(msg.breakpoints || [])
            break
    }
}
