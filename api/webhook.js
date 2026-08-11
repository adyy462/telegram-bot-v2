const axios = require('axios');

export const config = { runtime: 'edge' };

export default async function handler(request) {
    const token = process.env.TELEGRAM_TOKEN;
    const masterIndexId = process.env.INDEX_SPREADSHEET_ID;

    // --- SELF-REGISTRATION SYSTEM ---
    if (request.method === 'GET') {
        try {
            const currentHost = request.headers.get('host');
            const calculatedWebhookUrl = `https://${currentHost}/api/webhook`;
            
            // FIXED LINE: Enforces the proper api.telegram.org/bot string variables structure
            const telegramSetupEndpoint = `https://telegram.org{token}/setWebhook?url=${encodeURIComponent(calculatedWebhookUrl)}&drop_pending_updates=true`;
            
            const setupResponse = await fetch(telegramSetupEndpoint);
            const setupResult = await setupResponse.json();

            return new Response(JSON.stringify({
                message: "Vercel Webhook Auto-Configuration Utility Launched Successfully!",
                telegram_response: setupResult,
                registered_url: calculatedWebhookUrl
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        } catch (setupError) {
            return new Response(JSON.stringify({ error: setupError.toString() }), { status: 500 });
        }
    }

    // --- TELEGRAM INCOMING DATA TRAFFIC (POST) ---
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const payload = await request.json();
        if (!payload.message || !payload.message.text) {
            return new Response('OK', { status: 200 });
        }

        const chatId = payload.message.chat.id;
        const userQuery = String(payload.message.text).toLowerCase().trim();

        // Diagnostic Handshake Validation
        if (userQuery === 'test' || userQuery === '/start') {
            await sendTelegram(token, chatId, "🎯 *Vercel Edge Network Active!*\n\nYour message bypassed Google's infrastructure limitations. The cloud framework is operational. Initiating spreadsheet index scan...");
            return new Response('OK', { status: 200 });
        }

        // Fetch shared master Index rows via CSV API endpoint formatting links
        const indexUrl = `https://google.com{masterIndexId}/export?format=csv`;
        const indexResponse = await fetch(indexUrl);
        const indexCsvText = await indexResponse.text();
        const indexRows = parseCsv(indexCsvText);

        let matchesFound = [];
        let uniqueWorkbookIds = new Set();

        for (let i = 1; i < indexRows.length; i++) {
            const row = indexRows[i];
            if (!row || row.length < 2) continue;

            const sheetName = row[0];
            const rawIdInput = row[1]?.trim();

            if (!rawIdInput || rawIdInput === 'undefined' || rawIdInput === '') continue;

            let targetId = rawIdInput;
            const regExMatch = rawIdInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (regExMatch && regExMatch) {
                targetId = regExMatch[1];
            }

            if (uniqueWorkbookIds.has(targetId) || targetId.length < 20) continue;
            uniqueWorkbookIds.add(targetId);

            try {
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
                        if (matchesFound.length >= 4) break;
                    }
                }
            } catch (innerFileError) {}
            if (matchesFound.length >= 4) break;
        }

        // Deliver matching payload items
        if (matchesFound.length > 0) {
            await sendTelegram(token, chatId, `🔍 *Found Data Records:*\n\n${matchesFound.join('\n\n---\n\n')}`);
        } else {
            await sendTelegram(token, chatId, `❌ No matching records found for: \`${payload.message.text}\``);
        }

    } catch (globalFaultError) {}

    return new Response('OK', { status: 200 });
}

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
