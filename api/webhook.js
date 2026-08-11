const axios = require('axios');

// Enforce edge network computing optimization parameters
export const config = { runtime: 'edge' };

export default async function handler(request) {
    // 1. Guard against malicious or incorrect web requests
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // Capture background encryption tokens and mapping variables safely
    const token = process.env.TELEGRAM_TOKEN;
    const masterIndexId = process.env.INDEX_SPREADSHEET_ID;

    try {
        const payload = await request.json();
        
        // Fail-safe exit if the update payload is missing standard text message keys
        if (!payload.message || !payload.message.text) {
            return new Response('OK', { status: 200 });
        }

        const chatId = payload.message.chat.id;
        const userQuery = String(payload.message.text).toLowerCase().trim();

        // Core Infrastructure Diagnostic Handshake Command
        if (userQuery === 'test' || userQuery === '/start') {
            await sendTelegram(token, chatId, "🎯 *Vercel Edge Gateway Active!*\n\nYour chat traffic has successfully bypassed Google's infrastructure limitations. The cloud framework is operational. Initiating spreadsheet scan...");
        }

        // Fetch your shared master Sheet Index row configurations via Google's CSV export engine interface
        const indexUrl = `https://google.com{masterIndexId}/export?format=csv`;
        const indexResponse = await fetch(indexUrl);
        const indexCsvText = await indexResponse.text();
        const indexRows = parseCsv(indexCsvText);

        let matchesFound = [];
        let uniqueWorkbookIds = new Set();

        // Sweep search row targets across the mapping matrix (Skip column headers at index 0)
        for (let i = 1; i < indexRows.length; i++) {
            const row = indexRows[i];
            if (!row || row.length < 2) continue;

            const sheetName = row[0];       // Column A: Sheet/Workbook Title
            const rawIdInput = row[1]?.trim(); // Column B: Raw Spreadsheet ID or Link

            if (!rawIdInput || rawIdInput === 'undefined' || rawIdInput === '') continue;

            // Self-Healing URL Filter: Extracts clean IDs even if messy browser URLs are present
            let targetId = rawIdInput;
            const regExMatch = rawIdInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (regExMatch && regExMatch[1]) {
                targetId = regExMatch[1];
            }

            if (uniqueWorkbookIds.has(targetId) || targetId.length < 20) continue;
            uniqueWorkbookIds.add(targetId);

            try {
                // Query and open individual child workbook sheets on the fly
                const childUrl = `https://google.com{targetId}/export?format=csv`;
                const childResponse = await fetch(childUrl);
                
                if (childResponse.status === 200) {
                    const childCsvText = await childResponse.text();
                    const childRows = parseCsv(childCsvText);

                    for (let r = 0; r < childRows.length; r++) {
                        const contentLine = childRows[r].join(" ").toLowerCase();
                        
                        if (contentLine.includes(userQuery)) {
                            const cleanRow = childRows[r].filter(cell => cell.trim() !== "");
                            if (cleanRow.length === 0) continue;

                            matchesFound.push(`📁 *Workbook:* ${sheetName}\n📊 *Match:* \`${cleanRow.slice(0, 5).join("  |  ")}\``);
                        }
                        if (matchesFound.length >= 4) break; // Row cap configuration limit to optimize execution
                    }
                }
            } catch (innerFileError) {
                // Pass inaccessible document items safely without crashing the bot workflow
            }
            if (matchesFound.length >= 4) break;
        }

        // Build Response Payloads
        if (userQuery !== 'test' && userQuery !== '/start') {
            let outputText = "";
            if (matchesFound.length > 0) {
                outputText = `🔍 *Found Data Records:*\n\n${matchesFound.join('\n\n---\n\n')}`;
            } else {
                outputText = `❌ No system data records contain the keyword: \`${payload.message.text}\``;
            }
            await sendTelegram(token, chatId, outputText);
        }

    } catch (globalFaultError) {
        // Intercept internal crashes silently to prevent server endpoint failures
    }

    // CRITICAL COMPLIANCE FIX: Returns an absolute 200 OK status text string directly to Telegram instantly
    return new Response('OK', { status: 200 });
}

/**
 * UTILITY: Custom CSV matrix block parsing utility
 */
function parseCsv(text) {
    const lines = text.split(/\r?\n/);
    return lines.map(line => {
        const result = [];
        let currentCell = '';
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                result.push(currentCell);
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        result.push(currentCell);
        return result;
    });
}

/**
 * NETWORK DISPATCH ROUTER: Transmits text strings to Telegram API endpoints
 */
async function sendTelegram(token, chatId, text) {
    try {
        await fetch(`https://telegram.org{token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: String(chatId),
                text: text,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });
    } catch (err) {}
}
