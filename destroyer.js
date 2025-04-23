const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
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
const warnings = {};
const dailyClaims = {};
const marriages = {};
const levels = {};
const welcomeSettings = {};
const customImages = {};
const embedTemplates = {};
const mathAnswers = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Example destroy command without prefix
  if (message.content.trim().toLowerCase() === 'destroy') {
    console.log("Destroy command triggered");

    // Check if the user has Admin or Owner permissions
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;

    if (!isAdmin && !isOwner) {
      const reply = await message.reply({
        content: "You must be an admin or the server owner to use this command.",
        allowedMentions: { repliedUser: false }
      });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      return;
    }

    try {
      console.log("Attempting to bulk delete messages...");
      // Attempt to delete 10 messages
      await message.channel.bulkDelete(10, true); // true to filter out non-text messages
      const confirmation = await message.channel.send({
        content: "Destroyed 10 messages.",
        allowedMentions: { parse: [] }
      });
      setTimeout(() => confirmation.delete().catch(() => {}), 3000); // Delete the confirmation message after 3 seconds
    } catch (err) {
      console.error('Failed to delete messages:', err);
      const errorMsg = await message.reply({
        content: 'Failed to delete messages.',
        allowedMentions: { repliedUser: false }
      });
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000); // Delete error message after 5 seconds
    }
  }

  // Add other command handlers below...

  // Example balance command without prefix
  if (message.content.trim().toLowerCase() === 'balance') {
    const userId = message.author.id;
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(`You have **${coins[userId] || 0}** coins.`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // Add more commands like claim, give, warn, etc., as needed...
});

// Initialize bot and login
client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
