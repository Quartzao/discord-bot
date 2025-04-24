client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  const content = message.content.trim().toLowerCase();

  // No-prefix "destroy" command: Purge last 10 messages
  if (content === 'destroy') {
    console.log("Destroy command triggered");

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = message.guild.ownerId === message.author.id;

    if (!isAdmin && !isOwner) {
      return message.reply({
        content: "You must be an admin or the server owner to use this command.",
        allowedMentions: { repliedUser: false }
      });
    }

    try {
      const deleted = await message.channel.bulkDelete(10, true);
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
