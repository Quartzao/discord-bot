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
const mathAnswers = {};

// HOURLY MATH CHALLENGE
const questions = [
  { q: "What is 12 + 7?", a: "19" },
  { q: "Solve 9 * 3", a: "27" },
  { q: "What is 100 / 4?", a: "25" },
  { q: "15 - 9 equals?", a: "6" }
];

setInterval(() => {
  client.guilds.cache.forEach(guild => {
    const channel = guild.systemChannel;
    if (channel) {
      const { q, a } = questions[Math.floor(Math.random() * questions.length)];
      mathAnswers[guild.id] = a;
      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('Math Challenge!')
        .setDescription(`First to answer correctly gets 100 coins!\n**${q}**`)
        .setTimestamp();
      channel.send({ embeds: [embed] });
    }
  });
}, 1000 * 60 * 60); // every hour

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
  new SlashCommandBuilder().setName('math').setDescription('Answer math challenge.')
    .addStringOption(opt => opt.setName('answer').setDescription('Answer').setRequired(true)),
].map(cmd => cmd.toJSON());

client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: slashCommands }
    );
    console.log(`Bot ready as ${client.user.tag}`);
  } catch (e) {
    console.error('Error registering slash commands:', e);
  }
});

// SLASH COMMAND HANDLER
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
        return interaction.reply({ content: "You've already claimed today!", ephemeral: true });
      const amount = Math.floor(Math.random() * 100) + 50;
      coins[userId] = (coins[userId] || 0) + amount;
      dailyClaims[userId] = today;
      embed.setColor('Gold').setTitle('Daily Claim').setDescription(`You claimed **${amount}** coins!`);
      break;

    case 'give':
      const target = options.getUser('target');
      const amt = options.getInteger('amount');
      if ((coins[userId] || 0) < amt)
        return interaction.reply({ content: "Not enough coins!", ephemeral: true });
      coins[userId] -= amt;
      coins[target.id] = (coins[target.id] || 0) + amt;
      embed.setColor('Green').setTitle('Transfer').setDescription(`You gave **${amt}** coins to **${target.username}**.`);
      break;

    case 'warn':
      const warned = options.getUser('target');
      warnings[warned.id] = (warnings[warned.id] || 0) + 1;
      embed.setColor('Red').setTitle('User Warned').setDescription(`${warned.username} warned. Total: **${warnings[warned.id]}**`);
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
      return await Promise.all([msg.react('✅'), msg.react('❌')]);

    case 'kick':
    case 'ban':
      const member = await interaction.guild.members.fetch(options.getUser('target').id);
      if (commandName === 'kick') await member.kick('Kicked by bot');
      else await member.ban({ reason: 'Banned by bot' });
      embed.setColor('Red').setTitle(`User ${commandName === 'kick' ? 'Kicked' : 'Banned'}`).setDescription(`${member.user.username} has been ${commandName}ed.`);
      break;

    case 'level':
      embed.setColor('Purple').setTitle(`${user.username}'s Level`).setDescription(`Level: **${levels[userId] || 0}**`);
      break;

    case 'leaderboard':
      const top = Object.entries(coins).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const lbText = top.map(([id, bal], i) => `${i + 1}. <@${id}> - ${bal} coins`).join('\n');
      embed.setColor('Gold').setTitle('Leaderboard').setDescription(lbText || "No data yet.");
      break;

    case 'math':
      const ans = options.getString('answer');
      if (mathAnswers[interaction.guild.id] === ans) {
        coins[userId] = (coins[userId] || 0) + 100;
        return interaction.reply({ content: "Correct! You earned 100 coins.", ephemeral: true });
      } else {
        return interaction.reply({ content: "Incorrect answer!", ephemeral: true });
      }
  }

  if (embed.data.title) interaction.reply({ embeds: [embed] });
});

// MESSAGE COMMANDS
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content.trim().toLowerCase();
  const userId = msg.author.id;

  // No Prefix: "destroy" command
  if (content === 'destroy') {
    const isAdmin = msg.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = msg.guild.ownerId === msg.author.id;
    if (!isAdmin && !isOwner) return msg.reply({ content: "Admin or owner only!", allowedMentions: { repliedUser: false } });
    try {
      await msg.channel.bulkDelete(10, true);
      const reply = await msg.channel.send({ content: "https://tenor.com/view/jojo-giogio-requiem-jjba-gif-14649703" });
      setTimeout(() => reply.delete().catch(() => {}), 1500);
    } catch (err) {
      const error = await msg.reply({ content: "Failed to delete messages." });
      setTimeout(() => error.delete().catch(() => {}), 3000);
    }
    return;
  }

  // Prefix commands
  if (!msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === 'balance') {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`${msg.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp();
    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'claim') {
    const today = new Date().toDateString();
    if (dailyClaims[userId] === today) return msg.reply("Already claimed today!");
    const amount = Math.floor(Math.random() * 100) + 50;
    coins[userId] = (coins[userId] || 0) + amount;
    dailyClaims[userId] = today;
    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('Daily Claim')
      .setDescription(`You claimed **${amount}** coins!`)
      .setTimestamp();
    return msg.reply({ embeds: [embed] });
  }

  if (cmd === 'give') {
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount) || amount <= 0) return msg.reply("Usage: c!give @user <amount>");
    if ((coins[userId] || 0) < amount) return msg.reply("You don't have enough coins.");
    coins[userId] -= amount;
    coins[target.id] = (coins[target.id] || 0) + amount;
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('Transfer Successful')
      .setDescription(`You gave **${amount}** coins to **${target.username}**.`)
      .setTimestamp();
    return msg.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
