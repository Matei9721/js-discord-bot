const { FFmpeg } = require('@discord-player/ffmpeg');
const { StreamType } = require('discord-voip');

const qualityOptions = {
    disableVolume: true, disableEqualizer: true, disableFilterer: true,
    disableBiquad: true, disableResampler: true, disableCompressor: true,
    disableSeeker: true, disableReverb: true,
    onAfterCreateStream: finishAudioStream
};
function sourceStream(stream, info) {
    if (info?.acodec === 'opus' && info.ext === 'webm' && info.asr === 48000 && info.audio_channels === 2) {
        return { $fmt: StreamType.WebmOpus, stream };
    }
    return stream;
}
async function finishAudioStream(stream) {
    // Demuxed source Opus packets already have the format Discord requires.
    if (stream.readableObjectMode) return { stream, type: StreamType.Opus };
    // AAC sources and seeks reach this hook as 48 kHz stereo PCM. Encode with
    // FFmpeg's native libopus rather than the JS package's default Rust encoder.
    const encoded = new FFmpeg({ shell: false, args: [
        '-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0',
        '-vn', '-c:a', 'libopus', '-application', 'audio', '-b:a', '160k', '-vbr', 'on',
        '-compression_level', '10', '-frame_duration', '20', '-page_duration', '20000',
        '-flush_packets', '1', '-f', 'opus'
    ] });
    stream.once('error', error => encoded.destroy(error));
    encoded.once('close', () => stream.destroy());
    stream.pipe(encoded);
    return { stream: encoded, type: StreamType.OggOpus };
}
module.exports = { qualityOptions, sourceStream, finishAudioStream };
