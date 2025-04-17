require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionsBitField } = require('discord.js');

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "c!"; // Your command prefix
let coins = {}; // Store users' coins data
let levels = {}; // Store users' XP and level data
let relationships = {}; // Store relationship statuses
let quotes = []; // Store quotes for users to display
let polls = []; // Store polls
let streaks = {}; // Daily streaks for claiming rewards
let stores = {}; // Items purchased by users
let petitions = []; // Petitions created by users

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
      .setName('quote')
      .setDescription('Show a random quote or save your own quote')
      .addStringOption(option => option.setName('quote').setDescription('Quote to add')),

    new SlashCommandBuilder()
      .setName('shoutout')
      .setDescription('Give a shoutout to a user')
      .addUserOption(option => option.setName('target').setDescription('User to shoutout')),

    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Show all available commands'),

    new SlashCommandBuilder()
      .setName('petition')
      .setDescription('Create a petition')
      .addStringOption(option => option.setName('title').setDescription('Petition Title').setRequired(true))
      .addStringOption(option => option.setName('description').setDescription('Petition Description').setRequired(true)),

    new SlashCommandBuilder()
      .setName('weather')
      .setDescription('Get the current weather')
      .addStringOption(option => option.setName('location').setDescription('Location for weather')),

    new SlashCommandBuilder()
      .setName('store')
      .setDescription('View or purchase items from the store')
      .addStringOption(option => option.setName('item').setDescription('Item to buy')),

    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Show the top users by coins or levels')
      .addStringOption(option => option.setName('type').setDescription('Leaderboard type (coins or levels)'))
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
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const question = interaction.options.getString('question');
  const option1 = interaction.options.getString('option1');
  const option2 = interaction.options.getString('option2');
  const quoteText = interaction.options.getString('quote');
  const petitionTitle = interaction.options.getString('title');
  const petitionDescription = interaction.options.getString('description');
  const location = interaction.options.getString('location');
  const item = interaction.options.getString('item');
  const leaderboardType = interaction.options.getString('type');

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

    polls.push({ question, options: [option1, option2], votes: [0, 0] });

    await interaction.reply({ embeds: [pollEmbed] });
  }

  // Quote command
  if (interaction.commandName === 'quote') {
    if (quoteText) {
      quotes.push(quoteText);
      await interaction.reply(`Quote added: "${quoteText}"`);
    } else {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)] || 'No quotes available yet!';
      const quoteEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Random Quote')
        .setDescription(randomQuote)
        .setTimestamp()
        .setFooter({ text: 'Bot Powered by CoolBot' });
      await interaction.reply({ embeds: [quoteEmbed] });
    }
  }

  // Shoutout command
  if (interaction.commandName === 'shoutout') {
    if (!target) return interaction.reply({ content: 'You need to specify a user for a shoutout!' });
    const shoutoutEmbed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('Shoutout!')
      .setDescription(`${target.tag}, you are amazing!`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });
    await interaction.reply({ embeds: [shoutoutEmbed] });
  }

  // Petition command
  if (interaction.commandName === 'petition') {
    petitions.push({ title: petitionTitle, description: petitionDescription, createdBy: interaction.user.tag });
    const petitionEmbed = new EmbedBuilder()
      .setColor('#32CD32')
      .setTitle('New Petition Created')
      .setDescription(`Title: ${petitionTitle}\nDescription: ${petitionDescription}\nCreated by: ${interaction.user.tag}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });
    await interaction.reply({ embeds: [petitionEmbed] });
  }

  // Store command (stub)
  if (interaction.commandName === 'store') {
    const storeEmbed = new EmbedBuilder()
      .setColor('#8A2BE2')
      .setTitle('Store')
      .setDescription(`Items in the store: [Example Item - 100 Coins]`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });
    await interaction.reply({ embeds: [storeEmbed] });
  }

  // Leaderboard command
  if (interaction.commandName === 'leaderboard') {
    const leaderboardEmbed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle(`${leaderboardType ? leaderboardType : 'Leaderboard'}`)
      .setDescription(`Top users by ${leaderboardType || 'coins'}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });
    await interaction.reply({ embeds: [leaderboardEmbed] });
  }
});

// Utility function to save user data to the database (placeholder)
function saveData() {
  // Implement your database save logic here
}

// Log the bot in
client.login(process.env.TOKEN);
