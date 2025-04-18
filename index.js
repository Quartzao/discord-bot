const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  InteractionType, 
  Partials 
} = require('discord.js');
const fs = require('fs');
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

const questions = [
  { q: "What is 12 + 7?", a: "19" },
  { q: "Solve 9 * 3", a: "27" },
  { q: "What is 100 / 4?", a: "25" },
  { q: "15 - 9 equals?", a: "6" }
];

// Random hourly math quiz
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
}, 1000 * 60 * 60); // 1 hour
// Slash Commands
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
  new SlashCommandBuilder().setName('poll').setDescription('Create a quick yes/no poll.')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user.')
    .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('level').setDescription('Check your level and XP.'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Check the top coin holders in the server.'),
  new SlashCommandBuilder().setName('math').setDescription('Answer a math question to win coins.')
    .addStringOption(opt => opt.setName('answer').setDescription('Your answer to the math question').setRequired(true)),
  new SlashCommandBuilder().setName('setwelcome').setDescription('Set a custom welcome message.')
    .addStringOption(opt => opt.setName('message').setDescription('Welcome message').setRequired(true)),
  new SlashCommandBuilder().setName('setleave').setDescription('Set a custom leave message.')
    .addStringOption(opt => opt.setName('message').setDescription('Leave message').setRequired(true)),
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

// Command Handling
client.on('interactionCreate', async (interaction) => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  const { commandName, user, options } = interaction;
  const userId = user.id;

  if (commandName === 'balance') {
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`${user.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'claim') {
    const today = new Date().toDateString();
    if (dailyClaims[userId] === today) {
      return interaction.reply({ content: "You've already claimed today!", ephemeral: true });
    }

    const amount = Math.floor(Math.random() * 100) + 50;
    coins[userId] = (coins[userId] || 0) + amount;
    dailyClaims[userId] = today;

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('Daily Claim')
      .setDescription(`You claimed **${amount}** coins!`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'give') {
    const target = options.getUser('target');
    const amount = options.getInteger('amount');
    if ((coins[userId] || 0) < amount) {
      return interaction.reply({ content: "You don't have enough coins!", ephemeral: true });
    }

    coins[userId] -= amount;
    coins[target.id] = (coins[target.id] || 0) + amount;

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('Transfer Successful')
      .setDescription(`You gave **${amount}** coins to **${target.username}**.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'warn') {
    const target = options.getUser('target');
    warnings[target.id] = (warnings[target.id] || 0) + 1;

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('User Warned')
      .setDescription(`${target.username} has been warned. Total: **${warnings[target.id]}**`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'marry') {
    const target = options.getUser('target');
    if (marriages[userId] || marriages[target.id]) {
      return interaction.reply({ content: "One of you is already married!", ephemeral: true });
    }

    marriages[userId] = target.id;
    marriages[target.id] = userId;

    const embed = new EmbedBuilder()
      .setColor('Pink')
      .setTitle('Marriage Proposal Accepted!')
      .setDescription(`${user.username} and ${target.username} are now married!`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'poll') {
    const question = options.getString('question');
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('Poll')
      .setDescription(question)
      .setFooter({ text: `Poll by ${user.username}` })
      .setTimestamp();

    const pollMsg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await pollMsg.react('✅');
    await pollMsg.react('❌');
  }

  if (commandName === 'kick') {
    const target = options.getUser('target');
    const member = await interaction.guild.members.fetch(target.id);
    await member.kick('Kicked by bot command');

    const embed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('User Kicked')
      .setDescription(`${target.username} has been kicked.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ban') {
    const target = options.getUser('target');
    const member = await interaction.guild.members.fetch(target.id);
    await member.ban({ reason: 'Banned by bot command' });

    const embed = new EmbedBuilder()
      .setColor('DarkRed')
      .setTitle('User Banned')
      .setDescription(`${target.username} has been banned.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'level') {
    const level = levels[userId] || 0;
    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`${user.username}'s Level`)
      .setDescription(`You are currently at level **${level}**.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'leaderboard') {
    const leaderboard = Object.entries(coins).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const leaderboardText = leaderboard.map(([userId, balance], index) => `${index + 1}. <@${userId}> - ${balance} coins`).join('\n');

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('Coin Leaderboard')
      .setDescription(leaderboardText)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'math') {
    const answer = options.getString('answer');
    if (mathAnswers[interaction.guild.id] === answer) {
      coins[userId] = (coins[userId] || 0) + 100;
      return interaction.reply({ content: "Correct! You've earned 100 coins.", ephemeral: true });
    } else {
      return interaction.reply({ content: "Incorrect answer! Try again next time.", ephemeral: true });
    }
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();
  const userId = msg.author.id;

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
    if (dailyClaims[userId] === today) {
      return msg.reply("You've already claimed your daily coins!");
    }

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
    if (!target || isNaN(amount) || amount <= 0) {
      return msg.reply("Usage: c!give @user <amount>");
    }

    if ((coins[userId] || 0) < amount) {
      return msg.reply("You don't have enough coins.");
    }

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
