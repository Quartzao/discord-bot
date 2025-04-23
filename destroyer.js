const { PermissionFlagsBits } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.trim() === 'Destroy') {
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
        await message.channel.bulkDelete(10, true);
        const confirmation = await message.channel.send({
          content: "Destroyed 10 messages.",
          allowedMentions: { parse: [] }
        });
        setTimeout(() => confirmation.delete().catch(() => {}), 3000);
      } catch (err) {
        console.error('Failed to delete messages:', err);
        const errorMsg = await message.reply({
          content: 'Failed to delete messages.',
          allowedMentions: { repliedUser: false }
        });
        setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
      }
    }
  });
};
