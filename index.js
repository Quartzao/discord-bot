require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

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
let customMessages = {}; // Store custom messages for welcome, leave, etc.
let warnings = {}; // Store warnings for users

// Register commands when the bot is ready
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Slash command registration
  const commands = [
    // Economy Commands
    new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Shows your current coin balance.'),
    new SlashCommandBuilder()
      .setName('claim')
      .setDescription('Claim coins!'),
    new SlashCommandBuilder()
      .setName('give')
      .setDescription('Give coins to another user.')
      .addUserOption(option => option.setName('target').setDescription('User to give coins to').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('Amount of coins to give').setRequired(true)),
    
    // Profile Commands
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Shows your profile with level and coins'),
    new SlashCommandBuilder()
      .setName('marry')
      .setDescription('Propose to a user.')
      .addUserOption(option => option.setName('target').setDescription('User to propose to').setRequired(true)),

    // Moderation Commands
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user.')
      .addUserOption(option => option.setName('target').setDescription('User to kick').setRequired(true)),
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user.')
      .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true)),
    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a user.')
      .addUserOption(option => option.setName('target').setDescription('User to warn').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true)),
    
    // Fun and Utility Commands
    new SlashCommandBuilder()
      .setName('coinflip')
      .setDescription('Flip a coin and get heads or tails'),
    new SlashCommandBuilder()
      .setName('dice')
      .setDescription('Roll a dice'),
    new SlashCommandBuilder()
      .setName('quote')
      .setDescription('Add or show a random quote.')
      .addStringOption(option => option.setName('quote').setDescription('Quote to add')),
    new SlashCommandBuilder()
      .setName('randomfact')
      .setDescription('Get a random fun fact'),
    new SlashCommandBuilder()
      .setName('joke')
      .setDescription('Get a random joke'),

    // Custom Messages and Embed Management
    new SlashCommandBuilder()
      .setName('setwelcome')
      .setDescription('Set a custom welcome message (Admin Only)')
      .addStringOption(option => option.setName('message').setDescription('The welcome message').setRequired(true)),
    new SlashCommandBuilder()
      .setName('setleave')
      .setDescription('Set a custom leave message (Admin Only)')
      .addStringOption(option => option.setName('message').setDescription('The leave message').setRequired(true)),
    new SlashCommandBuilder()
      .setName('setembed')
      .setDescription('Set custom embeds for bot messages (Admin Only)')
      .addStringOption(option => option.setName('type').setDescription('Type of embed (e.g., levelup, transfer)').setRequired(true))
      .addStringOption(option => option.setName('message').setDescription('Custom embed message').setRequired(true)),

    // Miscellaneous
    new SlashCommandBuilder()
      .setName('invite')
      .setDescription('Get an invite link for the bot'),
    new SlashCommandBuilder()
      .setName('support')
      .setDescription('Get the bot support link or documentation'),
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

// Prefix-based message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Only handle messages that start with the prefix
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Handle prefix-based commands
  if (command === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[message.author.id] || 0}** coins.`)
      .setTimestamp();

    await message.reply({ embeds: [balanceEmbed] });
  }

  if (command === 'claim') {
    coins[message.author.id] = (coins[message.author.id] || 0) + 100;
    const claimEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Coin Claim')
      .setDescription(`You claimed 100 coins! You now have **${coins[message.author.id]}**.`)
      .setTimestamp();

    await message.reply({ embeds: [claimEmbed] });
  }

  // Add other prefix commands here similarly
});

// Slash command handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const amount = interaction.options.getInteger('amount');
  const quote = interaction.options.getString('quote');
  const reason = interaction.options.getString('reason');
  const type = interaction.options.getString('type');
  const message = interaction.options.getString('message');
  const question = interaction.options.getString('question');
  const option1 = interaction.options.getString('option1');
  const option2 = interaction.options.getString('option2');

  // Slash command handling (already in your script, unchanged)
  // Handle commands like 'balance', 'claim', 'give', etc. as you have in your existing code.
});

client.login(process.env.TOKEN);
