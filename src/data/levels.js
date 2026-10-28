export const CAMPAIGNS = [
    {
        id: 1,
        name: 'Level 1: The Flipper',
        desc: 'Change every 0 to 1, and every 1 to 0.',
        tape: '10110',
        expected: '01001',
        start: 'q0',
        halt: 'halt',
        hint: 'Move Right. If read 0, write 1. If read 1, write 0.'
    },
    {
        id: 2,
        name: 'Level 2: Binary Increment',
        desc: 'Add 1 to the binary number. (Input: 1011, Output: 1100)',
        tape: '1011',
        expected: '1100',
        start: 'q0',
        halt: 'halt',
        hint: 'Move right to the end, then carry the 1 backwards.'
    },
    {
        id: 3,
        name: 'Level 3: Unary Doubler',
        desc: 'Double the number of 1s. (Input 11 -> Output 1111)',
        tape: '11',
        expected: '1111',
        start: 'q0',
        halt: 'halt',
        hint: 'You need to scan right, add a 1, then go back and repeat.'
    }
]