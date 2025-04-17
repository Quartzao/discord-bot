require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { Low, JSONFile } = require('lowdb');

// Initialize Lowdb for storing user data
const db = new Low(new JSONFile('db.json'));
db.data = db.data || { coins: {}, levels: {}, relationships: {}, quotes: [], polls: [] };

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "c"; // Your command prefix
let coins = db.data.coins; // Store users' coins data
let levels = db.data.levels; // Store users' XP and level data
let relationships = db.data.relationships; // Store relationship statuses
let polls = db.data.polls; // Store polls

// Register slash commands when the bot is ready
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Slash command registration
  const commands = [
    // Moderation
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(option => option.setName('target').setDescription('User to kick')),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(option => option.setName('target').setDescription('User to ban')),

    // Economy
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

    // Fun commands
    new SlashCommandBuilder()
      .setName('8ball')
      .setDescription('Ask the magic 8-ball a question')
      .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),

    new SlashCommandBuilder()
      .setName('roast')
      .setDescription('Roast a user')
      .addUserOption(option => option.setName('target').setDescription('User to roast')),

    new SlashCommandBuilder()
      .setName('compliment')
      .setDescription('Give a compliment to a user')
      .addUserOption(option => option.setName('target').setDescription('User to compliment')),

    // Economy commands
    new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your coin balance'),

    new SlashCommandBuilder()
      .setName('claim')
      .setDescription('Claim your daily coins'),

    new SlashCommandBuilder()
      .setName('give')
      .setDescription('Give coins to another user')
      .addUserOption(option => option.setName('target').setDescription('User to give coins to').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('Amount of coins to give').setRequired(true)),

    new SlashCommandBuilder()
      .setName('work')
      .setDescription('Work for some coins'),

    new SlashCommandBuilder()
      .setName('gamble')
      .setDescription('Gamble coins')
      .addIntegerOption(option => option.setName('amount').setDescription('Amount to gamble').setRequired(true)),
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
  if (!interaction.isCommand()) return;

  const userId = interaction.user.id;
  const target = interaction.options.getUser('target');
  const question = interaction.options.getString('question');
  const option1 = interaction.options.getString('option1');
  const option2 = interaction.options.getString('option2');
  const amount = interaction.options.getInteger('amount');

  // Moderation commands
  if (interaction.commandName === 'kick' || interaction.commandName === 'ban') {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You don’t have permission to kick members!', ephemeral: true });
    }

    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) {
      if (interaction.commandName === 'kick') {
        await victim.kick();
        await interaction.reply(`${target.tag} was kicked.`);
      } else if (interaction.commandName === 'ban') {
        await victim.ban();
        await interaction.reply(`${target.tag} was banned.`);
      }
    }
  }

  // Economy commands
  if (interaction.commandName === 'profile') {
    const profileEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Profile`)
      .setDescription(`Level: ${levels[userId] || 1}\nCoins: ${coins[userId] || 0}\nRelationship: ${relationships[userId] || 'Single'}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [profileEmbed] });
  }

  if (interaction.commandName === 'claim') {
    coins[userId] += 100;
    await db.write();

    const claimEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Coin Claim')
      .setDescription(`You claimed 100 coins! You now have **${coins[userId]}**.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [claimEmbed] });
  }

  if (interaction.commandName === 'give') {
    if (!coins[target.id]) coins[target.id] = 0;
    if (coins[userId] < amount) return interaction.reply("You don't have enough coins!");

    coins[userId] -= amount;
    coins[target.id] += amount;
    await db.write();

    const giveEmbed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle('Coin Transfer')
      .setDescription(`You gave **${amount}** coins to ${target.tag}.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [giveEmbed] });
  }

  // Fun commands
  if (interaction.commandName === '8ball') {
    const responses = ["Yes", "No", "Maybe", "Ask again later", "Definitely", "Not sure"];
    const answer = responses[Math.floor(Math.random() * responses.length)];

    const ballEmbed = new EmbedBuilder()
      .setColor('#800080')
      .setTitle('Magic 8-Ball')
      .setDescription(`Question: ${question}\nAnswer: ${answer}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [ballEmbed] });
  }

  if (interaction.commandName === 'roast') {
    const roasts = ["You're like a cloud. When you disappear, it's a beautiful day.", "You're proof that even a broken clock is right twice a day."];
    const roast = roasts[Math.floor(Math.random() * roasts.length)];

    const roastEmbed = new EmbedBuilder()
      .setColor('#FF6347')
      .setTitle('Roast')
      .setDescription(`${interaction.user.username} roasted ${target.username}:\n"${roast}"`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [roastEmbed] });
  }

  if (interaction.commandName === 'compliment') {
    const compliments = ["You're awesome!", "You light up the room!", "You're amazing!", "Keep being awesome!"];
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];

    const complimentEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Compliment')
      .setDescription(`${interaction.user.username} compliments ${target.username}:\n"${compliment}"`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [complimentEmbed] });
  }

  // Poll command
  if (interaction.commandName === 'poll') {
    polls.push({ question, options: [option1, option2], votes: [0, 0] });

    const pollEmbed = new EmbedBuilder()
      .setColor('#0000FF')
      .setTitle('Poll')
      .setDescription(`**${question}**\n\n1️⃣ ${option1}\n2️⃣ ${option2}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [pollEmbed] });
  }
});

// Leveling system
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  // Initialize user data if it doesn't exist
  if (!coins[userId]) coins[userId] = 0;
  if (!levels[userId]) levels[userId] = 1;

  // Increment XP for leveling
  levels[userId] += 1;
  if (levels[userId] % 10 === 0) {
    message.reply(`🎉 Congratulations ${message.author.username}! You've reached level ${levels[userId]}! 🎉`);
  }

  if (command === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId]}** coins
