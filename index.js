require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField, EmbedBuilder } = require('discord.js');

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const prefix = 'c!'; // Your command prefix
let coins = {}; // Store users' coins data
let levels = {}; // Store users' XP and level data
let relationships = {}; // Store relationship statuses
let quotes = []; // Store quotes for users to display
let polls = []; // Store polls
let customImages = {}; // Store custom images for embeds per server
let customEmbeds = {}; // Store custom embed templates per server

// Register commands when the bot is ready
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Slash command registration
  const commands = [
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption((option) => option.setName('target').setDescription('User to kick')),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption((option) => option.setName('target').setDescription('User to ban')),

    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Show your profile with level and coins'),

    new SlashCommandBuilder()
      .setName('marry')
      .setDescription('Propose to a user')
      .addUserOption((option) => option.setName('target').setDescription('User to propose to')),

    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a custom poll')
      .addStringOption((option) => option.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption((option) => option.setName('option1').setDescription('First option').setRequired(true))
      .addStringOption((option) => option.setName('option2').setDescription('Second option').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setwelcome')
      .setDescription('Set a custom welcome message for the server')
      .addStringOption((option) => option.setName('message').setDescription('Welcome message').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setleave')
      .setDescription('Set a custom leave message for the server')
      .addStringOption((option) => option.setName('message').setDescription('Leave message').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setembed')
      .setDescription('Set a custom embed template for your server')
      .addStringOption((option) => option.setName('embedtype').setDescription('Embed type to set').setRequired(true))
      .addStringOption((option) => option.setName('embedmessage').setDescription('Embed message').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setimage')
      .setDescription('Set a custom image for the server')
      .addStringOption((option) => option.setName('imageurl').setDescription('URL of the image').setRequired(true)),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// Slash command handling
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const question = interaction.options.getString('question');
  const option1 = interaction.options.getString('option1');
  const option2 = interaction.options.getString('option2');
  const embedType = interaction.options.getString('embedtype');
  const embedMessage = interaction.options.getString('embedmessage');
  const imageUrl = interaction.options.getString('imageurl');

  if (interaction.commandName === 'profile') {
    const profileEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Profile`)
      .setDescription(`Level: ${levels[userId] || 1}\nCoins: ${coins[userId] || 0}\nRelationship: ${relationships[userId] || 'Single'}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [profileEmbed] });
  }

  if (interaction.commandName === 'marry') {
    if (relationships[userId]) return interaction.reply({ content: 'You are already in a relationship!' });

    if (!target) return interaction.reply({ content: 'You need to specify a user to propose to!' });

    relationships[userId] = `Married to ${target.tag}`;
    relationships[target.id] = `Married to ${interaction.user.tag}`;

    const marriageEmbed = new EmbedBuilder()
      .setColor('#FF00FF')
      .setTitle('Marriage Proposal')
      .setDescription(`Congratulations! ${interaction.user.tag} and ${target.tag} are now married.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [marriageEmbed] });
  }

  if (interaction.commandName === 'poll') {
    const pollEmbed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('Poll')
      .setDescription(`**${question}**\n\n1️⃣ ${option1}\n2️⃣ ${option2}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    polls.push({ question, options: [option1, option2], votes: [0, 0] });

    await interaction.reply({ embeds: [pollEmbed] });
  }

  if (interaction.commandName === 'setwelcome') {
    customEmbeds[interaction.guild.id] = { welcomeMessage: embedMessage };
    await interaction.reply({ content: `Welcome message set!` });
  }

  if (interaction.commandName === 'setleave') {
    customEmbeds[interaction.guild.id] = { leaveMessage: embedMessage };
    await interaction.reply({ content: `Leave message set!` });
  }

  if (interaction.commandName === 'setembed') {
    customEmbeds[interaction.guild.id] = { [embedType]: embedMessage };
    await interaction.reply({ content: `${embedType} embed set!` });
  }

  if (interaction.commandName === 'setimage') {
    customImages[interaction.guild.id] = imageUrl;
    await interaction.reply({ content: `Custom image set!` });
  }
});

// Prefix command handling
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  // Simulate typing before replying
  message.channel.sendTyping(); // Makes the bot appear as if it's typing

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  // Initialize if no data exists for user
  if (!coins[userId]) coins[userId] = 0;
  if (!levels[userId]) levels[userId] = 1;

  // Increment XP for leveling
  levels[userId] += 1; // Increment by 1 for each message
  if (levels[userId] % 10 === 0) {
    // Every 10 levels, send a special message
    message.reply(`🎉 Congratulations ${message.author.username}! You've reached level ${levels[userId]}! 🎉`);
  }

  if (command === 'balance') {
    setTimeout(() => {
      const balanceEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`${message.author.username}'s Balance`)
        .setDescription(`You have **${coins[userId]}** coins.`)
        .setTimestamp()
        .setFooter({ text: 'Bot Powered by CoolBot' });

      message.reply({ embeds: [balanceEmbed] });
    }, 2000);
  }

  if (command === 'claim') {
    setTimeout(() => {
      coins[userId] += 100;
      saveCoins();

      const claimEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Coin Claim')
        .setDescription(`You claimed 100 coins! You now have **${coins[userId]}**.`)
        .setTimestamp()
        .setFooter({ text: 'Bot Powered by CoolBot' });

      message.reply({ embeds: [claimEmbed] });
    }, 2000);
  }

  if (command === 'give') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply('Usage: `cgive @user 100`');
    }

    if (!coins[target.id]) coins[target.id] = 0;
    if (coins[userId] < amount) return message.reply("You don't have enough coins!");

    setTimeout(() => {
      coins[userId] -= amount;
      coins[target.id] += amount;
      saveCoins();

      const giveEmbed = new EmbedBuilder()
        .setColor('#1E90FF')
        .setTitle('Coin Transfer')
        .setDescription(`You gave **${amount}** coins to ${target.tag}.`)
        .setTimestamp()
        .setFooter({ text: 'Bot Powered by CoolBot' });

      message.reply({ embeds: [giveEmbed] });
    }, 2000);
  }
});

// Utility function to save user data to the database (placeholder)
function saveCoins() {
  // Implement your database save logic here
}

// Log the bot in
client.login(process.env.TOKEN);
