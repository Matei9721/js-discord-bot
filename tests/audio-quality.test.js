const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { spawn } = require('node:child_process');
const { FFmpeg } = require('@discord-player/ffmpeg');
const { StreamType } = require('discord-voip');
const { qualityOptions, sourceStream, finishAudioStream } = require('../audio/quality');

test('48 kHz stereo source Opus bypasses PCM conversion and encoding', async () => {
    const source = Readable.from([Buffer.from('packet')], { objectMode: true });
    const wrapped = sourceStream(source, { acodec: 'opus', ext: 'webm', asr: 48000, audio_channels: 2 });
    assert.equal(wrapped.$fmt, StreamType.WebmOpus);
    assert.equal(wrapped.stream, source);
    const output = await finishAudioStream(source);
    assert.equal(output.stream, source);
    assert.equal(output.type, StreamType.Opus);
    assert(qualityOptions.disableFilterer && qualityOptions.disableVolume && qualityOptions.disableEqualizer);
    assert.equal(sourceStream(source, { acodec: 'mp4a.40.2', ext: 'mp4' }), source);
    source.destroy();
});
test('native fallback encodes digital silence without adding static', async () => {
    const input = Readable.from([Buffer.alloc(48000 * 2 * 2 / 2)], { objectMode: false });
    const encoded = await finishAudioStream(input);
    assert.equal(encoded.type, StreamType.OggOpus);
    const ffmpeg = spawn(FFmpeg.resolve().command, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '2', '-ar', '48000', 'pipe:1'], { windowsHide: true });
    const chunks = [];
    ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
    ffmpeg.stderr.resume();
    encoded.stream.on('error', error => ffmpeg.stdin.destroy(error));
    encoded.stream.pipe(ffmpeg.stdin);
    const code = await new Promise((resolve, reject) => { ffmpeg.once('close', resolve); ffmpeg.once('error', reject); });
    assert.equal(code, 0);
    const pcm = Buffer.concat(chunks);
    assert(pcm.length >= 48000, 'The silence must be decoded rather than dropped');
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
    assert(peak <= 1, `Unexpected noise peak in digital silence: ${peak}`);
});
