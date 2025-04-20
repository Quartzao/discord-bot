const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = 'c!';
const targetUserId = '1124259186621022229';
let interval = null;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === 'startping') {
    if (interval) return message.reply('Already pinging!');
    interval = setInterval(() => {
      message.channel.send(`<@${targetUserId}>`);
    }, 500); // 0.5 seconds
    return message.reply('Started pinging.');
  }

  if (cmd === 'stopping') {
    if (!interval) return message.reply('Not currently pinging.');
    clearInterval(interval);
    interval = null;
    return message.reply('Stopped pinging.');
  }
});

client.login(process.env.TOKEN);
