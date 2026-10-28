// Preset Turing machines (cards on the menu).
export const PRESETS = [
    {
        id: 'flipper',
        title: 'The Flipper',
        description: 'Replaces every 0 with 1, and every 1 with 0. Stops at the first blank.',
        tapes: ['1010'],
        startState: 'flip',
        haltState: 'halt',
        rulesList: [
            { state: 'flip', reads: ['0'], nextState: 'flip', writes: ['1'], moves: ['R'], active: true },
            { state: 'flip', reads: ['1'], nextState: 'flip', writes: ['0'], moves: ['R'], active: true },
            { state: 'flip', reads: ['_'], nextState: 'halt', writes: ['_'], moves: ['N'], active: true }
        ]
    },
    {
        id: 'increment',
        title: 'Binary Incrementer',
        description: 'Adds 1 to a binary number written on the tape.',
        tapes: ['1011'],
        startState: 'q0',
        haltState: 'halt',
        rulesList: [
            { state: 'q0', reads: ['0'], nextState: 'q0', writes: ['0'], moves: ['R'], active: true },
            { state: 'q0', reads: ['1'], nextState: 'q0', writes: ['1'], moves: ['R'], active: true },
            { state: 'q0', reads: ['_'], nextState: 'q1', writes: ['1'], moves: ['L'], active: true },
            { state: 'q1', reads: ['0'], nextState: 'halt', writes: ['1'], moves: ['L'], active: true },
            { state: 'q1', reads: ['1'], nextState: 'q1', writes: ['0'], moves: ['L'], active: true },
            { state: 'q1', reads: ['_'], nextState: 'q2', writes: ['1'], moves: ['L'], active: true },
            { state: 'q2', reads: ['0'], nextState: 'q2', writes: ['0'], moves: ['R'], active: true },
            { state: 'q2', reads: ['1'], nextState: 'q2', writes: ['1'], moves: ['R'], active: true },
            { state: 'q2', reads: ['_'], nextState: 'halt', writes: ['_'], moves: ['N'], active: true }
        ]
    },
    {
        id: 'doubler',
        title: 'Unary Doubler',
        description: 'Doubles the number of 1s. (Input 11 -> Output 1111)',
        tapes: ['11'],
        startState: 'q0',
        haltState: 'halt',
        rulesList: [
            { state: 'q0', reads: ['1'], nextState: 'q1', writes: ['0'], moves: ['R'], active: true },
            { state: 'q0', reads: ['_'], nextState: 'q1', writes: ['0'], moves: ['R'], active: true },
            { state: 'q1', reads: ['0'], nextState: 'q1', writes: ['0'], moves: ['R'], active: true },
            { state: 'q1', reads: ['1'], nextState: 'q1', writes: ['1'], moves: ['R'], active: true },
            { state: 'q1', reads: ['_'], nextState: 'q2', writes: ['1'], moves: ['L'], active: true },
            { state: 'q2', reads: ['0'], nextState: 'q2', writes: ['0'], moves: ['L'], active: true },
            { state: 'q2', reads: ['1'], nextState: 'q2', writes: ['1'], moves: ['L'], active: true },
            { state: 'q2', reads: ['_'], nextState: 'q3', writes: ['0'], moves: ['L'], active: true },
            { state: 'q3', reads: ['1'], nextState: 'q3', writes: ['1'], moves: ['L'], active: true },
            { state: 'q3', reads: ['0'], nextState: 'q0', writes: ['0'], moves: ['R'], active: true },
            { state: 'q0', reads: ['0'], nextState: 'q0', writes: ['0'], moves: ['R'], active: true }
        ]
    }
]
