const MAX_CHARS = 900; // Discord embed field limit

function generateSongList(tracks) {
    let tempText = '';
    let remainingTracks = 0;

    // Add tracks until the character limit is reached
    for (let i = 0; i < tracks.length; i++) {
        let trackLine = `${i + 1}. [${tracks[i].title}](${tracks[i].url})\n`;

        // If adding the track exceeds the character limit, stop
        if (tempText.length + trackLine.length > MAX_CHARS) {
            remainingTracks = tracks.length - i; // Update remaining tracks
            break;
        }

        tempText += trackLine; // Append track if it fits
    }

    // If there are more tracks, add the "And x more songs..." line
    if (remainingTracks > 0) {
        tempText += `\nAnd ${remainingTracks} more songs...`;
    }

    return tempText || 'No tracks available.';
}


function getSongListDuration(tracks) {
    // Calculate total duration in seconds
    let duration = tracks.reduce((total, song) =>
        total + song.duration.split(':').reduce((acc, time) => (60 * acc) + +time), 0
    );

    // Format duration dynamically (hh:mm:ss if > 1 hour, otherwise mm:ss)
    let hours = Math.floor(duration / 3600);
    let minutes = Math.floor((duration % 3600) / 60);
    let seconds = duration % 60;
    return hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
    generateSongList,
    getSongListDuration
}
