require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = interaction.options.getUser('target');
  const member = interaction.guild.members.cache.get(interaction.user.id);

  if (interaction.commandName === 'kick') {
    if (!member.permissions.has('KickMembers')) return interaction.reply({ content: 'You can’t kick.', ephemeral: true });
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.kick();
    await interaction.reply(`${target.tag} was kicked.`);
  }

  if (interaction.commandName === 'ban') {
    if (!member.permissions.has('BanMembers')) return interaction.reply({ content: 'You can’t ban.', ephemeral: true });
    const victim = interaction.guild.members.cache.get(target.id);
    if (victim) await victim.ban();
    await interaction.reply(`${target.tag} was banned.`);
  }
});

client.login(process.env.TOKEN);
