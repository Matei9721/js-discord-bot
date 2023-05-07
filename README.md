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
- Seek into a song: **!seek**

## Bot installation

To run the bot all you have to do is clone the repository and in the main directori create an .env file containing your BOT_TOKEN, GUILD_ID and CLIENT_ID (last two are used for slash commands). Then run the ussual *npm install* and *npm start* and everything should be up and running.

## Notes

- Slash commands are for now global, for testing purposes uncomment and replace the lines in commandRegister.js, guild commands are generally better for testing as changes take place instantly, global commands modifications might take a while before showing up
- There is no database support yet, but in the future I do plan to add MySQL support for extra features.


## (Hopefully) Upcoming updates:

- Better error handling
- Anime notification functionality - The bot will send notifications to a certain guild room whenever a new episode from a favourite anime has aired.

## Screenshots
![playing a song](https://user-images.githubusercontent.com/60573633/149918018-4f23df94-f0c3-4ee4-aaac-65de66099fd6.png)

![queueing a song](https://user-images.githubusercontent.com/60573633/149918320-11ee50f2-8fd5-487d-881b-e6bf7873cd11.png)

![image](https://user-images.githubusercontent.com/60573633/149918610-54506c19-3440-4375-9ecd-a4c23979425e.png)





