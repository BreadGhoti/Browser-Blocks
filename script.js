const gravity = 0.5;
         const friction = 0.3;
         const windowFriction = 0.95;
         const trampolineBounceFactor = 0.9;
         const conveyorSpeed = 2;
         const portalCooldown = 2000; // 2 seconds in milliseconds
         const windows = [];
         let portals = [];
         
         function createWindow(isTrampoline = false, isConveyorBelt = false, isPortal = false) {
             const width = Math.floor(Math.random() * 100) + 150;
             const height = Math.floor(Math.random() * 100) + 100;
             let color;
             if (isTrampoline) {
                 color = '#000000';
             } else if (isConveyorBelt) {
                 color = '#808080';
             } else if (isPortal) {
                 color = '#FF00FF'; // Magenta color for portals
             } else {
                 color = `hsl(${Math.random() * 360}, 70%, 50%)`;
             }
             const newWindow = window.open('', '', `width=${width},height=${height},resizable=yes`);
             
             newWindow.document.write(`
                 <html>
                 <head>
                     <title>${isTrampoline ? 'Trampoline' : isConveyorBelt ? 'Conveyor Belt' : isPortal ? 'Portal' : 'Normal'} Block</title>
                     <style>
                         body {
                             background-color: ${color};
                             display: flex;
                             flex-direction: column;
                             justify-content: center;
                             align-items: center;
                             height: 100vh;
                             margin: 0;
                             font-family: Arial, sans-serif;
                             color: ${isTrampoline || isConveyorBelt || isPortal ? 'white' : 'black'};
                             font-size: 18px;
                             user-select: none;
                             cursor: grab;
                         }
                         body:active {
                             cursor: grabbing;
                         }
                         button {
                             font-size: 14px;
                             padding: 5px 10px;
                         }
                         #cooldown {
                             font-size: 24px;
                             font-weight: bold;
                         }
                     </style>
                 </head>
                 <body>
                     ${isConveyorBelt ? '<button id="changeDirection">&#8635;</button>' : 
                       isPortal ? '<div id="cooldown">Ready</div>' :
                       `<div>${isTrampoline ? 'Boing!' : 'Block'}</div>`}
                 </body>
                 </html>
             `);
         
             const windowData = {
                 window: newWindow,
                 width: width,
                 height: height,
                 x: Math.round(Math.random() * (window.screen.availWidth - width)),
                 y: Math.round(Math.random() * (window.screen.availHeight - height)),
                 vx: 0,
                 vy: 0,
                 isDragging: false,
                 lastX: 0,
                 lastY: 0,
                 offsetX: 0,
                 offsetY: 0,
                 mass: width * height / 10000,
                 lastFocusTime: Date.now(),
                 isTrampoline: isTrampoline,
                 isConveyorBelt: isConveyorBelt,
                 isPortal: isPortal,
                 conveyorDirection: 'right',
                 lastTeleportTime: 0
             };
         
             newWindow.moveTo(windowData.x, windowData.y);
             newWindow.focus();
         
             newWindow.document.body.addEventListener('mousedown', (e) => {
                 windowData.isDragging = true;
                 windowData.offsetX = e.screenX - windowData.x;
                 windowData.offsetY = e.screenY - windowData.y;
                 windowData.lastX = e.screenX;
                 windowData.lastY = e.screenY;
                 windowData.vx = 0;
                 windowData.vy = 0;
                 windowData.lastFocusTime = Date.now();
             });
         
             newWindow.document.addEventListener('mousemove', (e) => {
                 if (windowData.isDragging) {
                     windowData.x = e.screenX - windowData.offsetX;
                     windowData.y = e.screenY - windowData.offsetY;
                     newWindow.moveTo(windowData.x, windowData.y);
         
                     windowData.vx = e.screenX - windowData.lastX;
                     windowData.vy = e.screenY - windowData.lastY;
                     windowData.lastX = e.screenX;
                     windowData.lastY = e.screenY;
                 }
             });
         
             newWindow.document.addEventListener('mouseup', () => {
                 windowData.isDragging = false;
                 windowData.vx *= 5;
                 windowData.vy *= 5;
             });
         
             newWindow.addEventListener('blur', () => {
                 windowData.isDragging = false;
             });
         
             newWindow.addEventListener('resize', () => {
                 updateWindowSize(windowData);
             });
         
             if (isConveyorBelt) {
                 newWindow.document.getElementById('changeDirection').addEventListener('click', () => {
                     const directions = ['right', 'down', 'left', 'up'];
                     const currentIndex = directions.indexOf(windowData.conveyorDirection);
                     windowData.conveyorDirection = directions[(currentIndex + 1) % directions.length];
                 });
             }
         
             windows.push(windowData);
             return windowData;
         }
         
         function createPortals() {
             if (portals.length === 2) {
                 portals.forEach(portal => portal.window.close());
                 portals = [];
             }
             
             const portal1 = createWindow(false, false, true);
             const portal2 = createWindow(false, false, true);
             
             portals = [portal1, portal2];
         }
         
         function updateWindowSize(windowData) {
             const newWidth = windowData.window.outerWidth;
             const newHeight = windowData.window.outerHeight;
             const dx = newWidth - windowData.width;
             const dy = newHeight - windowData.height;
         
             windowData.x -= dx / 2;
             windowData.y -= dy / 2;
         
             windowData.width = newWidth;
             windowData.height = newHeight;
             windowData.mass = windowData.width * windowData.height / 10000;
         
             windowData.x = Math.max(0, Math.min(windowData.x, window.screen.availWidth - windowData.width));
             windowData.y = Math.max(0, Math.min(windowData.y, window.screen.availHeight - windowData.height));
         
             windowData.window.moveTo(Math.round(windowData.x), Math.round(windowData.y));
         }
         
         function checkCollision(a, b) {
             return a.x < b.x + b.width &&
                    a.x + a.width > b.x &&
                    a.y < b.y + b.height &&
                    a.y + a.height > b.y;
         }
         
         function resolveCollision(a, b) {
             if (a.isPortal || b.isPortal) {
                 const portalWindow = a.isPortal ? a : b;
                 const teleportingWindow = a.isPortal ? b : a;
                 
                 if (!teleportingWindow.isPortal) {
                     const otherPortal = portals.find(portal => portal !== portalWindow);
                     if (otherPortal && Date.now() - teleportingWindow.lastTeleportTime > portalCooldown) {
                         teleportingWindow.x = otherPortal.x + (otherPortal.width - teleportingWindow.width) / 2;
                         teleportingWindow.y = otherPortal.y + (otherPortal.height - teleportingWindow.height) / 2;
                         teleportingWindow.window.moveTo(Math.round(teleportingWindow.x), Math.round(teleportingWindow.y));
                         teleportingWindow.lastTeleportTime = Date.now();
                     }
                 }
                 return;
             }
         
             if (a.isTrampoline || b.isTrampoline) {
                 const trampolineWindow = a.isTrampoline ? a : b;
                 const bouncingWindow = a.isTrampoline ? b : a;
         
                 if (bouncingWindow.y + bouncingWindow.height > trampolineWindow.y &&
                     bouncingWindow.y < trampolineWindow.y) {
                     bouncingWindow.vy = -Math.abs(bouncingWindow.vy) * trampolineBounceFactor;
                     bouncingWindow.y = trampolineWindow.y - bouncingWindow.height;
                 }
             } else {
                 const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
                 const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
         
                 if (overlapX < overlapY) {
                     const tempVx = a.vx;
                     a.vx = b.vx;
                     b.vx = tempVx;
                     if (a.x < b.x) {
                         a.x = b.x - a.width;
                     } else {
                         a.x = b.x + b.width;
                     }
                 } else {
                     const tempVy = a.vy;
                     a.vy = b.vy;
                     b.vy = tempVy;
                     if (a.y < b.y) {
                         a.y = b.y - a.height;
                     } else {
                         a.y = b.y + b.height;
                     }
                 }
         
                 const restitution = 0.8;
                 a.vx *= restitution * windowFriction;
                 a.vy *= restitution * windowFriction;
                 b.vx *= restitution * windowFriction;
                 b.vy *= restitution * windowFriction;
         
                 // Apply conveyor belt effect after collision
                 if (a.isConveyorBelt || b.isConveyorBelt) {
                     const conveyorWindow = a.isConveyorBelt ? a : b;
                     const movingWindow = a.isConveyorBelt ? b : a;
         
                     switch (conveyorWindow.conveyorDirection) {
                         case 'right':
                             movingWindow.vx += conveyorSpeed;
                             break;
                         case 'left':
                             movingWindow.vx -= conveyorSpeed;
                             break;
                         case 'down':
                             movingWindow.vy += conveyorSpeed;
                             break;
                         case 'up':
                             movingWindow.vy -= conveyorSpeed;
                             break;
                     }
                 }
             }
         }
         
         function updatePortalCooldown() {
         portals.forEach(portal => {
         const cooldownElement = portal.window.document.getElementById('cooldown');
         if (cooldownElement) {
             const timeLeft = Math.max(0, Math.ceil((portalCooldown - (Date.now() - portal.lastTeleportTime)) / 1000));
             cooldownElement.textContent = timeLeft > 0 ? `Cooldown: ${timeLeft}s` : 'Ready';
         }
         });
         }
         
         function animate() {
             windows.forEach((windowData, index) => {
                 if (windowData.window.closed) {
                     windows.splice(index, 1);
                     return;
                 }
         
                 updateWindowSize(windowData);
         
                 if (!windowData.isDragging) {
                     const oldX = windowData.x;
                     const oldY = windowData.y;
         
                     windowData.vy += gravity;
                     windowData.x += windowData.vx;
                     windowData.y += windowData.vy;
         
                     windowData.vx *= 0.98;
         
                     if (windowData.x < 0 || windowData.x + windowData.width > window.screen.availWidth) {
                         windowData.vx *= -0.8;
                         windowData.x = Math.max(0, Math.min(windowData.x, window.screen.availWidth - windowData.width));
                     }
         
                     if (windowData.y < 0) {
                         windowData.y = 0;
                         windowData.vy *= -0.8;
                     }
         
                     if (windowData.y + windowData.height > window.screen.availHeight) {
                         windowData.y = window.screen.availHeight - windowData.height;
                         windowData.vy *= -friction;
                         
                         if (Math.abs(windowData.vy) < 0.5) {
                             windowData.vy = 0;
                         }
                     }
         
                     for (let i = 0; i < windows.length; i++) {
                         if (i !== index) {
                             const otherWindow = windows[i];
                             if (checkCollision(windowData, otherWindow)) {
                                 resolveCollision(windowData, otherWindow);
                             }
                         }
                     }
         
                     windowData.window.moveTo(Math.round(windowData.x), Math.round(windowData.y));
                 }
         
                 if (Date.now() - windowData.lastFocusTime > 100) {
                     windowData.window.focus();
                     windowData.lastFocusTime = Date.now();
                 }
             });
         
             updatePortalCooldown();
             requestAnimationFrame(animate);
         }
         
         document.getElementById('createWindow').addEventListener('click', () => createWindow(false));
         document.getElementById('createTrampoline').addEventListener('click', () => createWindow(true));
         document.getElementById('createConveyorBelt').addEventListener('click', () => createWindow(false, true));
         document.getElementById('createPortals').addEventListener('click', createPortals);
         
         animate();
