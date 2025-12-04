
// Mock types
interface TransactionDocument {
    _id?: string;
    transactionDate: Date;
    shares: number;
    pricePerShare: number;
}

interface FIFOLot {
    shares: number;
    holdingDays: number;
}

// Duplicate logic from lib/fifoCalculator.ts to verify it in isolation
function calculateHoldingDays(buyDate: Date, sellDate: Date): number {
    return Math.floor(
        (sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)
    );
}

function runTests() {
    console.log('Verifying Holding Period Calculation Logic...');

    const tests = [
        {
            name: 'Same Day',
            buy: new Date('2023-01-01T10:00:00Z'),
            sell: new Date('2023-01-01T14:00:00Z'),
            expected: 0
        },
        {
            name: 'Next Day (Exact 24h)',
            buy: new Date('2023-01-01T10:00:00Z'),
            sell: new Date('2023-01-02T10:00:00Z'),
            expected: 1
        },
        {
            name: 'Next Day (Less than 24h)',
            buy: new Date('2023-01-01T10:00:00Z'),
            sell: new Date('2023-01-02T09:00:00Z'),
            expected: 0 // Math.floor(0.95) = 0
        },
        {
            name: 'Next Day (More than 24h)',
            buy: new Date('2023-01-01T10:00:00Z'),
            sell: new Date('2023-01-02T11:00:00Z'),
            expected: 1
        },
        {
            name: 'One Year (365 days)',
            buy: new Date('2023-01-01T00:00:00Z'),
            sell: new Date('2024-01-01T00:00:00Z'),
            expected: 365
        },
        {
            name: 'Leap Year (2024 is leap)',
            buy: new Date('2024-02-28T00:00:00Z'),
            sell: new Date('2024-03-01T00:00:00Z'),
            expected: 2 // 29th, 1st
        }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
        const result = calculateHoldingDays(test.buy, test.sell);
        if (result === test.expected) {
            console.log(`✅ ${test.name}: Passed (Expected ${test.expected}, Got ${result})`);
            passed++;
        } else {
            console.error(`❌ ${test.name}: Failed (Expected ${test.expected}, Got ${result})`);
            console.error(`   Buy: ${test.buy.toISOString()}`);
            console.error(`   Sell: ${test.sell.toISOString()}`);
            console.error(`   Diff ms: ${test.sell.getTime() - test.buy.getTime()}`);
            failed++;
        }
    });

    console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
}

runTests();
