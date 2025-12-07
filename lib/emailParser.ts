export interface Email {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body?: string;
}

export interface Transaction {
    id: string;
    shares: string;
    company: string;
    action: string;
    date: string;
}

export const parseTransaction = (email: Email): Transaction[] => {
    const transactions: Transaction[] = [];
    const textToParse = email.body || email.snippet;

    // 1. Check for "Delivered" / "Buy" Pattern
    // "11 securities of SYSTEMS LIMITED have been delivered"
    // "11 securities of SYSTEMS LIMITED have been delivered"
    const deliveredRegex = /([\d,]+)\s+securities\s+of\s+(.+?)\s+have\s+been\s+(delivered)/i;
    const matchDelivered = textToParse.match(deliveredRegex);

    if (matchDelivered) {
        const action = matchDelivered[3].toLowerCase() === 'delivered' ? 'Buy' : matchDelivered[3];
        transactions.push({
            id: email.id,
            shares: matchDelivered[1].replace(/,/g, ''),
            company: matchDelivered[2],
            action: action,
            date: email.date,
        });
        return transactions;
    }

    // 2. Check for "Moved from" / "Sell" Pattern
    // "securities have been moved from your Account"
    // Structure: Header ... on <date>: Company & Shares ...
    if (textToParse.includes('moved from your')) {
        // Attempt to remove the header part to avoid false matches
        const parts = textToParse.split(/on\s+\d{2}\/\d{2}\/\d{4}:/i);
        const content = parts.length > 1 ? parts[1] : textToParse;

        // Regex to find "Company & Shares"
        // Handle company names with "&" inside them (e.g. ENGRO POLYMER & CHEMICALS)
        // Handle shares with commas (e.g. 1,000)
        const sellRegex = /([A-Z0-9\s&().-]+?)\s+&\s+([0-9,]+)/gi;

        // reset lastIndex just in case
        sellRegex.lastIndex = 0;

        let match;
        let index = 0;
        while ((match = sellRegex.exec(content)) !== null) {
            // Filter out empty matches or purely whitespace
            const company = match[1].trim();
            const shares = match[2].replace(/,/g, ''); // Remove commas

            if (company && shares) {
                transactions.push({
                    id: `${email.id}-${index}`, // unique id for multiple items
                    shares: shares,
                    company: company,
                    action: 'Sell',
                    date: email.date,
                });
                index++;
            }
        }
    }

    return transactions;
};
