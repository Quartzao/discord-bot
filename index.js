require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField, EmbedBuilder } = require('discord.js');

const COINS_FILE = './coins.json';
let coins = fs.existsSync(COINS_FILE) ? JSON.parse(fs.readFileSync(COINS_FILE)) : {};
function saveCoins() {
  fs.writeFileSync(COINS_FILE, JSON.stringify(coins, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = 'c';
let currentAnswer = null;
const mathChannelId = '1359467591642648742';

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option => option.setName('target').setDescription('User to kick')),
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option => option.setName('target').setDescription('User to ban'))
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error(err);
  }

  // Start math problem interval
  sendMathProblem();
  setInterval(sendMathProblem, 60 * 60 * 1000); // every hour
});

// === Slash commands ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = interaction.options.getUser('target');
  const member = interaction.guild.members.cache.get(interaction.user.id);

  if (interaction.commandName === 'kick') {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ embeds: [errorEmbed("You can’t kick members.")], ephemeral: true });
    }
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.kick();
    interaction.reply({ embeds: [successEmbed(`${target.tag} was kicked.`)] });
  }

  if (interaction.commandName === 'ban') {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ embeds: [errorEmbed("You can’t ban members.")], ephemeral: true });
    }
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.ban();
    interaction.reply({ embeds: [successEmbed(`${target.tag} was banned.`)] });
  }
});

// === Prefix commands ===
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;
  const target = message.mentions.users.first();
  const member = message.guild.members.cache.get(message.author.id);
  const victim = target ? message.guild.members.cache.get(target.id) : null;

  if (!coins[userId]) coins[userId] = 0;

  // Moderation
  if (command === 'kick') {
    if (!target) return message.reply({ embeds: [errorEmbed("You must mention a user.")] });
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply({ embeds: [errorEmbed("You can’t kick members.")] });
    }
    if (victim) await victim.kick();
    return message.reply({ embeds: [successEmbed(`${target.tag} was kicked.`)] });
  }

  if (command === 'ban') {
    if (!target) return message.reply({ embeds: [errorEmbed("You must mention a user.")] });
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({ embeds: [errorEmbed("You can’t ban members.")] });
    }
    if (victim) await victim.ban();
    return message.reply({ embeds: [successEmbed(`${target.tag} was banned.`)] });
  }

  // Economy
  if (command === 'balance') {
    return message.reply({ embeds: [infoEmbed(`You have **${coins[userId]}** coins.`)] });
  }

  if (command === 'claim') {
    coins[userId] += 100;
    saveCoins();
    return message.reply({ embeds: [successEmbed(`You claimed 100 coins! New balance: **${coins[userId]}**.`)] });
  }

  if (command === 'give') {
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [errorEmbed("Usage: `cgive @user 100`")] });
    }

    if (!coins[target.id]) coins[target.id] = 0;
    if (coins[userId] < amount) {
      return message.reply({ embeds: [errorEmbed("You don't have enough coins!")] });
    }

    coins[userId] -= amount;
    coins[target.id] += amount;
    saveCoins();
    return message.reply({ embeds: [successEmbed(`You gave **${amount}** coins to ${target.tag}.`)] });
  }
});

// === Math problem ===
function sendMathProblem() {
  const num1 = Math.floor(Math.random() * 50 + 1);
  const num2 = Math.floor(Math.random() * 50 + 1);
  const operator = ['+', '-', '*'][Math.floor(Math.random() * 3)];
  currentAnswer = eval(`${num1} ${operator} ${num2}`);

  const embed = new EmbedBuilder()
    .setTitle('Hourly Math Challenge!')
    .setDescription(`Solve this: **${num1} ${operator} ${num2}**\nFirst correct answer wins **100 coins**!`)
    .setColor('Yellow');

  const channel = client.channels.cache.get(mathChannelId);
  if (channel) channel.send({ embeds: [embed] });
}

client.on('messageCreate', async message => {
  if (message.channel.id !== mathChannelId || message.author.bot || currentAnswer === null) return;

  if (parseInt(message.content) === currentAnswer) {
    const userId = message.author.id;
    if (!coins[userId]) coins[userId] = 0;
    coins[userId] += 100;
    saveCoins();

    const embed = new EmbedBuilder()
      .setTitle('Correct!')
      .setDescription(`${message.author} got it right and earned **100 coins**!`)
      .setColor('Green');

    message.channel.send({ embeds: [embed] });
    currentAnswer = null;
  }
});

// === Embed helper functions ===
function successEmbed(text) {
  return new EmbedBuilder().setDescription(text).setColor('Green');
}

function errorEmbed(text) {
  return new EmbedBuilder().setDescription(text).setColor('Red');
}

function infoEmbed(text) {
  return new EmbedBuilder().setDescription(text).setColor('Blue');
}

client.login(process.env.TOKEN);
