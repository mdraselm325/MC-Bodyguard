const { fork } = require('child_process');
const readline = require("readline");
const http = require('http'); // Added HTTP module for server

const hostName = "mc1496499.fmcs.cloud";
const hostPort = 25811;

const bots = [];
const botsByName = {};

const autoSpawnBots = 1;
const spawnDelay = 5000;

const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function spawnBot(botName) {
    const bot = fork("bot.js", [botName, hostName, hostPort]);

    bots.push(bot);
    botsByName[botName] = bot;

    bot.on('message', (data) => {
        if (data.type === "message") {
            console.log(`\x1b[32m@${botName}\x1b[0m: ${data.text}`);
        }
    });

    bot.on('end', () => {
        console.log(`Bot "${botName}" disconnected, attempting to reconnect...`);
        setTimeout(() => spawnBot(botName), 5000); // Reconnect after 5 seconds
    });

    bot.on('kicked', (reason) => {
        console.log(`Bot "${botName}" was kicked: ${reason}. Reconnecting...`);
        setTimeout(() => spawnBot(botName), 5000); // Reconnect after 5 seconds
    });

    bot.on('error', (err) => {
        console.error(`Bot "${botName}" encountered an error: ${err}. Reconnecting...`);
        setTimeout(() => spawnBot(botName), 5000); // Reconnect after 5 seconds
    });

    bot.on('exit', (code) => {
        console.log(`Bot "${botName}" exited with code ${code}. Reconnecting...`);
        setTimeout(() => spawnBot(botName), 5000); // Reconnect after 5 seconds
    });
}

async function spawnBots(amount = 1) {
    for (let i = 0; i < amount; i++) {
        const botName = `guard_${bots.length}`;
        spawnBot(botName);

        await sleep(spawnDelay);
    }
}

const COMMAND_FUNCTIONS = {
    "ping": () => {
        console.log("pong");
    },

    "spawn": (amount) => {
        spawnBots(Number(amount));
    },
};

function runCommand(command) {
    const tokens = command.split(' ');

    if (tokens[0].startsWith('@')) {
        const botName = tokens[0].slice(1);
        const bot = botsByName[botName];

        if (!bot) {
            console.log(`Couldn't find bot named "${botName}".`);
            return;
        }

        bot.send({
            type: "command",
            command: tokens.slice(1),
        });

        return;
    }

    const commandFunction = COMMAND_FUNCTIONS[tokens[0]];

    if (!commandFunction) {
        console.log(`Unknown command: ${tokens[0]}`);
        return;
    }

    commandFunction(...tokens.slice(1));
}

function inputLoop(command) {
    if (command) runCommand(command);
    reader.question(">", inputLoop);
}

async function main() {
    spawnBots(autoSpawnBots);
    inputLoop();
}

// Create an HTTP server for Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server is running.\n');
}).listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Start the main function
main();
