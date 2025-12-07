
import { parseTransaction, Email } from './lib/emailParser';

const email: Email = {
    id: '1',
    threadId: '1',
    subject: 'Test',
    from: 'test@example.com',
    date: '2023-01-01',
    snippet: "This is to inform you that 1,000 securities of MAHAANA ISLAMIC INDEX EXCHANGE TRADED FUND have been delivered in your Account # 10629-278401 with AKD SECURITIES LIMITED against Market Trade."
};

const transactions = parseTransaction(email);
console.log('Extracted Transactions:', JSON.stringify(transactions, null, 2));

if (transactions.length > 0 && transactions[0].shares === '1000') {
    console.log('SUCCESS: Extracted 1000 correctly.');
} else {
    console.log('FAILURE: Incorrect extraction.');
}
