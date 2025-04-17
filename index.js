require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Prefix and other variables
const prefix = 'c!';
let coins = {};
let levels = {};
let relationships = {};
let quotes = [];
let polls = {};
let customEmbeds = {}; // Store custom embed templates per server
let customImages = {}; // Store custom images per server

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
      .setName('profile')
      .setDescription('Show your profile with level and coins'),

    new SlashCommandBuilder()
      .setName('marry')
      .setDescription('Propose to a user')
      .addUserOption(option => option.setName('target').setDescription('User to propose to')),

    new SlashCommandBuilder()
      .setName('poll')
      .setDescription('Create a custom poll')
      .addStringOption(option => option.setName('question').setDescription('Poll question').setRequired(true))
      .addStringOption(option => option.setName('option1').setDescription('First option').setRequired(true))
      .addStringOption(option => option.setName('option2').setDescription('Second option').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setwelcome')
      .setDescription('Set a custom welcome message for new members')
      .addStringOption(option => option.setName('message').setDescription('Welcome message').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setleave')
      .setDescription('Set a custom leave message for users leaving')
      .addStringOption(option => option.setName('message').setDescription('Leave message').setRequired(true)),

    new SlashCommandBuilder()
      .setName('setembed')
      .setDescription('Set custom embed template')
      .addStringOption(option => option.setName('embed_type').setDescription('Embed type (e.g., profile, poll)').setRequired(true))
      .addStringOption(option => option.setName('message').setDescription('Message to set in the embed').setRequired(true)),
    
    new SlashCommandBuilder()
      .setName('setimage')
      .setDescription('Set a custom image for a specific embed')
      .addStringOption(option => option.setName('embed_type').setDescription('Embed type (e.g., profile, poll)').setRequired(true))
      .addStringOption(option => option.setName('image_url').setDescription('Image URL').setRequired(true))
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
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const question = interaction.options.getString('question');
  const option1 = interaction.options.getString('option1');
  const option2 = interaction.options.getString('option2');
  const message = interaction.options.getString('message');
  const embedType = interaction.options.getString('embed_type');
  const imageUrl = interaction.options.getString('image_url');

  // Profile command
  if (interaction.commandName === 'profile') {
    const profileEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Profile`)
      .setDescription(`Level: ${levels[userId] || 1}\nCoins: ${coins[userId] || 0}\nRelationship: ${relationships[userId] || 'Single'}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [profileEmbed] });
  }

  // Marry command
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

  // Poll command
  if (interaction.commandName === 'poll') {
    const pollEmbed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('Poll')
      .setDescription(`**${question}**\n\n1️⃣ ${option1}\n2️⃣ ${option2}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    polls[question] = { options: [option1, option2], votes: [0, 0] };

    await interaction.reply({ embeds: [pollEmbed] });
  }

  // Set custom welcome message
  if (interaction.commandName === 'setwelcome') {
    customEmbeds[interaction.guildId] = customEmbeds[interaction.guildId] || {};
    customEmbeds[interaction.guildId].welcome = message;
    await interaction.reply({ content: `Welcome message has been set!` });
  }

  // Set custom leave message
  if (interaction.commandName === 'setleave') {
    customEmbeds[interaction.guildId] = customEmbeds[interaction.guildId] || {};
    customEmbeds[interaction.guildId].leave = message;
    await interaction.reply({ content: `Leave message has been set!` });
  }

  // Set custom embed template
  if (interaction.commandName === 'setembed') {
    customEmbeds[interaction.guildId] = customEmbeds[interaction.guildId] || {};
    customEmbeds[interaction.guildId][embedType] = message;
    await interaction.reply({ content: `${embedType} embed template has been set!` });
  }

  // Set custom image for an embed
  if (interaction.commandName === 'setimage') {
    customImages[interaction.guildId] = customImages[interaction.guildId] || {};
    customImages[interaction.guildId][embedType] = imageUrl;
    await interaction.reply({ content: `Image for ${embedType} embed has been set!` });
  }
});

// Prefix command handling
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  // Initialize if no data exists for user
  if (!coins[userId]) coins[userId] = 0;
  if (!levels[userId]) levels[userId] = 1;

  if (command === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId]}** coins.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    message.reply({ embeds: [balanceEmbed] });
  }

  // Custom messages on join/leave
  if (message.guild && customEmbeds[message.guild.id]) {
    const welcomeMessage = customEmbeds[message.guild.id].welcome;
    const leaveMessage = customEmbeds[message.guild.id].leave;

    message.guild.members.cache.forEach(member => {
      if (member.user.bot) return;
      member.send(welcomeMessage);
    });

    message.guild.members.cache.forEach(member => {
      if (member.user.bot) return;
      member.send(leaveMessage);
    });
  }
});

// Log the bot in
client.login(process.env.TOKEN);
