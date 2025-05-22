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
const crossbanToggles = {}; // New: crossban toggle per guild

const cooldowns = new Set();

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
  new SlashCommandBuilder().setName('crossban-toggle') // NEW command
    .setDescription('Toggle auto cross-server bans on or off for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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

client.login(process.env.TOKEN);

client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  const { commandName, user, options } = interaction;
  const userId = user.id;
  const embed = new EmbedBuilder().setTimestamp();

  switch (commandName) {
    case 'crossban-toggle': {
      const guildId = interaction.guildId;
      crossbanToggles[guildId] = !crossbanToggles[guildId];
      const state = crossbanToggles[guildId] ? 'enabled ✅' : 'disabled ❌';

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Crossban Toggled')
            .setDescription(`Auto cross-server banning is now **${state}**.`)
            .setColor(crossbanToggles[guildId] ? 0x00FF00 : 0xFF0000)
            .setTimestamp()
        ]
      });
      break;
    }

    // Add other command logic here (balance, claim, give, warn, etc.)
  }

  if (embed.data.title) {
    interaction.reply({ embeds: [embed] });
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim().toLowerCase();
  const userId = msg.author.id;

  if (content === 'destroy') {
    const isAdmin = msg.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = msg.guild.ownerId === msg.author.id;

    if (!isAdmin && !isOwner) {
      return msg.reply({ content: "Only server admins or owners can use 'destroy'!", allowedMentions: { repliedUser: false } });
    }

    if (cooldowns.has(msg.guild.id)) {
      return msg.reply({ content: "Please wait before using 'destroy' again.", allowedMentions: { repliedUser: false } });
    }

    cooldowns.add(msg.guild.id);
    setTimeout(() => cooldowns.delete(msg.guild.id), 30000);

    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return msg.reply({ content: "I don't have permission to delete messages.", allowedMentions: { repliedUser: false } });
    }

    try {
      const fetchedMessages = await msg.channel.messages.fetch({ limit: 10 });
      const filteredMessages = fetchedMessages.filter(m => !m.pinned && (Date.now() - m.createdTimestamp) < 1209600000);

      if (filteredMessages.size === 0) {
        return msg.reply({ content: "No recent messages to destroy." });
      }

      const deletedMessages = await msg.channel.bulkDelete(filteredMessages, true);
      const reply = await msg.channel.send({ content: `Successfully destroyed ${deletedMessages.size} message(s).` });
      setTimeout(() => reply.delete().catch(() => {}), 1500);
    } catch (err) {
      console.error('Destroy error:', err);
    }
  }
});

// AUTO-BAN SYSTEM
const FLAGGED_SERVER_ID = '1242213647061614803';

client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== FLAGGED_SERVER_ID) return;

  console.log(`[⚠️ DETECTED] ${member.user.tag} joined the flagged server.`);

  for (const [guildId, guild] of client.guilds.cache) {
    if (guildId === FLAGGED_SERVER_ID) continue;
    if (!crossbanToggles[guildId]) continue;

    try {
      const target = await guild.members.fetch(member.id);
      await target.ban({
        reason: 'Auto-banned: joined flagged server.'
      });
      console.log(`✅ Banned ${member.user.tag} from ${guild.name}`);
    } catch {
      // Skip if user not in guild or can't be banned
    }
  }
});
