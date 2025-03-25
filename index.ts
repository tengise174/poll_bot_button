import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CommandInteraction,
    ButtonInteraction,
  } from "discord.js";
  import "dotenv/config";
  
  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  
  // Poll data storage (in-memory)
  interface PollData {
    question: string;
    options: string[];
    votes: Map<string, number>;
    voters: Set<string>;
  }
  const polls = new Map<string, PollData>();
  
  // Define the /poll command
  const pollCommand = new SlashCommandBuilder()
    .setName("санал")
    .setDescription("Санал асуулга үүгэнэ")
    .addStringOption((option) =>
      option
        .setName("асуулт")
        .setDescription("асуултаа бичээрэй")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("сонголт")
        .setDescription("сонголтуудаа таслалаар ялгаж бичээрэй (e.g., yes,no,busy)")
        .setRequired(true)
    );
  
  // Register commands when bot starts
  client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN!);
  
    try {
      console.log("Registering slash commands...");
      await rest.put(Routes.applicationCommands(client.user!.id), {
        body: [pollCommand.toJSON()],
      });
      console.log("Commands registered successfully.");
    } catch (error) {
      console.error("Failed to register commands:", error);
    }
  });
  
  // Handle interactions
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
      await handleCommand(interaction as CommandInteraction);
    } else if (interaction.isButton()) {
      await handleButton(interaction as ButtonInteraction);
    }
  });
  
  async function handleCommand(interaction: CommandInteraction) {
    if (interaction.commandName !== "санал") return;
  
    const question = interaction.options.get("асуулт")?.value as string;
    const optionsString = interaction.options.get("сонголт")?.value as string;
  
    if (!question || !optionsString) {
      await interaction.reply({
        content: "асуулт сонголтоо бүрэн бичнэ үү.",
        ephemeral: true,
      });
      return;
    }
  
    const options = optionsString.split(",").map((opt) => opt.trim());
  
    if (options.length < 2 || options.length > 5) {
      await interaction.reply({
        content: "2-оос 5 сонголт бичнэ үү.",
        ephemeral: true,
      });
      return;
    }
  
    const buttons = options.map((option, index) =>
      new ButtonBuilder()
        .setCustomId(`poll_${interaction.id}_${index}`)
        .setLabel(option)
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  
    const embed = new EmbedBuilder()
      .setTitle(question)
      .setDescription("Товч дээр дарж хариулаарай!")
      .setColor(0x00ff00);
  
    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });
  
    polls.set(message.id, {
      question,
      options,
      votes: new Map(options.map((opt) => [opt, 0])),
      voters: new Set(),
    });
  }
  
  async function handleButton(interaction: ButtonInteraction) {
    const [type, pollId, optionIndex] = interaction.customId.split("_");
    if (type !== "poll") return;
  
    const poll = polls.get(interaction.message.id);
    if (!poll) {
      await interaction.reply({ content: "Poll not found.", ephemeral: true });
      return;
    }
  
    const userId = interaction.user.id;
    if (poll.voters.has(userId)) {
      await interaction.reply({
        content: "Аль хэдийн сонголтоо хийсэн байна",
        ephemeral: true,
      });
      return;
    }
  
    const index = parseInt(optionIndex ? optionIndex : "0");
    if (isNaN(index) || index < 0 || index >= poll.options.length) {
      await interaction.reply({
        content: "Invalid option selected.",
        ephemeral: true,
      });
      return;
    }
  
    const option = poll.options[index]; // TypeScript knows this is string due to bounds check
    if (!option) {
      // This should never happen with the index check, but adding for extra safety
      await interaction.reply({ content: "Option not found.", ephemeral: true });
      return;
    }
  
    poll.votes.set(option, (poll.votes.get(option) || 0) + 1);
    poll.voters.add(userId);
  
    const results = poll.options
      .map((opt) => `${opt}: ${poll.votes.get(opt) || 0} санал`)
      .join("\n");
    const updatedEmbed = new EmbedBuilder()
      .setTitle(poll.question)
      .setDescription(`Үр дүн:\n${results}`)
      .setColor(0x00ff00);
  
    await interaction.update({
      embeds: [updatedEmbed],
      components: [
        interaction.message
          .components[0] as unknown as ActionRowBuilder<ButtonBuilder>,
      ],
    });
  }
  
  // Log in
  client.login(process.env.BOT_TOKEN);
  
  
  
// Татах линк : https://discord.com/oauth2/authorize?client_id=1354052417066635284&permissions=8&integration_type=0&scope=bot+applications.commands