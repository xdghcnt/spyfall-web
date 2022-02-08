function init(wsServer, path) {
    const
        fs = require("fs"),
        randomColor = require('randomcolor'),
        app = wsServer.app,
        registry = wsServer.users,
        channel = "spyfall",
        testMode = process.argv[2] === "debug",
        PLAYERS_MIN = 3;

    app.use("/spyfall", wsServer.static(`${__dirname}/public`));
    if (registry.config.appDir)
        app.use("/spyfall", wsServer.static(`${registry.config.appDir}/public`));
    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    const packs = JSON.parse(fs.readFileSync(`${__dirname}/locations.json`));
    const builtLocationPack = (packName) => {
        const result = [];
        for (let [key, value] of Object.keys(packs[packName]).entries())
            result.push({ name: value, index: key, packName: packName });
        return result;
    };

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            debugger
            const
                room = {
                    ...this.room,
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerNames: {},
                    playerColors: {},
                    onlinePlayers: new JSONSet(),
                    players: new JSONSet(),
                    playersVoted: new JSONSet(),
                    playersUsedVoteToken: new JSONSet(),
                    playerScores: {},
                    teamsLocked: false,
                    timed: true,
                    phase: 0,
                    gameTime: 60 * 8,
                    voteTime: 10,
                    revealTime: 15,
                    gameTimeLeft: 0,
                    goal: 10,
                    time: null,
                    paused: true,
                    playerAvatars: {},
                    playerWin: null,
                    suspectedPlayer: null,
                    playerStartedVoting: null,
                    spyFound: null,
                    locationFound: null,
                    wrongLocation: null,
                    blackSlotPlayers: new JSONSet(),
                    correctLocation: null,
                    correctSpy: null,
                    pack: "spyfall1",
                    locations: builtLocationPack('spyfall1'),
                    packs: [...Object.keys(packs), 'shuffle'],
                    managedVoice: true
                },
                state = {
                    spy: null,
                    location: null,
                    strokedLocations: {},
                    strokedPlayers: {},
                    roles: {}
                };
            this.room = room;
            this.state = state;
            this.lastInteraction = new Date();
            let interval;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => {
                    if (room.voiceEnabled)
                        processUserVoice();
                    send(room.onlinePlayers, "state", room);
                },
                processUserVoice = () => {
                    room.userVoice = {};
                    room.onlinePlayers.forEach((user) => {
                        if (!room.managedVoice || !room.teamsLocked || room.phase === 0)
                            room.userVoice[user] = true;
                        else if (room.players.has(user))
                            room.userVoice[user] = true;
                    });
                },
                updatePlayerState = () => {
                    [...room.onlinePlayers].forEach(player => {
                        if (room.players.has(player)) {
                            const isSpy = player === state.spy || [0, 4].includes(room.phase);
                            send(player, "player-state", {
                                strokedLocations: state.strokedLocations[player] || {},
                                strokedPlayers: state.strokedPlayers[player] || {},
                                spy: isSpy ? state.spy : null,
                                location: !isSpy ? state.location : null,
                                role: !isSpy ? state.roles[player] : null,
                                blackSlotLocation: null,
                                blackSlotSpy: null
                            });
                        } else if (room.spectators.has(player)) {
                            const isBlackSlot = room.blackSlotPlayers.has(player);
                            send(player, "player-state", {
                                blackSlotLocation: isBlackSlot ? state.location : null,
                                blackSlotSpy: isBlackSlot ? state.spy : null
                            });
                        }
                    });
                },
                startTimer = (initial) => {
                    if (room.timed) {
                        clearInterval(interval);
                        if (room.phase === 1)
                            room.time = initial ? room.gameTime * 1000 : room.gameTimeLeft;
                        else if (room.phase === 2)
                            room.time = room.voteTime * 1000;
                        else if (room.phase === 3)
                            room.time = room.revealTime * 1000;
                        let time = new Date();
                        interval = setInterval(() => {
                            if (!room.paused) {
                                room.time -= new Date() - time;
                                time = new Date();
                                if (room.time <= 0) {
                                    clearInterval(interval);
                                    if (room.phase === 1) {
                                        endRound(true);
                                    } else if (room.phase === 2) {
                                        endVoting();
                                    } else if (room.phase === 3) {
                                        startRound();
                                    }
                                    update();
                                }
                            } else time = new Date();
                        }, 100);
                    }
                },
                startGame = () => {
                    if (room.players.size >= PLAYERS_MIN) {
                        room.playerWin = null;
                        room.playerScores = {};
                        room.paused = false;
                        room.teamsLocked = true;
                        clearInterval(interval);
                        startRound();
                    } else {
                        room.paused = true;
                        room.teamsLocked = false;
                    }
                },
                endGame = () => {
                    room.paused = true;
                    room.teamsLocked = false;
                    room.time = null;
                    room.phase = 0;
                    clearInterval(interval);
                    update();
                    updatePlayerState();
                },
                endRound = (isTimeout, isStop) => {
                    if (!isStop) {
                        if (room.spyFound)
                            [...room.players].forEach((player) => {
                                if (player !== state.spy) {
                                    room.playerScores[player] = room.playerScores[player] || 0;
                                    if (player === room.playerStartedVoting)
                                        room.playerScores[player] += 2;
                                    else
                                        room.playerScores[player] += 1;
                                }
                            });
                        else {
                            room.playerScores[state.spy] = room.playerScores[state.spy] || 0;
                            room.playerScores[state.spy] += isTimeout ? 2 : 4;
                        }
                    }
                    room.phase = 3;
                    room.correctLocation = state.location;
                    room.correctSpy = state.spy;
                    checkScores();
                    clearInterval(interval);
                    startTimer();
                    update();
                    updatePlayerState();
                },
                stopGame = () => {
                    room.paused = true;
                    room.teamsLocked = false;
                    room.phase = 0;
                    clearInterval(interval);
                    update();
                    updatePlayerState();
                },
                shuffleLocations = (amount) => {
                    let result = [];
                    for (let currentPackName of Object.keys(packs)) {

                        result = [...result, ...shuffleArray(builtLocationPack(currentPackName))];
                        shuffleArray(result);
                    }
                    result = result.slice(0, amount);
                    room.locations = result;
                    return result;
                },
                startRound = () => {
                    if (room.players.size >= PLAYERS_MIN) {



                        room.suspectedPlayer = null;
                        room.playerStartedVoting = null;
                        room.spyFound = null;
                        room.locationFound = null;
                        room.wrongLocation = null;
                        room.correctLocation = null;
                        room.correctSpy = null;
                        room.playersUsedVoteToken.clear();
                        room.playersVoted.clear();
                        state.spy = shuffleArray([...room.players])[0];
                        const location = shuffleArray(room.locations)[0];
                        state.location = room.locations.indexOf(location);
                        state.strokedLocations = {};
                        state.strokedPlayers = {};
                        state.roles = {};
                        let roles = shuffleArray(packs[location.packName][location.name]),
                            rolesUsed = 0;
                        [...room.players].forEach((player) => {
                            state.roles[player] = roles[rolesUsed++];
                            if (rolesUsed === roles.length) {
                                roles = shuffleArray(packs[location.packName][location.name]);
                                rolesUsed = 0;
                            }
                        });
                        room.phase = 1;
                        startTimer(true);
                        update();
                        updatePlayerState();
                    } else {
                        room.phase = 0;
                        room.teamsLocked = false;
                        update();
                    }
                },
                endVoting = () => {
                    if (room.playersVoted.size === room.players.size - 1) {
                        room.spyFound = room.suspectedPlayer === state.spy;
                        if (!room.spyFound)
                            room.wrongSpyRole = state.roles[room.suspectedPlayer];
                        endRound();
                    } else if (room.playersUsedVoteToken.size === room.players.size - (room.playersUsedVoteToken.has(state.spy) ? 0 : 1)) {
                        room.spyFound = false;
                        endRound();
                    } else {
                        room.suspectedPlayer = null;
                        room.playerStartedVoting = null;
                        room.playersVoted.clear();
                        room.phase = 1;
                        if (room.gameTimeLeft <= 5000)
                            room.gameTimeLeft = 5000;
                        update();
                        startTimer()
                    }
                },
                removePlayer = (playerId) => {
                    room.players.delete(playerId);
                    if (room.spectators.has(playerId) || !room.onlinePlayers.has(playerId)) {
                        room.spectators.delete(playerId);
                        delete room.playerNames[playerId];
                        this.emit("user-kicked", playerId);
                    } else {
                        room.spectators.add(playerId);
                        leaveTeam(playerId);
                    }
                    if (room.phase !== 0 && room.players.size < PLAYERS_MIN)
                        stopGame();
                    update();
                    updatePlayerState();
                },
                checkScores = () => {
                    const scores = [...room.players].map(playerId => room.playerScores[playerId] || 0).sort((a, b) => a - b).reverse();
                    if (scores[0] > scores[1]) {
                        const playerLeader = [...room.players].filter(playerId => room.playerScores[playerId] === scores[0])[0];
                        if (scores[0] >= room.goal)
                            room.playerWin = playerLeader;
                    }
                    if (room.playerWin)
                        endGame();
                },
                leaveTeam = (user) => {
                    if (room.phase !== 0) {
                        if (room.players <= PLAYERS_MIN)
                            stopGame();
                        else if (room.phase !== 3 && user === state.spy)
                            endRound(false, true);
                    }
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.playerColors[user] = room.playerColors[user] || randomColor();
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    if (data.avatarId) {
                        fs.stat(`${registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`, (err) => {
                            if (!err) {
                                room.playerAvatars[user] = data.avatarId;
                                update()
                            }
                        });
                    }
                    update();
                    updatePlayerState();
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    if (room.onlinePlayers.size === 0)
                        stopGame();
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.eventHandlers[event])
                            this.eventHandlers[event](user, data[0], data[1], data[2]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };
            this.updatePublicState = update;
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.eventHandlers = {
                ...this.eventHandlers,
                "update-avatar": (user, id) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId && room.paused)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "start-voting": (user, target) => {
                    if (!room.playersUsedVoteToken.has(user)
                        && room.players.has(user)
                        && room.players.has(target)
                        && user !== target
                        && room.phase === 1) {
                        room.phase = 2;
                        room.gameTimeLeft = room.time;
                        room.playerStartedVoting = user;
                        room.suspectedPlayer = target;
                        room.playersVoted.add(user);
                        room.playersUsedVoteToken.add(user);
                        startTimer();
                    }
                    update();
                },
                "add-vote": (user) => {
                    if (!room.playersVoted.has(user)
                        && room.phase === 2
                        && room.players.has(user)) {
                        room.playersVoted.add(user);
                        if (room.playersVoted.size === room.players.size - 1)
                            endVoting();
                    }
                    update();
                },
                "guess-location": (user, location) => {
                    if (room.players.has(user) && room.phase === 1 && state.spy === user) {
                        room.locationFound = location === state.location;
                        if (!room.locationFound) {
                            room.wrongLocation = location;
                            room.spyFound = true;
                        }
                        endRound();
                    }
                    update();
                },
                "stroke-location": (user, location) => {
                    if (room.players.has(user) && [1, 2].includes(room.phase)) {
                        state.strokedLocations[user] = state.strokedLocations[user] || {};
                        if (!state.strokedLocations[user][location])
                            state.strokedLocations[user][location] = true;
                        else
                            delete state.strokedLocations[user][location];
                        updatePlayerState();
                    }
                    update();
                },
                "stroke-player": (user, player) => {
                    if (room.players.has(player) && room.players.has(user) && [1, 2].includes(room.phase) && user !== player) {
                        state.strokedPlayers[user] = state.strokedPlayers[user] || {};
                        if (!state.strokedPlayers[user][player])
                            state.strokedPlayers[user][player] = true;
                        else
                            delete state.strokedPlayers[user][player];
                        updatePlayerState();
                    }
                },
                "toggle-pause": (user) => {
                    if (user === room.hostId) {
                        room.paused = !room.paused;
                        if (room.phase === 0)
                            startGame();
                        else if (!room.paused && room.phase === 3)
                            startRound();
                    }
                    update();
                },
                "stop": (user) => {
                    if (user === room.hostId)
                        endRound(false, true);
                },
                "restart": (user) => {
                    if (user === room.hostId)
                        startGame();
                },
                "toggle-timed": (user) => {
                    if (user === room.hostId) {
                        room.timed = !room.timed;
                        if (!room.timed) {
                            room.time = null;
                            clearInterval(interval);
                        }
                    }
                    update();
                },
                "set-param": (user, type, value) => {
                    if (user === room.hostId && ~[
                        "gameTime",
                        "voteTime",
                        "revealTime",
                        "goal"].indexOf(type) && !isNaN(parseInt(value)))
                        room[type] = parseFloat(value);
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                },
                "remove-player": (user, playerId) => {
                    if (playerId && user === room.hostId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (playerId && user === room.hostId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "players-join": (user) => {
                    if (!room.teamsLocked) {
                        room.blackSlotPlayers.delete(user);
                        room.spectators.delete(user);
                        room.players.add(user);
                        update();
                        updatePlayerState();
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked) {
                        room.players.delete(user);
                        room.spectators.add(user);
                        leaveTeam(user);
                        update();
                        updatePlayerState();
                    }
                },
                "toggle-black-slot": (user, playerId) => {
                    if (room.spectators.has(playerId) && user === room.hostId) {
                        if (!room.blackSlotPlayers.has(playerId))
                            room.blackSlotPlayers.add(playerId);
                        else
                            room.blackSlotPlayers.delete(playerId);
                        update();
                        updatePlayerState();
                    }
                },
                "set-pack": (user, pack) => {
                    debugger
                    if (user === room.hostId && (pack === 'shuffle' || packs[pack]) && [0, 3].includes(room.phase)) {
                        room.pack = pack;
                        if (room.pack === 'shuffle') {
                            shuffleLocations(30);
                        } else {
                            room.locations = builtLocationPack(pack)
                        }
                        if (room.phase === 3)
                            startRound();
                    }
                    update();
                }


            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state,
                player: this.player
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.paused = true;
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.players = new JSONSet(this.room.players);
            this.room.playersVoted = new JSONSet(this.room.playersVoted);
            this.room.playersUsedVoteToken = new JSONSet(this.room.playersUsedVoteToken);
            this.room.blackSlotPlayers = new JSONSet(this.room.blackSlotPlayers);
            this.room.onlinePlayers.clear();
        }
    }

    function makeId() {
        let text = "";
        const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    function shuffleArray(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

