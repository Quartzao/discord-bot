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

  if (interaction.commandName === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp();

    await interaction.reply({ embeds: [balanceEmbed] });
  }

  if (interaction.commandName === 'claim') {
    coins[userId] += 100;
    const claimEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Coin Claim')
      .setDescription(`You claimed 100 coins! You now have **${coins[userId]}**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [claimEmbed] });
  }

  if (interaction.commandName === 'give') {
    if (!target || !amount || isNaN(amount)) {
      return interaction.reply("Usage: `/give @user amount`");
    }

    coins[userId] -= amount;
    if (!coins[target.id]) coins[target.id] = 0;
    coins[target.id] += amount;

    const giveEmbed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle('Coin Transfer')
      .setDescription(`You gave **${amount}** coins to ${target.tag}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [giveEmbed] });
  }

  if (interaction.commandName === 'warn') {
    if (!warnings[target.id]) warnings[target.id] = [];
    warnings[target.id].push(reason);

    const warnEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('User Warned')
      .setDescription(`${target.tag} has been warned for: ${reason}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [warnEmbed] });
  }

  if (interaction.commandName === 'kick') {
    if (!target) return interaction.reply('Please specify a user to kick.');

    await target.kick('Kicked by bot');
    const kickEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('User Kicked')
      .setDescription(`${target.tag} has been kicked from the server.`)
      .setTimestamp();

    await interaction.reply({ embeds: [kickEmbed] });
  }

  if (interaction.commandName === 'ban') {
    if (!target) return interaction.reply('Please specify a user to ban.');

    await target.ban({ reason: 'Banned by bot' });
    const banEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('User Banned')
      .setDescription(`${target.tag} has been banned from the server.`)
      .setTimestamp();

    await interaction.reply({ embeds: [banEmbed] });
  }

  if (interaction.commandName === 'profile') {
    const profileEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Profile`)
      .setDescription(`Level: ${levels[userId] || 1}\nCoins: ${coins[userId] || 0}\nRelationship: ${relationships[userId] || 'Single'}`)
      .setTimestamp();

    await interaction.reply({ embeds: [profileEmbed] });
  }

  if (interaction.commandName === 'marry') {
    if (relationships[userId]) return interaction.reply('You are already in a relationship!');
    if (!target) return interaction.reply('You need to specify a user to propose to!');

    relationships[userId] = `Married to ${target.tag}`;
    relationships[target.id] = `Married to ${interaction.user.tag}`;

    const marriageEmbed = new EmbedBuilder()
      .setColor('#FF00FF')
      .setTitle('Marriage Proposal')
      .setDescription(`Congratulations! ${interaction.user.tag} and ${target.tag} are now married.`)
      .setTimestamp();

    await interaction.reply({ embeds: [marriageEmbed] });
  }

  if (interaction.commandName === 'setwelcome') {
    if (!interaction.memberPermissions.has('ADMINISTRATOR')) return interaction.reply('You do not have permission to use this command.');
    customMessages.welcome = message;
    await interaction.reply('Custom welcome message set.');
  }

  if (interaction.commandName === 'setleave') {
    if (!interaction.memberPermissions.has('ADMINISTRATOR')) return interaction.reply('You do not have permission to use this command.');
    customMessages.leave = message;
    await interaction.reply('Custom leave message set.');
  }

  if (interaction.commandName === 'setembed') {
    if (!interaction.memberPermissions.has('ADMINISTRATOR')) return interaction.reply('You do not have permission to use this command.');
    if (!type || !message) return interaction.reply('You need to specify a type and a message.');
    customMessages[type] = message;
    await interaction.reply(`Custom embed for ${type} set.`);
  }

  if (interaction.commandName === 'coinflip') {
    const result = Math.random() > 0.5 ? 'Heads' : 'Tails';
    await interaction.reply(`The coin flip result is: ${result}`);
  }

  if (interaction.commandName === 'dice') {
    const roll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply(`You rolled a ${roll}`);
  }

  if (interaction.commandName === 'quote') {
    if (quote) {
      quotes.push(quote);
      await interaction.reply('Quote added.');
    } else {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      await interaction.reply(`Here's a random quote: "${randomQuote}"`);
    }
  }

  if (interaction.commandName === 'randomfact') {
    const facts = [
      "Honey never spoils.",
      "Bananas are berries, but strawberries aren't.",
      "Octopuses have three hearts.",
    ];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    await interaction.reply(`Did you know? ${randomFact}`);
  }

  if (interaction.commandName === 'joke') {
    const jokes = [
      "Why don't skeletons fight each other? They don't have the guts!",
      "Why don't eggs tell jokes? They might crack up.",
    ];
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    await interaction.reply(randomJoke);
  }
});

client.login(process.env.TOKEN);
