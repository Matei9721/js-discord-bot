const states = new WeakMap();
function stateFor(queue) {
    if (!states.has(queue)) states.set(queue, { starting: null, loadingTrack: null, skippedResource: null, imports: new Set(), pendingSearches: 0, version: 0 });
    return states.get(queue);
}
function cancelImports(queue) {
    const state = stateFor(queue);
    state.version++;
    for (const controller of state.imports) controller.abort();
}
async function enqueue(player, voiceChannel, searchResult, nodeOptions, { signal } = {}) {
    signal?.throwIfAborted();
    if (!searchResult.tracks.length) throw new Error('No playable songs found.');
    const queue = player.nodes.create(voiceChannel.guild, nodeOptions);
    const entry = queue.tasksQueue.acquire();
    await entry.getTask();
    try {
        signal?.throwIfAborted();
        if (queue.deleted) throw new Error('The player was disconnected. Please try again.');
        if (queue.channel && queue.channel.id !== voiceChannel.id) throw new Error('Join the same voice channel as the bot to queue music.');
        if (!queue.channel) await queue.connect(voiceChannel, { deaf: true, daveEncryption: true });
        queue.setMetadata(nodeOptions.metadata);
        queue.addTrack(searchResult.playlist || searchResult.tracks[0]);
        const state = stateFor(queue);
        // currentTrack also covers the next track being extracted after finish.
        // Player.play() only checks isPlaying(), which is false in that gap.
        if (!state.starting && !queue.currentTrack && !queue.isPlaying()) {
            const track = queue.tracks.at(0);
            state.loadingTrack = track;
            state.starting = queue.node.play().catch(error => {
                if (!queue.deleted) queue.emit('playerError', queue, error);
            }).finally(() => { state.starting = null; if (state.loadingTrack === track) state.loadingTrack = null; });
        }
        return { queue, track: searchResult.tracks[0], searchResult };
    } finally { queue.tasksQueue.release(); }
}
module.exports = { enqueue, stateFor, cancelImports };
