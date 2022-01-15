# A Discord.js music bot made from scratch

## Bot description

This bot is using the Discord.js wrapper for the Discord API. It's main functionality is playing music from YouTube for which it uses Play-dl as it's main package. Apart from Discord.js and Play-dl, the code has been written from scratch and is very customizable/editable. The bot can currently run concurrently on multiple guilds/servers and supports the following features:

## Bot features:
- Play music using youtube URL: **!play** *yt-url*
- Play music using the youtube video name: **!play** *video name*
- Play a youtube playlist: **!play** *playlist url* (If the playlist contains unavailable videos, it won't work)
- Songs get automatically queued. You can check the current queue: **!queue**
- Skip the current song: **!skip**
- Pause the current song: **!pause**
- Resume the current song: **!resume**

## Bot installation

To run the bot all you have to do is clone the repository and in the main directori create an .env file containing your BOT_TOKEN. Then run the ussual *npm install* and *npm start* and everything should be up and running.

## Notes

- Currently, slash commands are not fully implemented. When and if they are implemented, they will also be made global such that you don't have to make requests to the discord API for each new guild.
- There is no database support yet, but in the future I do plan to add MySQL support for extra features.

## Upcoming updated:

- Code refactoring and implementation of slash commands.
- Better error handling
- Anime notification functionality - The bot will send notifications to a certain guild room whenever a new episode from a favourite anime has aired.

