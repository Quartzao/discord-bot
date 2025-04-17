require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField, EmbedBuilder } = require('discord.js');
const ms = require('ms');

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "c!"; // Your command prefix
let coins = {}; // Store users' coins data
let levels = {}; // Store users' XP and level data
let relationships = {}; // Store relationship statuses
let polls = []; // Store polls
let warnings = {}; // Store warning data
let mutedMembers = {}; // Store muted users
let deletedMessages = []; // Store deleted messages for logging

// Register commands when the bot is ready
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Slash command registration
  const commands = [
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option => option.setName('target').setDescription('User to kick')),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option => option.setName('target').setDescription('User to ban')),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a user')
      .addUserOption(option => option.setName('target').setDescription('User to warn')),

    new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Mute a user')
      .addUserOption(option => option.setName('target').setDescription('User to mute'))
      .addStringOption(option => option.setName('duration').setDescription('Duration of mute (e.g., 10m, 1h)').setRequired(true)),

    new SlashCommandBuilder()
      .setName('unmute')
      .setDescription('Unmute a user')
      .addUserOption(option => option.setName('target').setDescription('User to unmute')),

    new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set slow mode in a channel')
      .addStringOption(option => option.setName('time').setDescription('Duration of slow mode (e.g., 5s, 1m)').setRequired(true)),

    new SlashCommandBuilder()
      .setName('logs')
      .setDescription('View deleted messages logs')
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// Slash command handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const duration = interaction.options.getString('duration');
  const time = interaction.options.getString('time');

  if (interaction.commandName === 'warn') {
    if (!target) return interaction.reply({ content: 'You need to specify a user to warn!' });

    if (!warnings[target.id]) warnings[target.id] = 0;
    warnings[target.id] += 1;

    const warnEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`Warning for ${target.tag}`)
      .setDescription(`${target.tag} has been warned. They have ${warnings[target.id]} warnings.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [warnEmbed] });

    // If user has 3 warnings, kick them
    if (warnings[target.id] >= 3) {
      const kickEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`Kick Notification`)
        .setDescription(`${target.tag} has been kicked for receiving 3 warnings.`)
        .setTimestamp()
        .setFooter({ text: 'Bot Powered by CoolBot' });

      target.kick('Received 3 warnings');
      await interaction.followUp({ embeds: [kickEmbed] });
    }
  }

  if (interaction.commandName === 'mute') {
    if (!target) return interaction.reply({ content: 'You need to specify a user to mute!' });

    if (!duration) return interaction.reply({ content: 'You need to specify a duration!' });

    const muteDuration = ms(duration);
    if (!muteDuration) return interaction.reply({ content: 'Invalid duration format! Use formats like 10m, 1h, etc.' });

    mutedMembers[target.id] = {
      mutedAt: Date.now(),
      muteDuration: muteDuration
    };

    await interaction.reply({ content: `${target.tag} has been muted for ${duration}.` });

    setTimeout(() => {
      delete mutedMembers[target.id];
      interaction.followUp({ content: `${target.tag} has been unmuted.` });
    }, muteDuration);
  }

  if (interaction.commandName === 'unmute') {
    if (!target) return interaction.reply({ content: 'You need to specify a user to unmute!' });

    delete mutedMembers[target.id];
    await interaction.reply({ content: `${target.tag} has been unmuted.` });
  }

  if (interaction.commandName === 'slowmode') {
    const channel = interaction.channel;
    if (!time) return interaction.reply({ content: 'You need to specify a time for slow mode!' });

    const slowModeDuration = ms(time);
    if (!slowModeDuration) return interaction.reply({ content: 'Invalid time format! Use formats like 5s, 1m, etc.' });

    await channel.setRateLimitPerUser(slowModeDuration / 1000); // Convert milliseconds to seconds
    await interaction.reply({ content: `Slow mode has been set to ${time} in this channel.` });
  }

  if (interaction.commandName === 'logs') {
    const logEmbed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle('Deleted Messages Logs')
      .setDescription(deletedMessages.length > 0 ? deletedMessages.join('\n') : 'No deleted messages logged.')
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [logEmbed] });
  }
});

// Message handling for moderation and message deletion logging
client.on('messageDelete', message => {
  if (message.author.bot) return;

  const logMessage = `${message.author.tag}: ${message.content}`;
  deletedMessages.push(logMessage);
  if (deletedMessages.length > 10) deletedMessages.shift(); // Keep the log within 10 messages
});

// Prefix command handling
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  if (command === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    message.reply({ embeds: [balanceEmbed] });
  }

  // Other commands go here (balance, claim, etc.)...
});

// Log the bot in
client.login(process.env.TOKEN);
