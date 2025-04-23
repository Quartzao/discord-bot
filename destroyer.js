const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const coins = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  const content = message.content.trim().toLowerCase();

  if (content === 'destroy') {
    console.log("Destroy command received");

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;

    if (!isAdmin && !isOwner) {
      console.log("User is not admin or owner");
      return message.reply({
        content: "You must be an admin or the server owner to use this command.",
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      console.log("Trying to bulk delete messages...");
      const deleted = await message.channel.bulkDelete(10, true);
      console.log(`Deleted ${deleted.size} messages.`);
      const confirmation = await message.channel.send({
        content: `Destroyed ${deleted.size} messages.`,
        allowedMentions: { parse: [] }
      });
      setTimeout(() => confirmation.delete().catch(() => {}), 3000);
    } catch (err) {
      console.error('Failed to delete messages:', err);
      const errorMsg = await message.reply({
        content: 'Failed to delete messages. Make sure I have Manage Messages permission.',
        allowedMentions: { repliedUser: false }
      });
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    }
  }

  // Example: balance command
  if (content === 'balance') {
    const userId = message.author.id;
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
