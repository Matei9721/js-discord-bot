const ENDPOINT = 'https://api.deepseek.com/chat/completions';

class DeepSeekError extends Error {
    constructor(status) {
        super('DeepSeek request failed');
        this.name = 'DeepSeekError';
        this.status = status;
    }
}

async function* streamCompletion(messages, { apiKey, model = 'deepseek-flash', maxTokens = 600, signal, fetchImpl = fetch }) {
    const response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true, thinking: { type: 'disabled' }, max_tokens: maxTokens }),
        signal
    });
    if (!response.ok) {
        await response.body?.cancel();
        // Never surface provider response bodies: they can contain private request data.
        throw new DeepSeekError(response.status);
    }
    if (!response.body) throw new DeepSeekError('empty_body');

    let pending = '';
    for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
        pending += chunk;
        let end;
        while ((end = pending.indexOf('\n')) !== -1) {
            const line = pending.slice(0, end).trim();
            pending = pending.slice(end + 1);
            if (!line.startsWith('data:')) continue; // Includes DeepSeek's keep-alive comments.
            const data = line.slice(5).trim();
            if (data === '[DONE]') return;
            if (!data) continue;
            const event = JSON.parse(data);
            if (event.error) throw new DeepSeekError('stream_error');
            // Only final-answer text is public; never send reasoning_content to Discord.
            const content = event.choices?.[0]?.delta?.content;
            if (typeof content === 'string') yield content;
        }
    }
    // A dropped connection must not silently turn a partial answer into a completed one.
    throw new DeepSeekError('incomplete_stream');
}

module.exports = { streamCompletion, DeepSeekError };
