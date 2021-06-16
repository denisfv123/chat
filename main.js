const apiUrl = 'http://localhost:3000';
let haveTypingEvent = false;
			let token = '';
			let myId = '';
			let recipientId = '';
			let recepientName = '';
			let chatId = '';
			let socket = null;
			let dialog = null;
			let form = null;
			let area = null;
			let chatsList = null;
			let usersList = null;
			const root = document.getElementById('root');
			const createChatBtn = document.getElementById('createChat');
			const requestsChatBtn = document.getElementById('chatsRequests');
			const sendReqToJoinStream = document.getElementById('sendReq');
			const cancelReqToJoinStream = document.getElementById('cancelReq');
			const confirmReqToJoinStream = document.getElementById('confirmReq');

			const leaveStreamBtn = document.getElementById('leaveStream');

			const me = document.getElementById('myUser');
			let confirmTimer;
			let confirmUserId = null;

			const ConfirmTrueBtn = document.getElementById('CnfirmTrue');
			const ConfirmFalseBtn = document.getElementById('CnfirmFalse');

			var modal = document.getElementById('myModal');
			var btn = document.getElementById('myBtn');
			var span = document.getElementsByClassName('close')[0];

			let confirmYes;
			let confirmNo;

			const dialogListener = (event) => {
				if (event.target.nodeName !== 'SPAN') return;
				const messageNode = event.target;
				if (messageNode.dataset.seller !== myId) return;
				messageNode.style.backgroundColor = '#a4a86c3a';
				messageNode.style.color = '#fff';
				area.value = messageNode.textContent;
				area.dataset.messageid = messageNode.id;
			};

			const formListener = (event) => {
				event.preventDefault();

				socket.emit('send-message', { text: area.value }, (savedMessage) => {
					console.log('savedMessage');
					console.log(savedMessage);
					let senderPrefix = '';
					const lastMessage = dialog.lastChild;

					dialog.insertAdjacentHTML(
						'beforeend',
						`<li class="dialog-item">
							${myId}
							<span class="text" id="${savedMessage._id}" data-seller=${myId}>${savedMessage.text}</span>
						</li>`,
					);

					area.value = '';
				});
			};

			const areaListener = (event) => {
				console.log('areaListener');
				console.log('chatId :>> ', chatId);
				console.log('recipientIdf :>> ', recipientId);
				socket.emit('typing', { chatId, recipientId });
			};

			const chatsListener = (event) => {
				console.log('chatsListener');
				if (event.target.nodeName !== 'BUTTON') return;
				chatId = event.target.id;
				console.log('chatId :>> ', chatId);
				recipientId = event.target.dataset.recipient;
				chatsList.removeEventListener('click', chatsListener);
				root.innerHTML = `
						<h1 id="headline">User</h1>
						<ul id="dialog"></ul>
						<form action="" class="typing" id="typeForm">
							<textarea rows="4" cols="45" name="text" class="type" id="area"></textarea>
							<button type="submit" class="submit">Send</button>
						</form>`;
				dialog = document.getElementById('dialog');
				dialog.addEventListener('click', dialogListener);
				form = document.getElementById('typeForm');
				area = document.getElementById('area');
				axios({
					method: 'GET',
					url: `${apiUrl}/users/${recipientId}`,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
						Authorization: `Bearer ${token}`,
					},
				}).then(({ data }) => {
					console.log('chatsListener2');
					const profile = data.data;
					document.getElementById('headline').textContent = profile.email;
					recepientName = profile.userName;
				});
			};

			const chatRequestsListener = (event) => {
				console.log('chatRequestsListener');
				if (event.target.nodeName !== 'BUTTON') return;
				chatId = event.target.id;
				socket.emit('confirm-chat-request', { id: chatId }, () => {
					clearRoot();
					getChats('last-chats');
				});
			};

			const usersListListener = (event) => {
				console.log('usersListListener');
				chatId = event.target.id;

				root.innerHTML = `
					<h1 id="headline">User</h1>
					<ul id="dialog"></ul>
					<form action="" class="typing" id="typeForm">
						<textarea rows="4" cols="45" name="text" class="type" id="area"></textarea>
						<button type="submit" class="submit">Send</button>
					</form>`;
				dialog = document.getElementById('dialog');
				form = document.getElementById('typeForm');
				area = document.getElementById('area');

				axios({
					method: 'GET',
					url: `${apiUrl}/users/me`,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
						Authorization: `Bearer ${token}`,
					},
				}).then(({ data }) => {
					console.log('result event');
					const { data: user } = data;
					console.log('user :>> ', user);
					myId = user.userName;
					me.textContent = `me: ${user.email}`;

					socket.emit('open-chat', { channelId: chatId, limit: 100, skip: 0 }, (res) => {
						console.log('open-chat');
						console.log(res);


						res.messages.forEach((message) => {
							console.log('message');
							console.log(message);

							let senderPrefix = '';
							const lastMessage = dialog.lastChild;

							dialog.insertAdjacentHTML(
								'beforeend',
								`<li  class="dialog-item">
									${message.userName}
									<span class="text" id="${message._id}" data-seller=${message.userName}>${message.text}</span>
								</li>`,
							);
							return;
						});

						form.addEventListener('submit', formListener);
					});
				});
			};

			sendReqToJoinStream.addEventListener('click', (event) => {
				event.preventDefault();

				socket.emit('request-to-join-stream', {}, (res) => {
					console.log('request-to-join-stream');
					console.log(res);
				});
			});

			cancelReqToJoinStream.addEventListener('click', (event) => {
				event.preventDefault();

				socket.emit('cancel-my-req-join-to-stream', {}, (res) => {
					console.log('cancel-my-req-join-to-stream');
					console.log(res);
				});
			});

			createChatBtn.addEventListener('click', (event) => {
				axios({
					method: 'GET',
					url: `${apiUrl}/channels?skip=0&limit=100`,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
						Authorization: `Bearer ${token}`,
					},
				}).then(({ data }) => {
					if (chatId) {
						socket.emit('leave-chat', {}, (res) => {
							console.log('leave-chat');
							console.log(res);
						});
						chatId = null;
					}
					clearRoot();
					const channels = data.data.filter((channel) => channel._id !== myId);
					const userListStr = channels.reduce((acc, channel) => {
						acc += `<li class="users-list--item"><span>${channel.title}</span><button class="open-chat" id="${channel._id}">OpenChat</button></li>`;
						return acc;
					}, '');
					root.innerHTML = `<ul id="usersList" class="users-list">${userListStr}</ul>`;
					usersList = document.getElementById('usersList');
					usersList.addEventListener('click', usersListListener);
				});
			});

			me.addEventListener('click', (event) => {
				clearRoot();
				getChats('last-chats');
			});

			function clearRoot() {
				if (chatId) {
					socket.emit('close-chat', { id: chatId });
					chatId = null;
				}
				if (usersList) {
					usersList.removeEventListener('click', usersListListener);
					usersList = null;
				}
				if (chatsList) {
					chatsList.removeEventListener('click', chatsListener);
					chatsList = null;
				}
				if (form) {
					form.removeEventListener('submit', formListener);
					form = null;
				}
				if (area) {
					area.removeEventListener('input', areaListener);
					area = null;
				}
			}

			function initClient(token, cb) {
				socket = io('http://127.0.0.1:3000/channels-chat', {
					transportOptions: {
						polling: {
							extraHeaders: {
								Authorization: `Bearer ${token}`,
							},
						},
					},
				});

				socket.on('connect', function () {
					console.log('Connected:');
					console.log('socket.id :>> ', socket.id);
					// socket.emit('sub-on-update');

					axios({
						method: 'GET',
						url: 'http://127.0.0.1:3000/users/me',
						headers: {
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
							Authorization: `Bearer ${token}`,
						},
					}).then(({ data }) => {
						console.log('result event');

						const { data: user } = data;
						// if (!user.streamId) {
						// 	return alert('not-have-stream');
						// }
						// const follow =

						myId = user.userName;
						me.textContent = `me: ${user.userName}`;
						const channelId = prompt('channelId');
						chatId = channelId || '60c1b6d0bb4277330756fa9f';
						socket.emit('open-chat', { channelId: '60c1b6d0bb4277330756fa9f', limit: 100, skip: 0 }, (res) => {
							root.innerHTML = `
					<h1 id="headline">User</h1>
					<ul id="dialog"></ul>
					<form action="" class="typing" id="typeForm">
						<textarea rows="4" cols="45" name="text" class="type" id="area"></textarea>
						<button type="submit" class="submit">Send</button>
					</form>`;
							dialog = document.getElementById('dialog');
							form = document.getElementById('typeForm');
							area = document.getElementById('area');
							console.log('open-chat');
							console.log(res);

							res.messages.forEach((message) => {
								let senderPrefix = '';
								const lastMessage = dialog.lastChild;

								dialog.insertAdjacentHTML(
									'beforeend',
									`<li  class="dialog-item">
									${message.userName}
									<span class="text" id="${message._id}" data-seller=${message.userName}>${message.text}</span>
								</li>`,
								);
								return;
							});

							form.addEventListener('submit', formListener);
							console.log('open-stream');
							socket.emit('open-stream', { }, (token) => {
								console.log('token open-stream:>> ', token);
							});
						});
					});
					cb(socket);
				});
				socket.on('on-error', function (data) {
					console.log('Error');
					console.log(data);
				});
				socket.on('new-message', function (data) {
					console.log('new-message');
					console.log(data);
					console.log('11111111111111111');

					let senderPrefix = '';
					const lastMessage = dialog.lastChild;

					if (data.message.userName !== myId) {
						dialog.insertAdjacentHTML(
							'beforeend',
							`<li class="dialog-item">
								${data.message.userName}
								<span class="text" id="${data.message._id}" data-seller=${data.message.userName}>${data.message.text}</span>
							</li>`,
						);
					}
				});
				socket.on('join-to-stream', function (data) {
					console.log('join-to-stream');
					console.log(data);
					console.log(Object.keys(data));
					let isConfirm;
					modal.style.display = 'block';
					confirmUserId = data.userId;
					confirmTimer = setTimeout((res) => {
						modal.style.display = 'none';
						socket.emit('confirm-join-to-stream', { confirm: false, userId: data.userId }, (res) => {
							console.log('confirm-join-to-stream');
							console.log(res);
						});
					}, 10000);
					// confirmTimer = setTimeout(() => {
					// 	if(confirmYes) isConfirm = true; else isConfirm = false;
					// 	socket.emit('confirm-join-to-stream', { confirm: isConfirm, userId: data.userId }, (res) => {
					// 		console.log('confirm-join-to-stream');
					// 		console.log(res);
					// 	});
					// }, 5000);
				});
				socket.on('start-stream-on-channel', (data) => {
					console.log('start-stream-on-channel');
					console.log(data);
				});
				socket.on('finish-stream-on-channel', (data) => {
					console.log('finish-stream-on-channel');
					console.log(data);
				});
				socket.on('viewers-count', (data) => {
					console.log('viewers-count');
					console.log(data);
				});
				socket.on('update-streamers', (data) => {
					console.log('updated-streamers');
					console.log(data);
				});
				socket.on('join-to-stream-response', function (data) {
					console.log('join-to-stream-response');
					// socket.emit('cancel-join-to-stream', { confirm: data.confirm, adminId: myId }, (res) => {
					// 	console.log('cancel-join-to-stream');
					// 	console.log(res);
					// });
					console.log(data);
					if (!data.confirm) {
						console.log('data.isConfirmedAdmin: ' + data.isConfirmedAdmin);
						if (!data.isConfirmedAdmin) {
							console.log('confirmTimer: ' + confirmTimer);
							clearTimeout(confirmTimer);
							modal.style.display = 'none';
						} else {
							console.log('emit cancel-join-to-stream');
							// socket.emit('cancel-join-to-stream', {}, (res) => {
							// 	console.log('cancel-join-to-stream');
							// 	console.log(res);
							// });
						}
					}
					console.log('data.confirm: ' + data.confirm);
					if (data.confirm) {
						socket.emit('client-join-to-stream', { allowStreamToken: data.allowStreamToken }, (res) => {
							console.log('client-join-to-stream');
							console.log(res);
						});
					}
				});
				socket.on('disconnect', () => {
					if (chatId) {
						socket.emit('leave-chat', {}, (res) => {
							console.log('leave-chat');
							console.log(res);
						});
						chatId = null;
					}
				});
			}
			// const prompted = prompt('Type token', '');
			// const access =
			// 	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwYWQzZTAxNGQ1YTM4MDA0MGQ1ZDM0YSIsImVtYWlsIjoieWFyb3NsYXYubXluY2hlbmtvQG9uaXgtc3lzdGVtcy5jb20iLCJyb2xlIjoidXNlciIsInVzZXJOYW1lIjoiQG9uaXhfbXluIiwiaWF0IjoxNjIyMDI3NTY5fQ.BkYP9RE3mGIu2a-Wuo_F8SvMqeSpc7kaDOMpnahGzcM';
			// token = prompted;
			initClient(token, (initedSocket) => {
				socket = initedSocket;
			});

			ConfirmTrueBtn.onclick = function () {
				socket.emit('confirm-join-to-stream', { confirm: true, userId: confirmUserId }, (res) => {
					console.log('confirm-join-to-stream');
					console.log(res);
				});
				modal.style.display = 'none';
				clearTimeout(confirmTimer);
			};

			ConfirmFalseBtn.onclick = function () {
				socket.emit('confirm-join-to-stream', { confirm: false, userId: confirmUserId }, (res) => {
					console.log('confirm-join-to-stream');
					console.log(res);
				});
				modal.style.display = 'none';
				clearTimeout(confirmTimer);
			};

			leaveStreamBtn.onclick = function () {
				socket.emit('leave-chat', {}, (res) => {
					console.log('leave-chat');
					console.log(res);
				});
			}





const login = () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (email && password) {
    axios(`${apiUrl}/auth/sign-in`, {
      email,
      password,
      firebaseToken: '',
    })
      .then((data) => {
        console.log(data);
        // token = data.accessToken;
      })
      .catch((e) => {
        console.log(e);
      })
  }
}