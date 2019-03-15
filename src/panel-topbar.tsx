/**
 * Topbar Panel
 *
 * Topbar view - handles the topbar and some generic popups.
 *
 * Also sets up global event listeners.
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license AGPLv3
 */

class PSHeader extends preact.Component<{style: {}}> {
	renderRoomTab(id: RoomID) {
		const room = PS.rooms[id]!;
		const closable = (id === '' || id === 'rooms' ? '' : ' closable');
		const cur = PS.isVisible(room) ? ' cur' : '';
		let className = `roomtab button${room.notifying}${closable}${cur}`;
		let icon = null;
		let title = room.title;
		let closeButton = null;
		switch (room.type) {
		case '':
		case 'mainmenu':
			icon = <i class="fa fa-home"></i>;
			break;
		case 'teambuilder':
			icon = <i class="fa fa-pencil-square-o"></i>;
			break;
		case 'ladder':
			icon = <i class="fa fa-list-ol"></i>;
			break;
		case 'battles':
			icon = <i class="fa fa-caret-square-o-right"></i>;
			break;
		case 'rooms':
			icon = <i class="fa fa-plus" style="margin:7px auto -6px auto"></i>;
			title = '';
			break;
		case 'battle':
			let idChunks = id.substr(7).split('-');
			let formatid;
			// TODO: relocate to room implementation
			if (idChunks.length <= 1) {
				if (idChunks[0] === 'uploadedreplay') formatid = 'Uploaded Replay';
			} else {
				formatid = idChunks[idChunks.length - 2];
			}
			if (!title) {
				let battle = (room as any).battle;
				let p1 = (battle && battle.p1 && battle.p1.name) || '';
				let p2 = (battle && battle.p2 && battle.p2.name) || '';
				if (p1 && p2) {
					title = '' + p1 + ' v. ' + p2;
				} else if (p1 || p2) {
					title = '' + p1 + p2;
				} else {
					title = '(empty room)';
				}
			}
			icon = <i class="text">{formatid}</i>;
			break;
		case 'chat':
			icon = <i class="fa fa-comment-o"></i>;
			break;
		case 'html':
		default:
			if (title.charAt(0) === '[') {
				let closeBracketIndex = title.indexOf(']');
				if (closeBracketIndex > 0) {
					icon = <i class="text">{title.slice(1, closeBracketIndex)}</i>;
					title = title.slice(closeBracketIndex + 1);
					break;
				}
			}
			icon = <i class="fa fa-file-text-o"></i>;
			break;
		}
		if (closable) {
			closeButton = <button class="closebutton" name="closeRoom" value={id} aria-label="Close">
				<i class="fa fa-times-circle"></i>
			</button>;
		}
		return <li><a class={className} href={`/${id}`} draggable={true}>{icon} <span>{title}</span></a>{closeButton}</li>;
	}
	render() {
		return <div id="header" class="header" style={this.props.style}>
			<img
				class="logo"
				src="https://play.pokemonshowdown.com/pokemonshowdownbeta.png"
				srcset="https://play.pokemonshowdown.com/pokemonshowdownbeta@2x.png 2x"
				alt="Pokémon Showdown! (beta)"
				width="146" height="44"
			/>
			<div class="maintabbarbottom"></div>
			<div class="tabbar maintabbar"><div class="inner">
				<ul>
					{this.renderRoomTab('' as RoomID)}
				</ul>
				<ul>
					{PS.leftRoomList.slice(1).map(roomid => this.renderRoomTab(roomid))}
				</ul>
				<ul class="siderooms" style={{float: 'none', marginLeft: PS.leftRoomWidth - 144}}>
					{PS.rightRoomList.map(roomid => this.renderRoomTab(roomid))}
				</ul>
			</div></div>
			<div class="userbar">
				<span class="username" data-name={PS.user.name} style="color:hsl(96,67%,36%);">
					<i class="fa fa-user" style="color:#779EC5"></i> {PS.user.name}
				</span> {}
				<button class="icon button" name="joinRoom" value="volume" title="Sound" aria-label="Sound">
					<i class="fa fa-volume-up"></i>
				</button> {}
				<button class="icon button" name="joinRoom" value="options" title="Options" aria-label="Options">
					<i class="fa fa-cog"></i>
				</button>
			</div>
		</div>;
	}
}

preact.render(<PSMain />, document.body, document.getElementById('ps-frame')!);

/**
 * User popup
 */

class UserRoom extends PSRoom {
	readonly classType: string = 'user';
	userid: ID;
	name: string;
	isSelf: boolean;
	constructor(options: RoomOptions) {
		super(options);
		this.userid = this.id.slice(5) as ID;
		this.isSelf = (this.userid === PS.user.userid);
		this.name = options.username as string || this.userid;
		if (/[a-zA-Z0-9]/.test(this.name.charAt(0))) this.name = ' ' + this.name;
		PS.send(`|/cmd userdetails ${this.userid}`);
	}
}

class UserPanel extends PSRoomPanel<UserRoom> {
	render() {
		const room = this.props.room;
		const user = PS.mainmenu.userdetailsCache[room.userid] || {userid: room.userid, avatar: '[loading]'};
		const name = room.name.slice(1);

		const group = PS.server.getGroup(room.name);
		let groupName: preact.ComponentChild = group.name || null;
		if (group.type === 'punishment') {
			groupName = <span style='color:#777777'>{groupName}</span>;
		}

		const globalGroup = PS.server.getGroup(user.group);
		let globalGroupName: preact.ComponentChild = globalGroup.name && `Global ${globalGroup.name}` || null;
		if (globalGroup.type === 'punishment') {
			globalGroupName = <span style='color:#777777'>{globalGroupName}</span>;
		}
		if (globalGroup.name === group.name) groupName = null;

		let roomsList: preact.ComponentChild = null;
		if (user.rooms) {
			let battlebuf = [];
			let chatbuf = [];
			let privatebuf = [];
			for (let roomid in user.rooms) {
				if (roomid === 'global') continue;
				const curRoom = user.rooms[roomid];
				let roomrank: preact.ComponentChild = null;
				if (!/[A-Za-z0-9]/.test(roomid.charAt(0))) {
					roomrank = <small style="color: #888; font-size: 100%">{roomid.charAt(0)}</small>;
				}
				roomid = toRoomid(roomid);

				if (roomid.substr(0, 7) === 'battle-') {
					const p1 = curRoom.p1!.substr(1);
					const p2 = curRoom.p2!.substr(1);
					const ownBattle = (PS.user.userid === toUserid(p1) || PS.user.userid === toUserid(p2));
					const roomLink = <a href={`/${roomid}`} class={'ilink' + (ownBattle || roomid in PS.rooms ? ' yours' : '')}
						title={`${p1 || '?'} v. ${p2 || '?'}`}
					>{roomrank}{roomid.substr(7)}</a>;
					if (curRoom.isPrivate) {
						if (privatebuf.length) privatebuf.push(', ');
						privatebuf.push(roomLink);
					} else {
						if (battlebuf.length) battlebuf.push(', ');
						battlebuf.push(roomLink);
					}
				} else {
					const roomLink = <a href={`/${roomid}`} class={'ilink' + (roomid in PS.rooms ? ' yours' : '')}>
						{roomrank}{roomid}
					</a>;
					if (curRoom.isPrivate) {
						if (privatebuf.length) privatebuf.push(", ");
						privatebuf.push(roomLink);
					} else {
						if (chatbuf.length) chatbuf.push(', ');
						chatbuf.push(roomLink);
					}
				}
			}
			if (battlebuf.length) battlebuf.unshift(<br />, <em>Battles:</em>, " ");
			if (chatbuf.length) chatbuf.unshift(<br />, <em>Chatrooms:</em>, " ");
			if (privatebuf.length) privatebuf.unshift(<br />, <em>Private rooms:</em>, " ");
			if (battlebuf.length || chatbuf.length || privatebuf.length) {
				roomsList = <small class="rooms">{battlebuf}{chatbuf}{privatebuf}</small>;
			}
		} else if (user.rooms === false) {
			roomsList = <strong class="offline">OFFLINE</strong>;
		}

		const isSelf = user.userid === PS.user.userid;

		return <PSPanelWrapper room={room}>
			<div class="userdetails">
				{user.avatar !== '[loading]' &&
					<img
						class={'trainersprite' + (room.isSelf ? ' yours' : '')}
						src={Dex.resolveAvatar('' + (user.avatar || 'unknown'))}
					/>
				}
				<strong><a href={`//pokemonshowdown.com/users/${user.userid}`} target="_blank">{name}</a></strong><br />
				{groupName && <small>{groupName}</small>}
				{groupName && globalGroupName && <br />}
				{globalGroupName && <small>{globalGroupName}</small>}
				{roomsList}
			</div>
			{isSelf || !PS.user.named ?
				<p class="buttonbar">
					<button class="button disabled" disabled>Challenge</button> {}
					<button class="button disabled" disabled>Chat</button>
				</p>
			:
				<p class="buttonbar">
					<button class="button" name="challenge">Challenge</button> {}
					<button class="button" name="pm">Chat</button> {}
					<button class="button" name="userOptions">{'\u2026'}</button>
				</p>
			}
			{isSelf && <hr />}
			{isSelf && <p class="buttonbar" style="text-align: right">
				<button class="button" name="login"><i class="fa fa-pencil"></i> Change name</button> {}
				<button class="button" name="logout"><i class="fa fa-power-off"></i> Log out</button>
			</p>}
		</PSPanelWrapper>;
	}
}

PS.roomTypes['user'] = {
	Model: UserRoom,
	Component: UserPanel,
};
