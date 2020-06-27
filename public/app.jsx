//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Location extends React.Component {
    render() {
        const
            data = this.props.data,
            index = this.props.index == null ? "spy" : this.props.index,
            game = this.props.game,
            table = this.props.table;
        return <div
            onClick={() => table && game.handleClickStrokeLocation(index)}
            style={{"background-image": `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(/spyfall/location/${index}.jpg)`}}
            className={cs(`location location-${index}`, {
                stroked: table && data.strokedLocations && data.strokedLocations[index],
                correct: table && (index === data.correctLocation || index === data.blackSlotLocation),
                wrong: table && index === data.wrongLocation
            })}>
            <div className="location-title">{window.hyphenate(index !== "spy" ? data.locations[index] : "Шпион")}</div>
            {(index !== "spy" && !table)
                ? (<div className="role-title">{window.hyphenate(data.role)}</div>)
                : ""}
            {table && data.userId === data.spy && data.phase === 1 ? (<div className="guess-location-button">
                <i className="material-icons"
                   title="Назвать локацию"
                   onClick={(evt) => game.handleClickGuessLocation(index, evt)}>
                    person_pin_circle
                </i>
            </div>) : ""}
        </div>;
    }
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            id = this.props.id,
            game = this.props.game,
            isSpectator = this.props.isSpectator,
            blackSlotButton = <i
                className={cs("material-icons", "host-button", {"black-slot-mark": data.hostId !== data.userId})}
                title={data.hostId === data.userId ? (!~data.blackSlotPlayers.indexOf(id)
                    ? "Give black slot" : "Remove black slot") : "Black slot"}
                onClick={(evt) => game.handleGiveBlackSlot(id, evt)}>
                {!~data.blackSlotPlayers.indexOf(id) ? "visibility_off" : "visibility"}
            </i>,
            hasAvatar = !!data.playerAvatars[id],
            avatarURI = `/spyfall/avatars/${id}/${data.playerAvatars[id]}.png`,
            isPlayer = data.players.includes(id),
            hasToken = !data.playersUsedVoteToken.includes(id) || data.playerStartedVoting === id;
        return (
            <div
                onClick={() => game.handleClickStrokePlayer(id)}
                className={cs("player", {
                    offline: !data.onlinePlayers.includes(id),
                    self: id === data.userId,
                    "has-avatar": hasAvatar,
                    suspected: data.suspectedPlayer === id,
                    playerStartedVoting: data.playerStartedVoting === id,
                    voted: data.playersVoted.includes(id),
                    stroked: data.suspectedPlayer !== id && (data.strokedPlayers && data.strokedPlayers[id]),
                    correctSpy: data.correctSpy === id || data.blackSlotSpy === id
                })} onTouchStart={(e) => e.target.focus()}
                style={!isSpectator ? {
                    "background-image": hasAvatar
                        ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${avatarURI})`
                        : `none`,
                    "background-color": hasAvatar
                        ? `transparent`
                        : data.playerColors[id]
                } : {}}>
                <div className="player-name-section">
                    <span className="player-name">{data.playerNames[id]}</span>
                    {isPlayer
                        ? (<span className="player-controls">
                            <span className="has-badge">
                                <i title={hasToken ? "Может использовать обвинение" : "Обвинение уже использовано"}
                                   className="material-icons host-button"> {hasToken ? "report" : "report_off"}</i>
                            </span>
                            <span
                                onClick={(evt) => id !== data.userId
                                    && game.handleClickClaimSpy(id, evt)}
                                className={cs("claim-spy", {"active": hasToken})}>
                                <i title={data.suspectedPlayer === id
                                    ? "Обвиняется"
                                    : !data.playersUsedVoteToken.includes(data.userId)
                                        ? "Обвинить"
                                        : "Вы уже истратили своё обвинение"}
                                   className="material-icons host-button">api</i>
                            </span>
                            <span className="score">{data.playerScores[id] || 0}</span>
                        </span>)
                        : ""}
                    {data.blackSlotPlayers.includes(id) ? (
                        <span className="black-slot-button">{blackSlotButton}</span>
                    ) : ""}
                    <div className="player-host-controls">
                        {((data.spectators.includes(id)
                            && !data.blackSlotPlayers.includes(id) && data.userId === data.hostId)) ? (
                            <span className="black-slot-button">{blackSlotButton}</span>
                        ) : ""}
                        {(data.hostId === data.userId && data.userId !== id) ? (
                            <i className="material-icons host-button"
                               title="Give host"
                               onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                                vpn_key
                            </i>) : ""}
                        {(data.hostId === data.userId && data.userId !== id) ? (
                            <i className="material-icons host-button"
                               title="Remove"
                               onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
                                delete_forever
                            </i>) : ""}
                        {(data.hostId === id) ? (
                            <i className="material-icons host-button inactive"
                               title="Game host">
                                stars
                            </i>
                        ) : ""}
                    </div>
                </div>
            </div>
        );
    }
}

class Avatar extends React.Component {
    render() {
        const
            hasAvatar = !!this.props.data.playerAvatars[this.props.player],
            avatarURI = `/spyfall/avatars/${this.props.player}/${this.props.data.playerAvatars[this.props.player]}.png`;
        return (
            <div className={cs("avatar", {"has-avatar": hasAvatar})}
                 style={{
                     "background-image": hasAvatar
                         ? `url(${avatarURI})`
                         : `none`,
                     "background-color": hasAvatar
                         ? `transparent`
                         : this.props.data.playerColors[this.props.player]
                 }}>
                {!hasAvatar ? (
                    <i className="material-icons avatar-stub">
                        person
                    </i>
                ) : ""}
            </div>
        );
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!parseInt(localStorage.darkThemeSpyfall))
            document.body.classList.add("dark-theme");
        if (!localStorage.spyfallUserId || !localStorage.spyfallUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.spyfallUserId = makeId();
            localStorage.spyfallUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        if (localStorage.acceptDelete) {
            initArgs.acceptDelete = localStorage.acceptDelete;
            delete localStorage.acceptDelete;
        }
        initArgs.avatarId = localStorage.avatarId;
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.spyfallUserId;
        initArgs.token = this.userToken = localStorage.spyfallUserToken;
        initArgs.userName = localStorage.userName;
        initArgs.wssToken = window.wssToken;
        this.socket = window.socket.of("spyfall");
        this.player = {cards: []};
        this.socket.on("state", state => {
            CommonRoom.processCommonRoom(state, this.state);
            if (this.state.phase && state.phase !== 0 && !parseInt(localStorage.muteSounds)) {
                if (this.state.phase !== 1 && state.phase === 1)
                    this.masterSound.play();
                else if (this.state.phase === 1 && state.phase === 2)
                    this.storySound.play();
                else if (this.state.phase !== 3 && state.phase === 3)
                    this.revealSound.play();
                else if (state.phase === 2 && this.state.playersVoted.length !== state.playersVoted.length)
                    this.tapSound.play();
            }
            if (this.state.inited && this.state.phase !== 2 && state.phase === 2)
                this.progressBarUpdate(0, 100);
            this.setState(Object.assign({
                userId: this.userId
            }, state));
        });
        this.socket.on("player-state", (state) => {
            this.setState(Object.assign({
                userId: this.userId
            }, state));
        });
        this.socket.on("message", text => {
            popup.alert({content: text});
        });
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason
            });
        });
        this.socket.on("reload", () => {
            setTimeout(() => window.location.reload(), 3000);
        });
        this.socket.on("auth-required", () => {
            this.setState(Object.assign({}, this.state, {
                userId: this.userId,
                authRequired: true
            }));
            if (grecaptcha)
                grecaptcha.render("captcha-container", {
                    sitekey: "",
                    callback: (key) => this.socket.emit("auth", key)
                });
            else
                setTimeout(() => window.location.reload(), 3000)
        });
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        document.title = `Шпион - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        this.timerSound = new Audio("/spyfall/tick.mp3");
        this.timerSound.volume = 0.4;
        this.tapSound = new Audio("/spyfall/tap.mp3");
        this.tapSound.volume = 0.3;
        this.storySound = new Audio("/spyfall/start.mp3");
        this.storySound.volume = 0.4;
        this.revealSound = new Audio("/spyfall/reveal.mp3");
        this.revealSound.volume = 0.3;
        this.masterSound = new Audio("/spyfall/master.mp3");
        this.masterSound.volume = 0.7;
    }

    debouncedEmit() {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit.apply(this.socket, arguments);
        }, 100);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
        window.hyphenate = createHyphenator(hyphenationPatternsRu);
    }

    handleJoinPlayersClick(evt) {
        evt.stopPropagation();
        if (!this.state.teamsLocked)
            this.socket.emit("players-join");
    }

    handleJoinSpectatorsClick(evt) {
        evt.stopPropagation();
        this.socket.emit("spectators-join");
    }

    handleClickAddVote() {
        this.socket.emit("add-vote");
    }

    handleClickGuessLocation(location, evt) {
        evt.stopPropagation();
        popup.confirm({content: "Попытаться угадать локацию?"}, (evt) => evt.proceed
            && this.socket.emit("guess-location", location));
    }

    handleClickStrokeLocation(location) {
        this.socket.emit("stroke-location", location);
    }

    handleClickStrokePlayer(player) {
        this.socket.emit("stroke-player", player);
    }

    handleGiveBlackSlot(player, evt) {
        evt.stopPropagation();
        this.socket.emit("toggle-black-slot", player);
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Removing ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    handleChangeParam(value, type) {
        this.debouncedEmit("set-param", type, value);
    }

    handleClickChangeName() {
        popup.prompt({content: "New name", value: this.state.playerNames[this.state.userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    handleClickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    handleClickClaimSpy(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: "Обвинить в шпионаже?"}, (evt) => evt.proceed
            && this.socket.emit("start-voting", id));
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0])
            this.sendAvatar(input.files[0]);
    }

    sendAvatar(file) {
        const
            uri = "/common/upload-avatar",
            xhr = new XMLHttpRequest(),
            fd = new FormData(),
            fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
        if (fileSize <= 5) {

            xhr.open("POST", uri, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    localStorage.avatarId = xhr.responseText;
                    this.socket.emit("update-avatar", localStorage.avatarId);
                } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "File upload error"});
            };
            fd.append("avatar", file);
            fd.append("userId", this.userId);
            fd.append("userToken", this.userToken);
            xhr.send(fd);
        } else
            popup.alert({content: "File shouldn't be larger than 5 MB"});
    }

    handleToggleTheme() {
        localStorage.darkThemeSpyfall = !parseInt(localStorage.darkThemeSpyfall) ? 1 : 0;
        document.body.classList.toggle("dark-theme");
        this.setState(Object.assign({}, this.state));
    }

    handleToggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.setState(Object.assign({}, this.state));
    }

    handleClickTogglePause() {
        this.socket.emit("toggle-pause");
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickStop() {
        popup.confirm({content: "Остановить игру?"}, (evt) => evt.proceed && this.socket.emit("stop"));
    }

    handleClickRestart() {
        if (!this.playerWin)
            popup.confirm({content: "Перезапустить игру?"}, (evt) => evt.proceed && this.socket.emit("restart"));
        else
            this.socket.emit("restart")
    }

    handleToggleTimed() {
        this.socket.emit("toggle-timed");
    }

    updateTimer(time) {
        const timeTotal = {
            1: this.state.gameTime,
            2: this.state.voteTime,
            3: this.state.revealTime
        }[this.state.phase] * 1000;
        this.progressBarUpdate(timeTotal - time, timeTotal);
    }

    progressBarUpdate(x, outOf) {
        let firstHalfAngle = 180,
            secondHalfAngle = 0;

        // caluclate the angle
        let drawAngle = x / outOf * 360;

        // calculate the angle to be displayed if each half
        if (drawAngle <= 180) {
            firstHalfAngle = drawAngle;
        } else {
            secondHalfAngle = drawAngle - 180;
        }

        // set the transition
        document.getElementsByClassName("rtb-slice1")[0].style.transform = `rotate(${firstHalfAngle}deg)`;
        document.getElementsByClassName("rtb-slice2")[0].style.transform = `rotate(${secondHalfAngle}deg)`;
    }

    handleAddCommandClick() {
        this.socket.emit(this.state.phase === 1 ? "add-hint" : "guess-word", document.getElementById("command-input").value);
    }

    handleClickToggleReady() {
        this.socket.emit("toggle-ready");
    }

    handleClickToggleHintBan(user) {
        this.socket.emit("toggle-hint-ban", user);
    }

    handleClickSetLike(user) {
        this.socket.emit("set-like", user);
    }

    render() {
        clearTimeout(this.timerTimeout);
        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            document.body.classList.add("captcha-solved");
            const
                data = this.state,
                isHost = data.hostId === data.userId,
                inProcess = data.phase !== 0 && !data.paused,
                isMaster = data.master === data.userId;
            if (data.phase !== 0 && data.timed) {
                let timeStart = new Date();
                this.timerTimeout = setTimeout(() => {
                    if (this.state.timed && !this.state.paused) {
                        let prevTime = this.state.time,
                            time = prevTime - (new Date - timeStart);
                        this.setState(Object.assign({}, this.state, {time: time}));
                        this.updateTimer(time);
                        if ([1, 2].includes(this.state.phase) && this.state.timed && time < 10000
                            && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
                            this.timerSound.play();
                    }
                    if (!this.state.timed)
                        this.updateTimer(0);
                }, 1000);
            }
            let status = "";
            if (data.phase === 1 && data.timed && data.time < 10000)
                status = `Осталось ${parseInt(data.time / 1000)} секунд. Не забудьте выставить кого-нибудь на голосование!`;
            else if (data.playerWin)
                status = `Победа ${data.playerNames[data.playerWin]}!`;
            else if (data.phase === 3)
                if (data.locationFound === false)
                    status = `Шпион назвал неправильную локацию...`;
                else if (data.spyFound)
                    status = `Шпион пойман!`;
                else if (data.locationFound)
                    status = `Шпион нашёл локацию!`;
                else
                    status = `Пойман ${data.wrongSpyRole.toLowerCase()}. Шпиону удалось уйти...`;
            return (
                <div className={cs("game", {timed: this.state.timed})}>
                    <div className={
                        cs("game-board", {
                            active: this.state.inited,
                            isMaster,
                            teamsLocked: data.teamsLocked,
                            votePhase: data.phase === 2,
                            revealPhase: data.phase === 3
                        })}>
                        <div className="main-row">
                            <div className="main-dock">
                                <div className="player-list">
                                    {data.timed ? (<div className="timer">
                                            <div className="round-track-bar">
                                                <div className="rtb-clip1">
                                                    <div className="rtb-slice1"/>
                                                </div>
                                                <div className="rtb-clip2">
                                                    <div className="rtb-slice2"/>
                                                </div>
                                                <div className="rtb-content">
                                            <span className="timer-time">
                                                {(new Date(data.phase === 2
                                                    ? data.gameTimeLeft
                                                    : (!data.teamWin && data.phase !== 3)
                                                        ? data.time : 0)).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                                            </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""}
                                    <div className="role-card">
                                        <Location data={data} index={this.state.location} game={this}/>
                                    </div>
                                    {data.players.concat(!data.players.includes(data.userId) && !data.teamsLocked && [0, 3].includes(data.phase)
                                        ? ["join"]
                                        : []).reduce((acc, curr, i, arr) => {
                                        if (!(i % 4))
                                            acc.push(arr.slice(i, i + 4));
                                        return acc;
                                    }, []).map((slice) => (
                                        <div className="player-list-col">{
                                            slice.map((id => (
                                                    id !== "join" ? (<Player key={id} data={data} id={id}
                                                                             game={this}
                                                                             handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}
                                                                             handleAvatarClick={() => this.handleClickSetAvatar()}
                                                                             handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}/>)
                                                        : (<div onClick={(evt) => this.handleJoinPlayersClick(evt)}
                                                                className="join-button">
                                                            <span className="join-button-text">Войти
                                                            </span>
                                                        </div>)
                                                ))
                                            )
                                        }</div>
                                    ))}
                                </div>
                            </div>

                            <div className="locations">
                                {Array(27).fill(null).map((n, index) => (
                                    <Location data={data} index={index} game={this} table={true}/>
                                ))}
                            </div>
                        </div>
                        <div className={cs("vote-dialog panel", {
                            active: data.phase === 2
                                && data.players.includes(data.userId)
                                && !data.playersVoted.includes(data.userId)
                                && data.suspectedPlayer !== data.userId
                        })}>
                            <div className="vote-title">Обвинить {data.playerNames[data.suspectedPlayer]}?</div>
                            <div
                                onClick={() => this.handleClickAddVote()}
                                className="vote-button panel-accent">Да
                            </div>
                        </div>
                        {status ? (<div className="vote-reminder-wrap">
                            <div className="vote-reminder panel">{status}</div>
                        </div>) : ""}
                        <div className={
                            cs("spectators-section", {active: data.spectators.length > 0 || !data.teamsLocked})}>
                            <div
                                onClick={(evt) => this.handleJoinSpectatorsClick(evt)}
                                className="spectators panel">
                                Наблюдают:
                                {
                                    data.spectators.length ? data.spectators.map(
                                        (player) => (<Player data={data} id={player} isSpectator={true}
                                                             game={this}/>)
                                    ) : " ..."
                                }
                            </div>
                        </div>
                        <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                            {data.timed ? (<div className="host-controls-menu">
                                <div className="little-controls">
                                    <div className="game-settings">
                                        <div className="set-game-time"><i title="Время раунда"
                                                                          className="material-icons">alarm</i>
                                            {(isHost && !inProcess) ? (<input id="game-time"
                                                                              type="number"
                                                                              defaultValue={this.state.gameTime / 60}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber * 60, "gameTime")}
                                            />) : (<span className="value">{this.state.gameTime / 60}</span>)}
                                        </div>
                                        <div className="set-voting-time"><i title="Время голосования"
                                                                            className="material-icons">alarm</i>
                                            {(isHost && !inProcess) ? (<input id="vote-time"
                                                                              type="number"
                                                                              defaultValue={this.state.voteTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber, "voteTime")}
                                            />) : (<span className="value">{this.state.voteTime}</span>)}
                                        </div>
                                        <div className="set-reveal-time"><i title="Время между раундами"
                                                                            className="material-icons">alarm_on</i>
                                            {(isHost && !inProcess) ? (<input id="reveal-time"
                                                                              type="number"
                                                                              defaultValue={this.state.revealTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeParam(evt.target.valueAsNumber, "revealTime")}
                                            />) : (<span className="value">{this.state.revealTime}</span>)}
                                            <div className="set-goal"><i title="Цель"
                                                                         className="material-icons">flag</i>
                                                {(isHost && !inProcess) ? (<input id="goal"
                                                                                  type="number"
                                                                                  defaultValue={this.state.goal}
                                                                                  min="1"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "goal")}
                                                />) : (<span className="value">{this.state.goal}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>) : ""}
                            <div className="side-buttons">
                                {this.state.userId === this.state.hostId ?
                                    <i onClick={() => this.socket.emit("set-room-mode", false)}
                                       className="material-icons exit settings-button">store</i> : ""}
                                {(isHost && data.paused) ? (!data.timed
                                    ? (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm_off</i>)
                                    : (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm</i>)) : ""}
                                {(isHost && data.paused) ? (data.teamsLocked
                                    ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_outline</i>)
                                    : (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                {isHost ? (!inProcess
                                    ? (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">play_arrow</i>)
                                    : (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">pause</i>)) : ""}
                                {(isHost && data.paused && data.phase !== 3 && data.phase !== 0)
                                    ? (<i onClick={() => this.handleClickStop()}
                                          className="toggle-theme material-icons settings-button">stop</i>) : ""}
                                {(isHost && data.paused && data.phase === 3)
                                    ? (<i onClick={() => this.handleClickRestart()}
                                          className="toggle-theme material-icons settings-button">sync</i>) : ""}
                                <i onClick={() => this.handleClickSetAvatar()}
                                   className="toggle-theme material-icons settings-button">account_circle</i>
                                <i onClick={() => this.handleClickChangeName()}
                                   className="toggle-theme material-icons settings-button">edit</i>
                                {!parseInt(localStorage.muteSounds)
                                    ? (<i onClick={() => this.handleToggleMuteSounds()}
                                          className="toggle-theme material-icons settings-button">volume_up</i>)
                                    : (<i onClick={() => this.handleToggleMuteSounds()}
                                          className="toggle-theme material-icons settings-button">volume_off</i>)}
                                {!parseInt(localStorage.darkThemeSpyfall)
                                    ? (<i onClick={() => this.handleToggleTheme()}
                                          className="toggle-theme material-icons settings-button">brightness_2</i>)
                                    : (<i onClick={() => this.handleToggleTheme()}
                                          className="toggle-theme material-icons settings-button">wb_sunny</i>)}
                            </div>
                            <i className="settings-hover-button material-icons">settings</i>
                            <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                        </div>
                        <CommonRoom state={this.state} app={this}/>
                    </div>
                </div>
            );
        } else return (<div/>);
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
