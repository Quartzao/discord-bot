require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "c"; // Your command prefix

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
      .addUserOption(option => option.setName('target').setDescription('User to ban'))
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

  const target = interaction.options.getUser('target');
  const member = interaction.guild.members.cache.get(interaction.user.id);

  if (interaction.commandName === 'kick') {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'You can’t kick.', ephemeral: true });
    }
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.kick();
    await interaction.reply(`${target.tag} was kicked.`);
  }

  if (interaction.commandName === 'ban') {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'You can’t ban.', ephemeral: true });
    }
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.ban();
    await interaction.reply(`${target.tag} was banned.`);
  }
});

// Prefix command handling
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const target = message.mentions.users.first();

  if (!target) return message.reply('You need to mention a user.');

  const member = message.guild.members.cache.get(message.author.id);
  const victim = message.guild.members.cache.get(target.id);

  if (command === 'kick') {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("You can't kick members.");
    }
    if (victim) await victim.kick();
    message.reply(`${target.tag} was kicked.`);
  }

  if (command === 'ban') {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("You can't ban members.");
    }
    if (victim) await victim.ban();
    message.reply(`${target.tag} was banned.`);
  }
});
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  if (!coins[userId]) coins[userId] = 0;

  if (command === 'balance') {
    message.reply(`You have **${coins[userId]}** coins.`);
  }

  if (command === 'claim') {
    coins[userId] += 100;
    saveCoins();
    message.reply(`You claimed 100 coins! You now have **${coins[userId]}**.`);
  }

  if (command === 'give') {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply("Usage: `cgive @user 100`");
    }

    if (!coins[target.id]) coins[target.id] = 0;
    if (coins[userId] < amount) return message.reply("You don't have enough coins!");

    coins[userId] -= amount;
    coins[target.id] += amount;
    saveCoins();

    message.reply(`You gave **${amount}** coins to ${target.tag}.`);
  }
});

client.login(process.env.TOKEN);
