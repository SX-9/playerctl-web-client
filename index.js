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