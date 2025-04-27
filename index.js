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
    case 'balance':
      embed.setColor('Green').setTitle(`${user.username}'s Balance`).setDescription(`You have **${coins[userId] || 0}** coins.`);
      break;

    case 'claim':
      const today = new Date().toDateString();
      if (dailyClaims[userId] === today)
        return interaction.reply({ content: "You've already claimed your daily coins today!", ephemeral: true });
      const amount = Math.floor(Math.random() * 100) + 50;
      coins[userId] = (coins[userId] || 0) + amount;
      dailyClaims[userId] = today;
      embed.setColor('Gold').setTitle('Daily Claim').setDescription(`You claimed **${amount}** coins!`);
      break;

    case 'give':
      const target = options.getUser('target');
      const amt = options.getInteger('amount');
      if ((coins[userId] || 0) < amt)
        return interaction.reply({ content: "You don't have enough coins.", ephemeral: true });
      coins[userId] -= amt;
      coins[target.id] = (coins[target.id] || 0) + amt;
      embed.setColor('Green').setTitle('Transfer').setDescription(`You gave **${amt}** coins to **${target.username}**.`);
      break;

    case 'warn':
      const warned = options.getUser('target');
      warnings[warned.id] = (warnings[warned.id] || 0) + 1;
      embed.setColor('Red').setTitle('Warning Issued').setDescription(`${warned.username} has been warned. Total warnings: **${warnings[warned.id]}**.`);
      break;

    case 'marry':
      const partner = options.getUser('target');
      if (marriages[userId] || marriages[partner.id])
        return interaction.reply({ content: "One of you is already married!", ephemeral: true });
      marriages[userId] = partner.id;
      marriages[partner.id] = userId;
      embed.setColor('Pink').setTitle('Marriage').setDescription(`${user.username} and ${partner.username} are now married!`);
      break;

    case 'poll':
      const question = options.getString('question');
      const pollEmbed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('Poll')
        .setDescription(question)
        .setFooter({ text: `Poll by ${user.username}` })
        .setTimestamp();
      const msg = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });
      await msg.react('✅');
      await msg.react('❌');
      return;

    case 'kick':
    case 'ban':
      const member = await interaction.guild.members.fetch(options.getUser('target').id);
      if (commandName === 'kick') await member.kick('Kicked by bot');
      else await member.ban({ reason: 'Banned by bot' });
      embed.setColor('Red').setTitle(`${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Success`).setDescription(`${member.user.username} has been ${commandName}ed.`);
      break;

    case 'level':
      embed.setColor('Purple').setTitle(`${user.username}'s Level`).setDescription(`Level: **${levels[userId] || 0}**`);
      break;

    case 'leaderboard':
      const top = Object.entries(coins).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const lbText = top.map(([id, bal], i) => `${i + 1}. <@${id}> - ${bal} coins`).join('\n');
      embed.setColor('Gold').setTitle('Top Coin Holders').setDescription(lbText || "Nobody has coins yet.");
      break;

    case 'math':
      return interaction.reply({ content: "The hourly math challenge is disabled for now!", ephemeral: true });
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

    try {
      const fetchedMessages = await msg.channel.messages.fetch({ limit: 10 });
      const filteredMessages = fetchedMessages.filter(m => !m.pinned && (Date.now() - m.createdTimestamp) < 1209600000);

      if (filteredMessages.size === 0) {
        return msg.reply({ content: "No recent messages to destroy." });
      }

      await msg.channel.bulkDelete(filteredMessages, true);

      const reply = await msg.channel.send({ content: "https://tenor.com/view/jojo-giogio-requiem-jjba-gif-14649703" });
      setTimeout(() => reply.delete().catch(() => {}), 1500);
    } catch (err) {
      console.error('Destroy error:', err);
      const error = await msg.reply({ content: "Failed to destroy messages." });
      setTimeout(() => error.delete().catch(() => {}), 3000);
    }
    return;
  }

  // Prefix commands (e.g., c!balance etc)
  if (!msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // You can add prefix commands here later if you want
});
