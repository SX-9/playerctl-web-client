#! /usr/bin/env node

import express from "express";
import path from "path";
import { execaSync as exec } from "execa";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: {
    origin: "*"
}});

if (process.platform !== 'linux') throw new Error('Unsupported Platform!');

//app.use(express.static(__dirname + '/public'));

app.get('/', (rq, res) => res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlayerCtl Web Client</title>
    <style>
        * {
            color-scheme: dark;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            margin: 0;
        }

        body {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: .25em;
        }

        button {
            all: unset;
            font-size: 2.5rem;
        }

        div {
            display: flex;
            gap: 1em;
        }
    </style>
</head>
<body>
    <h1 id="title">Loading Server Info...</h1>
    <p><span id="artist">Please Wait...</span></p>
    <p>Is <span id="stats">...</span> | Loop <span id="loop">...</span> | Shuffle <span id="shuffle">...</span></p>
    <div>
        <button onclick="socket.emit('shuf')">🔀</button>
        <button onclick="socket.emit('prev')">⏮️</button>
        <button onclick="socket.emit('play')">⏯️</button>
        <button onclick="socket.emit('next')">⏭️</button>
        <button onclick="socket.emit('loop')">🔁</button>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io('/');
        socket.on('update', (data) => {
            title.innerText = data.title;
            artist.innerText = data.artist;
            stats.innerText = data.status;
            loop.innerText = data.loop;
            shuffle.innerText = data.shuffle;
        });
    </script>
</body>
</html>
`));

io.on("connection", (socket) => {
    socket.on('play', () => exec('playerctl', ['play-pause']));
    socket.on('next', () => exec('playerctl', ['next']));
    socket.on('prev', () => exec('playerctl', ['previous']));
    socket.on('shuf', () => exec('playerctl', ['shuffle', 'toggle']));
    socket.on('loop', () => {
        let currently;
        try {
            currently = exec('playerctl', ['loop']).stdout;
        } finally {
            switch (currently) {
                case 'None':
                    exec('playerctl', ['loop', 'playlist']);
                    break;
                case 'Playlist':
                    exec('playerctl', ['loop', 'track']);
                    break;
                case 'Track':
                    exec('playerctl', ['loop', 'none']);
                    break;
            }
        }
    });
});

setInterval(() => {
    let output = {};
    try {
        output = {
            title: exec('playerctl', ['metadata', 'xesam:title']).stdout,
            artist: exec('playerctl', ['metadata', 'xesam:artist']).stdout,
            status: exec('playerctl', ['status']).stdout,
            loop: exec('playerctl', ['loop']).stdout,
            shuffle: exec('playerctl', ['shuffle]),
        }
    } finally {
        io.sockets.emit('update', output);
    }
}, 500);

httpServer.listen(7564, () => console.log('http://localhost:7564'));