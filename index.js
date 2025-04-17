require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const { Low, JSONFile } = require('lowdb');
const path = require('path');

// Create the database
const db = new Low(new JSONFile(path.join(__dirname, 'db.json')));
db.data ||= { users: {}, polls: {} }; // Default structure

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
      .addStringOption(option => option.setName('option2').setDescription('Second option').setRequired(true))
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

  if (interaction.commandName === 'profile') {
    // Ensure user data exists
    if (!db.data.users[userId]) {
      db.data.users[userId] = { coins: 0, level: 1, xp: 0, relationship: 'Single' };
    }

    const profileEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${interaction.user.username}'s Profile`)
      .setDescription(`Level: ${db.data.users[userId].level}\nCoins: ${db.data.users[userId].coins}\nRelationship: ${db.data.users[userId].relationship}`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [profileEmbed] });
  }

  if (interaction.commandName === 'marry') {
    if (db.data.users[userId].relationship !== 'Single') {
      return interaction.reply({ content: 'You are already in a relationship!' });
    }

    if (!target) return interaction.reply({ content: 'You need to specify a user to propose to!' });

    db.data.users[userId].relationship = `Married to ${target.tag}`;
    db.data.users[target.id] = { ...db.data.users[target.id], relationship: `Married to ${interaction.user.tag}` };

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

    db.data.polls.push({ question, options: [option1, option2], votes: [0, 0] });

    await interaction.reply({ embeds: [pollEmbed] });
  }

  // Moderation commands
  if (interaction.commandName === 'kick') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You don\'t have permission to kick members.', ephemeral: true });
    }

    if (!target) return interaction.reply({ content: 'You need to specify a user to kick.' });

    const member = await interaction.guild.members.fetch(target.id);
    await member.kick();

    const kickEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Kick')
      .setDescription(`Successfully kicked **${target.tag}**.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [kickEmbed] });
  }

  if (interaction.commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You don\'t have permission to ban members.', ephemeral: true });
    }

    if (!target) return interaction.reply({ content: 'You need to specify a user to ban.' });

    const member = await interaction.guild.members.fetch(target.id);
    await member.ban();

    const banEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Ban')
      .setDescription(`Successfully banned **${target.tag}**.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    await interaction.reply({ embeds: [banEmbed] });
  }
});

// Prefix command handling (Economy and Leveling)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  // Simulate typing before replying
  message.channel.sendTyping(); // Makes the bot appear as if it's typing
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  // Ensure user data exists
  if (!db.data.users[userId]) {
    db.data.users[userId] = { coins: 0, level: 1, xp: 0, relationship: 'Single' };
  }

  const user = db.data.users[userId];

  // Add XP for leveling
  user.xp += 10; // Add 10 XP for each message
  if (user.xp >= user.level * 100) { // Level-up condition
    user.xp = 0; // Reset XP
    user.level += 1; // Level up
    user.coins += 100; // Reward coins on level up
    message.reply(`🎉 Congratulations ${message.author.username}! You've reached level ${user.level}! You earned 100 coins! 🎉`);
  }

  if (command === 'balance') {
    const balanceEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${user.coins}** coins.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    message.reply({ embeds: [balanceEmbed] });
  }

  if (command === 'claim') {
    user.coins += 100;
    const claimEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('Coin Claim')
      .setDescription(`You claimed 100 coins! You now have **${user.coins}**.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    message.reply({ embeds: [claimEmbed] });
  }

  if (command === 'give') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply("Usage: `cgive @user 100`");
    }

    const targetUser = db.data.users[target.id];
    if (!targetUser) {
      db.data.users[target.id] = { coins: 0, level: 1, xp: 0, relationship: 'Single' };
    }

    if (user.coins < amount) return message.reply("You don't have enough coins!");

    user.coins -= amount;
    targetUser.coins += amount;

    const giveEmbed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle('Coin Transfer')
      .setDescription(`You gave **${amount}** coins to ${target.tag}.`)
      .setTimestamp()
      .setFooter({ text: 'Bot Powered by CoolBot' });

    message.reply({ embeds: [giveEmbed] });
  }

  await db.write(); // Save data to database
});

// Log the bot in
client.login(process.env.TOKEN);
