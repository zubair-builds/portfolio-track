
const text = "This is to inform you that 1,000 securities of MAHAANA ISLAMIC INDEX EXCHANGE TRADED FUND have been delivered in your Account # 10629-278401 with AKD SECURITIES LIMITED against Market Trade.";

// Original Regex
const regexOriginal = /(\d+)\s+securities\s+of\s+(.+?)\s+have\s+been\s+(delivered)/i;
const matchOriginal = text.match(regexOriginal);

console.log('Original Regex Match:', matchOriginal ? matchOriginal[1] : 'No match');

// Proposed Regex
const regexNew = /([\d,]+)\s+securities\s+of\s+(.+?)\s+have\s+been\s+(delivered)/i;
const matchNew = text.match(regexNew);

console.log('New Regex Match:', matchNew ? matchNew[1] : 'No match');
