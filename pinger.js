const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  InteractionType,
  PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = 'c!';
const activePings = new Map();

// Register slash commands
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName('startping')
      .setDescription('Ping a user every 2 seconds.')
      .addUserOption(opt => opt.setName('target').setDescription('User to ping').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName('stopping')
      .setDescription('Stop pinging in this channel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
});

// Slash commands
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;
  const { commandName, member, channel } = interaction;

  if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Admin only.', ephemeral: true });
  }

  if (commandName === 'startping') {
    const target = interaction.options.getUser('target');
    if (activePings.has(channel.id)) {
      return interaction.reply({ content: 'Already pinging here.', ephemeral: true });
    }

    const interval = setInterval(() => {
      channel.send(`<@${target.id}>`);
    }, 2000);

    activePings.set(channel.id, interval);
    return interaction.reply({ content: `Started pinging ${target.tag} every 2 seconds.` });
  }

  if (commandName === 'stopping') {
    if (!activePings.has(channel.id)) {
      return interaction.reply({ content: 'No active pinging here.', ephemeral: true });
    }

    clearInterval(activePings.get(channel.id));
    activePings.delete(channel.id);
    return interaction.reply({ content: 'Stopped pinging.' });
  }
});

// Prefix commands
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('Admin only.');
  }

  const channelId = message.channel.id;

  if (cmd === 'startping') {
    const target = message.mentions.users.first();
    if (!target) return message.reply('Mention a user to ping.');

    if (activePings.has(channelId)) {
      return message.reply('Already pinging in this channel.');
    }

    const interval = setInterval(() => {
      message.channel.send(`<@${target.id}>`);
    }, 1000);

    activePings.set(channelId, interval);
    return message.reply(`Started pinging ${target.tag} every 2 seconds.`);
  }

  if (cmd === 'stopping') {
    if (!activePings.has(channelId)) {
      return message.reply('No active pinging in this channel.');
    }

    clearInterval(activePings.get(channelId));
    activePings.delete(channelId);
    return message.reply('Stopped pinging.');
  }
});

client.login(process.env.TOKEN);
