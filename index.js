const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  InteractionType,
  Partials,
  PermissionFlagsBits
} = require('discord.js');
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
const coins = {};
const warnings = {};
const dailyClaims = {};
const marriages = {};
const levels = {};
const welcomeSettings = {};
const customImages = {};
const embedTemplates = {};
const mathChallenges = {};

// Cooldown for the "destroy" command (per server)
const cooldowns = new Set();

// SLASH COMMAND SETUP
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
].map(cmd => cmd.toJSON());

client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands }
    );
    console.log(`Bot ready as ${client.user.tag}`);
  } catch (e) {
    console.error('Error registering slash commands:', e);
  }
});

client.login(process.env.TOKEN);

// Slash command handling
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  const { commandName, user, options } = interaction;
  const userId = user.id;

  const embed = new EmbedBuilder().setTimestamp();

  switch (commandName) {
    // ... existing slash commands
  }

  if (embed.data.title) {
    interaction.reply({ embeds: [embed] });
  }
});

// Message-based commands (no prefix for "destroy", prefix for others)
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim().toLowerCase();
  const userId = msg.author.id;

  // "destroy" command (no prefix)
  if (content === 'destroy') {
    const isAdmin = msg.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = msg.guild.ownerId === msg.author.id;

    if (!isAdmin && !isOwner) {
      return msg.reply({ content: "Only server admins or owners can use 'destroy'!", allowedMentions: { repliedUser: false } });
    }

    // Check for cooldown
    if (cooldowns.has(msg.guild.id)) {
      return msg.reply({ content: "Please wait before using 'destroy' again.", allowedMentions: { repliedUser: false } });
    }

    // Add to cooldown
    cooldowns.add(msg.guild.id);
    setTimeout(() => cooldowns.delete(msg.guild.id), 30000); // 30 seconds cooldown

    // Check bot permissions
    if (!msg.guild.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return msg.reply({ content: "I don't have permission to delete messages.", allowedMentions: { repliedUser: false } });
    }

    try {
      const fetchedMessages = await msg.channel.messages.fetch({ limit: 10 });
      const filteredMessages = fetchedMessages.filter(m => !m.pinned && (Date.now() - m.createdTimestamp) < 1209600000);

      console.log(`Filtered messages count: ${filteredMessages.size}`); // Add this line for debugging
      if (filteredMessages.size === 0) {
        return msg.reply({ content: "No recent messages to destroy." });
      }

      const deletedMessages = await msg.channel.bulkDelete(filteredMessages, true);
      console.log(`Deleted ${deletedMessages.size} messages in ${msg.channel.name}.`);

      const reply = await msg.channel.send({ content: `Successfully destroyed ${deletedMessages.size} message(s).` });
      setTimeout(() => reply.delete().catch(() => {}), 1500);
    } catch (err) {
      console.error('Destroy error:', err);
      const error = await msg

