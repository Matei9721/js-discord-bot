const ytdlp = require('./ytdlp');
const waiting = new Set();
const jobs = new Map();
const busy = new Set();
let active = 0;
function cancel(queue) {
    const job = jobs.get(queue);
    if (!job) return;
    jobs.delete(queue);
    job.cancelled = true;
    job.stream?.destroy();
}
function prefetchNext(queue) {
    const next = queue.tracks.at(0);
    const job = jobs.get(queue);
    if (job && job.track === next) return;
    cancel(queue);
    if (queue.deleted || !next || next.live || next.source !== 'youtube') { waiting.delete(queue); return; }
    waiting.add(queue);
    drain();
}
function drain() {
    for (const queue of waiting) {
        if (active >= 2) break;
        if (busy.has(queue)) continue;
        waiting.delete(queue);
        const track = queue.tracks.at(0);
        if (queue.deleted || !track || track.live || track.source !== 'youtube') continue;
        const job = { track, cancelled: false, stream: null };
        jobs.set(queue, job);
        active++; busy.add(queue);
        job.promise = (async () => {
            const info = await ytdlp.prepare(track.url);
            if (job.cancelled) return null;
            // Do not record a live broadcast ahead of its actual playback time.
            if (info.is_live || info.live_status === 'is_live') return null;
            const stream = await ytdlp.audio(track.url);
            job.stream = stream;
            if (job.cancelled) { stream.destroy(); return null; }
            stream.once('error', () => { if (jobs.get(queue) === job) jobs.delete(queue); });
            return stream;
        })().catch(() => null).finally(() => { active--; busy.delete(queue); drain(); });
    }
}
async function take(queue, track) {
    const job = jobs.get(queue);
    if (!job || job.track !== track) return null;
    jobs.delete(queue); waiting.delete(queue);
    return job.promise;
}
function forget(queue) { waiting.delete(queue); cancel(queue); }
function clear() { waiting.clear(); for (const queue of jobs.keys()) cancel(queue); }
function status(queue) {
    const job = jobs.get(queue);
    return { title: job?.track.title, ready: Boolean(job?.stream && !job.stream.destroyed) };
}
module.exports = { prefetchNext, take, forget, clear, status };
