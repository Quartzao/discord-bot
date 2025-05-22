const express = require('express');
const app = express();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, InteractionType, Partials, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = "c!";
const coins = {}, warnings = {}, dailyClaims = {}, marriages = {}, levels = {}, welcomeSettings = {}, customImages = {}, embedTemplates = {}, mathChallenges = {}, cooldowns = new Set();
const crossBanServers = new Set();

const FLAGGED_SERVER_ID = '1242213647061614803';

// Web server to keep Glitch project alive
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server running.'));

const slashCommands = [
  new SlashCommandBuilder().setName('balance').setDescription('Check your coin balance.'),
  new SlashCommandBuilder().setName('claim').setDescription('Claim your daily coins.'),
  new SlashCommandBuilder().setName('give').setDescription('Give coins to another user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('marry').setDescription('Propose to another user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Create a yes/no poll.')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('level').setDescription('Check your level.'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top coin holders.'),
  new SlashCommandBuilder().setName('math').setDescription('Answer a math challenge manually.')
    .addStringOption(opt => opt.setName('answer').setDescription('Your math answer').setRequired(true)),
  new SlashCommandBuilder().setName('crossban-toggle').setDescription('Toggle auto banning of users in a flagged server.'),
].map(cmd => cmd.toJSON());

client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
    console.log(`Bot ready as ${client.user.tag}`);
  } catch (e) {
    console.error('Error registering slash commands:', e);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  const { commandName, user, options } = interaction;
  const userId = user.id;
  const guildId = interaction.guild?.id;
  const embed = new EmbedBuilder().setTimestamp();

  if (commandName === 'crossban-toggle') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Only admins can toggle this.', ephemeral: true });
    }
    if (crossBanServers.has(guildId)) {
      crossBanServers.delete(guildId);
      embed.setTitle('Auto cross-server banning is now disabled ❌.');
    } else {
      crossBanServers.add(guildId);
      embed.setTitle('Auto cross-server banning is now enabled ✅.');
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Add other slash commands here...
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim().toLowerCase();
  const userId = msg.author.id;

  if (content === 'destroy') {
    const isAdmin = msg.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = msg.guild.ownerId === msg.author.id;
    if (!isAdmin && !isOwner) return msg.reply("Only admins or server owners can use 'destroy'!");

    if (cooldowns.has(msg.guild.id)) return msg.reply("Please wait before using 'destroy' again.");
    cooldowns.add(msg.guild.id);
    setTimeout(() => cooldowns.delete(msg.guild.id), 30000);

    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return msg.reply("I don't have permission to delete messages.");
    }

    try {
      const fetchedMessages = await msg.channel.messages.fetch({ limit: 10 });
      const filteredMessages = fetchedMessages.filter(m => !m.pinned && (Date.now() - m.createdTimestamp) < 1209600000);
      if (filteredMessages.size === 0) return msg.reply("No recent messages to destroy.");
      const deletedMessages = await msg.channel.bulkDelete(filteredMessages, true);
      const reply = await msg.channel.send(`Successfully destroyed ${deletedMessages.size} message(s).`);
      setTimeout(() => reply.delete().catch(() => {}), 1500);
    } catch (err) {
      console.error('Destroy error:', err);
    }
  }
});

// Cross-server ban logic
client.on('guildMemberAdd', async (member) => {
  try {
    const userId = member.id;

    // Check if they joined the flagged server
    if (member.guild.id === FLAGGED_SERVER_ID) {
      const user = member.user;
      for (const [guildId, guild] of client.guilds.cache) {
        if (guild.id !== FLAGGED_SERVER_ID && crossBanServers.has(guild.id)) {
          try {
            await guild.members.ban(userId, { reason: 'User joined flagged server.' });
            console.log(`Banned ${user.tag} from ${guild.name}`);
          } catch (err) {
            console.error(`Failed to ban ${user.tag} in ${guild.name}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('Cross-ban error:', err);
  }
});

client.login(process.env.TOKEN);
