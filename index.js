const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "c!";

// In-memory data for coins, levels, warnings, and custom messages.
let coins = {};
let levels = {};
let warnings = {};
let customMessages = {};

// Command definitions using SlashCommandBuilder
const commands = [
  new SlashCommandBuilder().setName('balance').setDescription('Shows your current coin balance.'),
  new SlashCommandBuilder().setName('claim').setDescription('Claim coins!'),
  new SlashCommandBuilder().setName('give').setDescription('Give coins to another user.')
    .addUserOption(option => option.setName('target').setDescription('User to give coins to').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Amount of coins to give').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user.')
    .addUserOption(option => option.setName('target').setDescription('User to warn').setRequired(true)),
  // Add other commands here...
];

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  console.log('Received command:', interaction.commandName); // Log received command

  if (interaction.commandName === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Balance`)
      .setDescription(`You have **${coins[interaction.user.id] || 0}** coins.`)
      .setTimestamp();
    await interaction.reply({ embeds: [balanceEmbed] });
  }

  if (interaction.commandName === 'claim') {
    const amount = Math.floor(Math.random() * 100) + 1; // Random coin amount between 1 and 100
    coins[interaction.user.id] = (coins[interaction.user.id] || 0) + amount;

    const claimEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Coins Claimed!')
      .setDescription(`You have successfully claimed **${amount}** coins.`)
      .setTimestamp();
    await interaction.reply({ embeds: [claimEmbed] });
  }

  if (interaction.commandName === 'give') {
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if (coins[interaction.user.id] < amount) {
      return interaction.reply({
        content: "You don't have enough coins to give!",
        ephemeral: true,
      });
    }

    coins[interaction.user.id] -= amount;
    coins[target.id] = (coins[target.id] || 0) + amount;

    const giveEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Coins Given!')
      .setDescription(`You gave **${amount}** coins to **${target.username}**.`)
      .setTimestamp();
    await interaction.reply({ embeds: [giveEmbed] });
  }

  if (interaction.commandName === 'warn') {
    const target = interaction.options.getUser('target');

    warnings[target.id] = (warnings[target.id] || 0) + 1;

    const warnEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('User Warned!')
      .setDescription(`${target.username} has been warned. Total warnings: ${warnings[target.id]}`)
      .setTimestamp();
    await interaction.reply({ embeds: [warnEmbed] });
  }

  // Handle other commands here...
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command handlers for prefix commands
    if (command === 'balance') {
      const balanceEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${message.author.username}'s Balance`)
        .setDescription(`You have **${coins[message.author.id] || 0}** coins.`)
        .setTimestamp();
      await message.reply({ embeds: [balanceEmbed] });
    }

    if (command === 'claim') {
      const amount = Math.floor(Math.random() * 100) + 1;
      coins[message.author.id] = (coins[message.author.id] || 0) + amount;

      const claimEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Coins Claimed!')
        .setDescription(`You have successfully claimed **${amount}** coins.`)
        .setTimestamp();
      await message.reply({ embeds: [claimEmbed] });
    }

    if (command === 'give') {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1]);

      if (!target) {
        return message.reply("You need to mention a user to give coins to.");
      }

      if (isNaN(amount) || amount <= 0) {
        return message.reply("You need to specify a valid amount of coins.");
      }

      if (coins[message.author.id] < amount) {
        return message.reply("You don't have enough coins to give!");
      }

      coins[message.author.id] -= amount;
      coins[target.id] = (coins[target.id] || 0) + amount;

      const giveEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Coins Given!')
        .setDescription(`You gave **${amount}** coins to **${target.username}**.`)
        .setTimestamp();
      await message.reply({ embeds: [giveEmbed] });
    }

    // Handle other commands here...
  }
});

// Log in to Discord with the app's token
client.login(process.env.TOKEN);
