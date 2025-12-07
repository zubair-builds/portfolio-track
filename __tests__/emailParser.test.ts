
import { parseTransaction, Email } from '../lib/emailParser';

describe('parseTransaction', () => {
    it('should parse "Buy" / "Delivered" emails correctly', () => {
        const email: Email = {
            id: '1',
            threadId: '1',
            subject: 'Market Trade',
            from: 'CDC',
            date: '2025-10-07',
            snippet: 'Dear Account Holder,\n\nThis is to inform you that 40 securities of MARI ENERGIES LIMITED have been delivered in your Account # 10629-278401 with AKD SECURITIES LIMITED against Market Trade.'
        };

        const result = parseTransaction(email);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            id: '1',
            shares: '40',
            company: 'MARI ENERGIES LIMITED',
            action: 'Buy',
            date: '2025-10-07'
        });
    });

    it('should parse "Sell" / "Moved from" emails correctly with multiple securities, commas, and ampersands', () => {
        const email: Email = {
            id: '2',
            threadId: '2',
            subject: 'Market Trade',
            from: 'CDC',
            date: '2025-10-07',
            snippet: `Dear Account Holder,

This is to inform you that following securities have been moved from your Account # 10629-278401 with AKD SECURITIES LIMITED against Market Trade on 10/07/2025:

AL SHAHEER CORPORATION LIMITED & 500
ENGRO POLYMER & CHEMICALS LIMITED & 500
PAKISTAN INTERNATIONAL CONTAINER TERMINAL LIMITED & 300
WAVES CORPORATION LIMITED & 1,000
WAVES HOME APPLIANCES LIMITED & 200`
        };

        const result = parseTransaction(email);
        expect(result).toHaveLength(5);

        expect(result[0]).toEqual({
            id: '2-0',
            shares: '500',
            company: 'AL SHAHEER CORPORATION LIMITED',
            action: 'Sell',
            date: '2025-10-07'
        });

        expect(result[1]).toEqual({
            id: '2-1',
            shares: '500',
            company: 'ENGRO POLYMER & CHEMICALS LIMITED',
            action: 'Sell',
            date: '2025-10-07'
        });

        expect(result[3]).toEqual({
            id: '2-3',
            shares: '1000', // comma removed
            company: 'WAVES CORPORATION LIMITED',
            action: 'Sell',
            date: '2025-10-07'
        });
    });
});
