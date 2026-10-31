const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChatbot, isChatTrigger, buildContext, discordText } = require('../chatbot');
const { streamCompletion } = require('../deepseek');
const { createHandlers } = require('../handlers');

const client = { user: { id: 'bot' }, commandsClassic: new Map() };
const env = { DEEPSEEK_API_KEY: 'test-secret' };

function timingMetadata(context) {
    const { history, current } = JSON.parse(context[1].content);
    return [...history, current];
}

function fixture(content = 'anime slave, what did I just say?', channelId = 'channel') {
    const replies = [];
    const edits = [];
    const fetches = [];
    const message = {
        id: '100', guild: { id: 'guild' }, content, createdTimestamp: Date.parse('2026-10-31T17:00:00Z'),
        author: { id: 'human', username: 'Human', bot: false },
        channel: {
            id: channelId, sendTyping: async () => {},
            messages: { fetch: async options => { fetches.push(options); return new Map(); } }
        },
        reply: async body => {
            replies.push(body);
            return { edit: async edit => { edits.push(edit); } };
        }
    };
    return { message, replies, edits, fetches };
}

async function collect(stream) {
    let result = '';
    for await (const delta of stream) result += delta;
    return result;
}

function sse(text, chunkSize = 7) {
    const bytes = new TextEncoder().encode(text);
    return new Response(new ReadableStream({
        start(controller) {
            for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
            controller.close();
        }
    }));
}

test('chat triggers on the phrase, direct mention and replies; ignores bots, webhooks, DMs and unrelated text', () => {
    for (const content of ['ANIME SLAVE', 'hey anime  slave, answer', '<@bot> hi', '<@!bot> hi']) {
        assert.equal(isChatTrigger(fixture(content).message, 'bot'), true);
    }
    for (const content of ['anime slavery', 'anime slaver', 'ordinary chat', '<@other> hi', '@everyone']) {
        assert.equal(isChatTrigger(fixture(content).message, 'bot'), false);
    }
    const { message } = fixture('follow-up');
    message.mentions = { repliedUser: { id: 'bot' } };
    assert.equal(isChatTrigger(message, 'bot'), true);
    for (const change of [{ guild: null }, { author: { bot: true } }, { webhookId: 'webhook' }]) {
        assert.equal(isChatTrigger({ ...fixture().message, ...change }, 'bot'), false);
    }
});

test('context is exactly nine previous channel messages plus the trigger, with no older reference lookup', async () => {
    const { message, fetches } = fixture();
    const history = Array.from({ length: 9 }, (_, i) => ({
        id: String(99 - i), content: `message ${99 - i}`,
        author: { id: i === 2 ? 'bot' : 'human', username: 'Someone', bot: i === 2 }
    }));
    message.reference = { messageId: 'old-message' };
    message.channel.messages.fetch = async options => {
        fetches.push(options);
        return new Map(history.map(item => [item.id, item]));
    };
    const context = await buildContext(message, 'bot');
    assert.deepEqual(fetches, [{ before: '100', limit: 9, cache: false }]);
    assert.equal(context.length, 2); // Instructions and one request with separate history/current fields.
    const messages = timingMetadata(context);
    assert.equal(messages.length, 10);
    assert.equal(context[0].role, 'system');
    assert.equal(messages[0].text, 'message 91');
    assert.equal(messages[6].role, 'assistant');
    assert.equal(JSON.parse(context[1].content).current.text, message.content);
    assert(!JSON.stringify(context).includes('old-message'));
});

test('excluded messages leave holes in the ten-message window; history failure uses only the trigger', async () => {
    const { message } = fixture();
    const ordinary = { content: 'hello', author: { id: 'human', username: 'Human' } };
    message.channel.messages.fetch = async () => new Map([
        ['1', { ...ordinary, author: { id: 'other-bot', bot: true } }],
        ['2', { ...ordinary, webhookId: 'webhook' }],
        ['3', { ...ordinary, content: '' }],
        ['4', ordinary]
    ]);
    assert.equal(timingMetadata(await buildContext(message, 'bot')).length, 2);
    message.channel.messages.fetch = async () => { throw Object.assign(new Error('private'), { code: 50013 }); };
    assert.equal(timingMetadata(await buildContext(message, 'bot')).length, 1);
});

test('every message includes its UTC send time and age relative to the trigger, including bot replies', async () => {
    const { message } = fixture('anime slave, I gave you a voice now');
    const history = [
        { id: '99', createdTimestamp: Date.parse('2026-10-31T18:44:00+02:00'),
            author: { id: 'human', username: 'Human' }, content: 'I would rather wait five seconds for better audio.' },
        { id: '98', createdTimestamp: Date.parse('2026-10-31T16:43:00Z'),
            author: { id: 'bot', username: 'Anime Slave', bot: true }, content: 'Queued a song.' }
    ];
    message.channel.messages.fetch = async () => new Map(history.map(item => [item.id, item]));
    const context = await buildContext(message, 'bot');
    const [bot, earlier, latest] = timingMetadata(context);
    assert.deepEqual(bot, { message: 1, role: 'assistant', speaker: 'Anime Slave', sent_at: '2026-10-31T16:43:00.000Z', age_seconds: 1020, text: 'Queued a song.' });
    assert.equal(earlier.sent_at, '2026-10-31T16:44:00.000Z');
    assert.equal(earlier.age_seconds, 960);
    assert.equal(latest.sent_at, '2026-10-31T17:00:00.000Z');
    assert.equal(latest.age_seconds, 0);
    assert.equal(latest.text, message.content);
});

test('missing send times stay unknown rather than inventing recency from the wall clock', async () => {
    const { message } = fixture();
    message.channel.messages.fetch = async () => new Map([['99', {
        author: { id: 'human', username: 'Human' }, content: 'An undated message'
    }]]);
    let context = await buildContext(message, 'bot');
    assert.equal(timingMetadata(context)[0].sent_at, null);
    assert.equal(timingMetadata(context)[0].age_seconds, null);
    delete message.createdTimestamp;
    context = await buildContext(message, 'bot');
    assert.equal(timingMetadata(context).at(-1).sent_at, null);
    assert.equal(timingMetadata(context).at(-1).age_seconds, null);
});

test('old bot envelopes are removed from history without changing user text or timing', async () => {
    const envelope = JSON.stringify({ speaker: 'Anime Slave', sent_at: '2026-10-31T16:59:00Z', age_seconds: 0, text: 'Ass. Next dumbass question?' });
    const { message } = fixture(envelope);
    message.channel.messages.fetch = async () => new Map([['99', {
        content: envelope, createdTimestamp: Date.parse('2026-10-31T16:59:00Z'),
        author: { id: 'bot', username: 'Anime Slave', bot: true }
    }]]);
    const context = await buildContext(message, 'bot');
    const { history, current } = JSON.parse(context[1].content);
    assert.equal(history[0].text, 'Ass. Next dumbass question?');
    assert.equal(current.text, envelope);
    assert.equal(timingMetadata(context)[0].age_seconds, 60);
});

test('streamed metadata envelopes never appear in Discord, including fenced or interrupted output', async () => {
    const envelope = JSON.stringify({ speaker: 'Anime Slave', sent_at: '2026-10-31T17:00:00Z', age_seconds: 0, text: 'Ass. Next dumbass question?' });
    for (const wire of [envelope, '```json\n' + envelope + '\n```', JSON.stringify({ history: [], current: JSON.parse(envelope) })]) {
        const { message, edits } = fixture('anime slave boobs or ass');
        const chat = createChatbot(client, { env, now: () => Infinity, complete: async function* () {
            for (const char of wire) yield char;
        } });
        await chat.handle(message);
        assert.equal(edits.at(-1).content, 'Ass. Next dumbass question?');
        assert(edits.every(edit => !edit.content.includes('speaker') && !edit.content.includes('sent_at') && !edit.content.includes('age_seconds')));
    }
    for (const fail of [false, true]) {
        const { message, edits } = fixture();
        const chat = createChatbot(client, { env, complete: async function* () {
            yield envelope.slice(0, -8);
            if (fail) throw new Error('Connection dropped');
        } });
        await chat.handle(message);
        assert.equal(edits.length, 1);
        assert(!edits[0].content.includes('sent_at'));
        assert.match(edits[0].content, /crapped out/);
    }
});

test('requested JSON and code remain intact instead of being treated as internal metadata', async () => {
    for (const text of ['{"answer":42}', '```json\n{"answer":42}\n```', '```js\nconsole.log(42);\n```']) {
        const { message, edits } = fixture('anime slave give me code');
        const chat = createChatbot(client, { env, complete: async function* () { yield text; } });
        await chat.handle(message);
        assert.equal(edits.at(-1).content, text);
    }
});

test('SSE decoder handles split UTF-8, CRLF, keep-alives and usage, and never emits reasoning', async () => {
    let request;
    const wire = ': keep-alive\r\n\r\n' +
        'data: {"choices":[{"delta":{"reasoning_content":"private thoughts"}}]}\r\n\r\n' +
        'data: {"choices":[{"delta":{"content":"fuck yeah 🦆"}}]}\r\n\r\n' +
        'data: {"choices":[],"usage":{}}\n\n' +
        'data: [DONE]\n\n';
    const result = await collect(streamCompletion([{ role: 'user', content: 'hi' }], {
        apiKey: env.DEEPSEEK_API_KEY,
        fetchImpl: async (url, options) => { request = { url, ...options }; return sse(wire, 1); }
    }));
    assert.equal(result, 'fuck yeah 🦆');
    assert.equal(request.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer test-secret');
    const body = JSON.parse(request.body);
    assert.equal(body.model, 'deepseek-flash');
    assert.equal(body.stream, true);
    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.equal(body.max_tokens, 600);
});

test('provider failures are sanitized, interrupted streams fail, and cancellation closes the reader', async () => {
    await assert.rejects(collect(streamCompletion([], {
        apiKey: 'secret', fetchImpl: async () => new Response('private secret', { status: 401 })
    })), error => error.status === 401 && !error.message.includes('secret'));
    await assert.rejects(collect(streamCompletion([], {
        apiKey: 'secret', fetchImpl: async () => sse('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')
    })), error => error.status === 'incomplete_stream');
    await assert.rejects(collect(streamCompletion([], {
        apiKey: 'secret', fetchImpl: async () => sse('data: {"error":{"message":"private"}}\n\n')
    })), error => error.status === 'stream_error' && !error.message.includes('private'));
    let cancelled = false;
    const response = new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n')); },
        cancel() { cancelled = true; }
    }));
    for await (const delta of streamCompletion([], { apiKey: 'secret', fetchImpl: async () => response })) {
        assert.equal(delta, 'hello');
        break;
    }
    assert.equal(cancelled, true);
});

test('streaming edits one reply with throttling, a final flush, and mentions disabled everywhere', async () => {
    const { message, replies, edits } = fixture();
    let clock = 0;
    const chat = createChatbot(client, { env, now: () => clock, complete: async function* (messages, options) {
        assert.equal(messages.length, 2);
        assert.equal(options.apiKey, 'test-secret');
        assert.equal(options.signal.aborted, false);
        yield 'First';
        clock = 100;
        yield ' part';
        clock = 1600;
        yield ' @everyone';
        clock = 1700;
        yield '.';
    } });
    await chat.handle(message);
    assert.equal(replies.length, 1);
    assert.deepEqual(edits.map(item => item.content), ['First', 'First part @everyone', 'First part @everyone.']);
    for (const body of [...replies, ...edits]) assert.deepEqual(body.allowedMentions, { parse: [], repliedUser: false });
});

test('long completions stop reading and remain within Discord limits, including surrogate pairs', async () => {
    const { message, edits } = fixture();
    let closed = false;
    const chat = createChatbot(client, { env, complete: async function* () {
        try { yield 'a'.repeat(1998) + '🦆' + 'more'; assert.fail('Must stop consuming output at 2000 characters'); }
        finally { closed = true; }
    } });
    await chat.handle(message);
    assert.equal(closed, true);
    assert(edits.at(-1).content.length <= 2000);
    assert.equal(edits.at(-1).content, 'a'.repeat(1998) + '…');
    assert.equal(discordText('a'.repeat(2001)).length, 2000);
});

test('only one request per channel runs; channels stay isolated and busy state is released', async () => {
    const first = fixture();
    const second = fixture();
    const other = fixture('anime slave hi', 'other-channel');
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let calls = 0;
    const chat = createChatbot(client, { env, complete: async function* () {
        calls++;
        if (calls === 1) await gate;
        yield 'done';
    } });
    const running = chat.handle(first.message);
    await chat.handle(second.message);
    assert.match(second.replies[0].content, /One at a time/);
    await chat.handle(other.message);
    assert.equal(calls, 2);
    release();
    await running;
    await chat.handle(second.message);
    assert.equal(calls, 3);
});

test('errors replace placeholders, mark partial output, and allow subsequent retries', async () => {
    for (const partial of [false, true]) {
        const { message, edits } = fixture();
        let calls = 0;
        const chat = createChatbot(client, { env, complete: async function* () {
            calls++;
            if (calls > 1) { yield 'retry worked'; return; }
            if (partial) yield 'unfinished answer';
            throw Object.assign(new Error('test-secret must not be displayed'), { status: 429 });
        } });
        await chat.handle(message);
        assert.match(edits.at(-1).content, partial ? /interrupted/ : /slow the fuck down/);
        assert(!edits.at(-1).content.includes('test-secret'));
        await chat.handle(message);
        assert.equal(edits.at(-1).content, 'retry worked');
    }
});

test('empty completions and timeouts get a useful error; unconfigured chat never calls the API', async () => {
    for (const name of ['empty', 'TimeoutError']) {
        const { message, edits } = fixture();
        const chat = createChatbot(client, { env, complete: async function* () {
            if (name !== 'empty') throw Object.assign(new Error('private'), { name });
        } });
        await chat.handle(message);
        assert.match(edits.at(-1).content, name === 'empty' ? /crapped out/ : /too fucking long/);
    }
    const { message, replies } = fixture();
    const chat = createChatbot(client, { env: {}, complete: () => assert.fail('No configured key') });
    await chat.handle(message);
    assert.match(replies[0].content, /DEEPSEEK_API_KEY/);
});

test('shutdown aborts an active completion without posting an extra failure', async () => {
    const { message, edits } = fixture();
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    const chat = createChatbot(client, { env, complete: async function* (messages, { signal }) {
        started();
        await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    } });
    const running = chat.handle(message);
    await ready;
    chat.close();
    await running;
    assert.equal(edits.length, 0);
});

test('music commands retain priority, while unrecognized human messages route through chat', async () => {
    let musicCalls = 0;
    let chatCalls = 0;
    const routedClient = { commandsClassic: new Map([['help', { execute: async () => { musicCalls++; } }]]) };
    const player = { context: { provide: async (context, fn) => fn() } };
    const handlers = createHandlers(routedClient, player, { handle: async () => { chatCalls++; }, close: () => {} });
    await handlers.message(fixture('!help anime slave').message);
    await handlers.message(fixture('anime slave hello').message);
    await handlers.message({ ...fixture().message, author: { bot: true } });
    assert.equal(musicCalls, 1);
    assert.equal(chatCalls, 1);
});
