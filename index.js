const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  InteractionType, 
  Partials 
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = "c!";
const coins = {};
const warnings = {};
const dailyClaims = {};
const marriages = {};
const levels = {};
const welcomeSettings = {};
const customImages = {};
const embedTemplates = {};
const mathAnswers = {};

const questions = [
  { q: "What is 12 + 7?", a: "19" },
  { q: "Solve 9 * 3", a: "27" },
  { q: "What is 100 / 4?", a: "25" },
  { q: "15 - 9 equals?", a: "6" }
];

// Random hourly math quiz
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    const channel = guild.systemChannel;
    if (channel) {
      const { q, a } = questions[Math.floor(Math.random() * questions.length)];
      mathAnswers[guild.id] = a;
      const embed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('Math Challenge!')
        .setDescription(`First to answer correctly gets 100 coins!\n**${q}**`)
        .setTimestamp();
      channel.send({ embeds: [embed] });
    }
  });
}, 1000 * 60 * 60); // 1 hour
