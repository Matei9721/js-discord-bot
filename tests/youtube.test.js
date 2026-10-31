const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const { YtDlpExtractor, normalizeQuery, isPlaylistQuery, youtubeURL, duration } = require('../youtube/YtDlpExtractor');
const { generateSongList } = require('../utilities/songListOperations');

test('YouTube queries allow search and genuine hosts and distinguish videos from playlists', () => {
    assert.equal(normalizeQuery(' a song '), 'ytsearch1:a song');
    assert.equal(normalizeQuery('<https://youtu.be/dQw4w9WgXcQ?list=PL123>'), 'https://www.youtube.com/playlist?list=PL123');
    assert.equal(normalizeQuery('https://www.youtube.com/watch?v=t98MPUJuSKw&list=PLk5JlUIlwWO1vjSTUpZXAeDOEIZco9SGy'), 'https://www.youtube.com/playlist?list=PLk5JlUIlwWO1vjSTUpZXAeDOEIZco9SGy');
    assert(normalizeQuery('https://www.youtube.com/playlist?list=PL123').includes('list=PL123'));
    assert(!youtubeURL('https://youtube.com.attacker.test/watch?v=x'));
    for (const input of ['', 'file:///etc/passwd', 'http://localhost:3000', '--exec:evil']) {
        if (input.startsWith('--')) assert.equal(normalizeQuery(input), `ytsearch1:${input}`);
        else assert.throws(() => normalizeQuery(input));
    }
});
test('YouTube Mix links preserve the seed video and route through background playlist loading', () => {
    const original = 'https://www.youtube.com/watch?v=GMuLmqvONho&list=RDGMuLmqvONho&start_radio=1';
    assert.equal(normalizeQuery(original), original);
    assert.equal(normalizeQuery('https://youtu.be/GMuLmqvONho?list=RDGMuLmqvONho'), original);
    assert.equal(normalizeQuery('https://www.youtube.com/playlist?list=RDGMuLmqvONho'), original);
    assert(isPlaylistQuery(normalizeQuery(original)));
    assert(!isPlaylistQuery('https://www.youtube.com/watch?v=GMuLmqvONho'));
    assert.throws(() => normalizeQuery('https://www.youtube.com/playlist?list=RDMM'), /starting video/);
    const mixed = normalizeQuery('https://www.youtube.com/watch?v=GMuLmqvONho&list=RDMM');
    assert(isPlaylistQuery(mixed));
    assert.equal(new URL(mixed).searchParams.get('v'), 'GMuLmqvONho');
});
test('metadata becomes a playlist while private and deleted entries are omitted', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    try {
        const extractor = await player.extractors.register(YtDlpExtractor, {});
        const response = extractor.response({ id: 'PL123', title: 'List', entries: [
            { id: 'dQw4w9WgXcQ', title: 'Public', duration: 213 }, null,
            { id: 'aaaaaaaaaaa', title: '[Private video]' },
            { id: 'bbbbbbbbbbb', title: '[Deleted video]' },
            { id: 'ccccccccccc', title: 'Private', availability: 'private' }
        ] }, {}, 'https://www.youtube.com/playlist?list=PL123');
        assert.equal(response.tracks.length, 1);
        assert.equal(response.playlist.tracks[0], response.tracks[0]);
        assert.equal(response.tracks[0].duration, '3:33');
        assert.equal(response.tracks[0].extractor, extractor);
        assert.equal(response.tracks[0].queryType, QueryType.YOUTUBE_VIDEO);
        assert.equal(extractor.response({ entries: [{ id: 'dQw4w9WgXcQ', title: 'Search' }] }, {}, 'ytsearch1:song').playlist, null);
    } finally { await player.destroy(); await client.destroy(); }
});
test('flat livestream entries retain live status and display Live instead of zero duration', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    try {
        const extractor = await player.extractors.register(YtDlpExtractor, {});
        const result = extractor.response({ entries: [{ id: 'rFZHOHl-L8A', title: 'Live radio', live_status: 'is_live', duration: null }] }, {}, 'ytsearch1:radio');
        assert.equal(result.tracks[0].live, true);
        assert.equal(result.tracks[0].duration, 'Live');
    } finally { await player.destroy(); await client.destroy(); }
});
test('song lists obey Discord limits and only report genuinely omitted songs', () => {
    const track = { title: 'Title', url: 'https://youtu.be/dQw4w9WgXcQ' };
    assert(!generateSongList([track]).includes('more songs'));
    const list = generateSongList(Array.from({ length: 100 }, () => track));
    assert(list.length <= 1024); assert.match(list, /more songs/);
    assert(generateSongList([]).length > 0);
    assert.equal(duration(3661), '1:01:01');
});
