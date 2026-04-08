const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let bleDevice = null;
let bleServer = null;
let dmxCharacteristic = null;
let isConnected = false;

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const connectionStatus = document.getElementById('connectionStatus');
const lcdScreen = document.getElementById('lcdScreen');
const lcdHint = document.getElementById('lcdHint');
const keys = document.querySelectorAll('.key');
const activeChannelsGrid = document.getElementById('activeChannelsGrid');
const masterSlider = document.getElementById('masterSlider');
const blackoutBtn = document.getElementById('blackoutBtn');

let blackoutState = false;
let previousMasterValue = 255;

let localChannels = new Array(513).fill(0);
let inputBuffer = "";

// ----------------------------------------------------
// Page Navigation Logic
// ----------------------------------------------------
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all nav items and pages
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// ----------------------------------------------------
// NumPad Logic (General Page)
// ----------------------------------------------------
keys.forEach(key => {
    key.addEventListener('click', () => {
        const val = key.dataset.val;
        
        if (val === 'C') {
            inputBuffer = "";
            lcdHint.textContent = "Cleared";
        } else if (val === 'ENTER') {
            processCommand(inputBuffer);
            inputBuffer = ""; // clear after enter
        } else if (val === '@' || val === 'THRU') {
            inputBuffer += ` ${val} `;
        } else if (val === 'FULL') {
            if(!inputBuffer.includes('@')) {
                inputBuffer += ` @ 255`;
            }
        } else {
            inputBuffer += val;
        }
        updateDisplay();
    });
});

function updateDisplay() {
    lcdScreen.textContent = inputBuffer || "_";
}

function processCommand(cmd) {
    if (!cmd.trim()) return;
    try {
        let parts = cmd.split('@');
        if (parts.length !== 2) throw new Error("Missing @ symbol");
        
        let targetStr = parts[0].trim();
        let valStr = parts[1].trim();
        let value = parseInt(valStr, 10);
        
        if (isNaN(value) || value < 0 || value > 255) throw new Error("Invalid value (0-255)");
        
        let targets = [];
        if (targetStr.includes('THRU')) {
            let tparts = targetStr.split('THRU');
            if (tparts.length !== 2) throw new Error("Invalid THRU syntax");
            let start = parseInt(tparts[0].trim(), 10);
            let end = parseInt(tparts[1].trim(), 10);
            
            if (isNaN(start) || isNaN(end) || start < 1 || end > 512) {
                throw new Error("Invalid Channel range (1-512)");
            }
            if (start > end) {
                let temp = start; start = end; end = temp;
            }
            for (let i = start; i <= end; i++) {
                targets.push(i);
            }
        } else {
            let ch = parseInt(targetStr, 10);
            if (isNaN(ch) || ch < 1 || ch > 512) {
                throw new Error("Invalid Channel (1-512)");
            }
            targets.push(ch);
        }
        
        // Execute commands
        targets.forEach(ch => {
            localChannels[ch] = value;
            sendDmxCommand(ch, value);
        });
        
        renderActiveChannels();
        lcdHint.textContent = `Sent: ${cmd}`;
        
    } catch (e) {
        lcdHint.textContent = "Error: " + e.message;
    }
}

function renderActiveChannels() {
    activeChannelsGrid.innerHTML = '';
    let hasActive = false;
    for (let i = 1; i <= 512; i++) {
        if (localChannels[i] > 0) {
            hasActive = true;
            const el = document.createElement('div');
            el.className = 'active-channel';
            el.innerHTML = `<span class="act-ch-num">CH ${i}</span><span class="act-ch-val">${localChannels[i]}</span>`;
            activeChannelsGrid.appendChild(el);
        }
    }
    if (!hasActive) {
        activeChannelsGrid.innerHTML = '<div class="empty-state">No Active Channels</div>';
    }
}

// ----------------------------------------------------
// Master Controls
// ----------------------------------------------------
let currentDimmerChannel = 8; // dynamically updated based on active fixture

masterSlider.addEventListener('input', (e) => {
    if (blackoutState) {
        blackoutState = false;
        blackoutBtn.textContent = 'BLACKOUT';
        blackoutBtn.classList.replace('btn-primary', 'btn-danger');
    }
    setFixtureChannel(currentDimmerChannel, e.target.value); 
});

blackoutBtn.addEventListener('click', () => {
    blackoutState = !blackoutState;
    if (blackoutState) {
        previousMasterValue = masterSlider.value;
        masterSlider.value = 0;
        blackoutBtn.textContent = 'RESTORE';
        blackoutBtn.classList.replace('btn-danger', 'btn-primary');
        setFixtureChannel(currentDimmerChannel, 0);
    } else {
        masterSlider.value = previousMasterValue;
        blackoutBtn.textContent = 'BLACKOUT';
        blackoutBtn.classList.replace('btn-primary', 'btn-danger');
        setFixtureChannel(currentDimmerChannel, previousMasterValue);
    }
});

// ----------------------------------------------------
// Fixture Page Logic (Dynamic Generation)
// ----------------------------------------------------
const fixtureStartAddrInput = document.getElementById('fixtureStartAddr');
const fixtureSelect = document.getElementById('fixtureSelect');
const fixtureControlsGrid = document.getElementById('fixtureControlsGrid');

let currentFixtureKey = "bo1940_23";

function getFixtureStartAddr() {
    let addr = parseInt(fixtureStartAddrInput.value, 10);
    if (isNaN(addr) || addr < 1 || addr > 490) {
        addr = 1;
        fixtureStartAddrInput.value = 1;
    }
    return addr;
}

function setFixtureChannel(chOffset, val) {
    const addr = getFixtureStartAddr();
    const absoluteCh = addr + chOffset - 1;
    if (absoluteCh <= 512) {
        // Find slider and update its visual if we are on that slider
        const slider = document.querySelector(`.fx-slider[data-ch="${chOffset}"]`);
        if (slider) {
            slider.value = val;
            slider.nextElementSibling.textContent = val;
        }
        localChannels[absoluteCh] = val;
        sendDmxCommand(absoluteCh, val);
    }
}

function renderFixtureControls(fixtureKey) {
    fixtureControlsGrid.innerHTML = '';
    const profile = FIXTURE_PROFILES[fixtureKey];
    if (!profile) return;
    
    currentDimmerChannel = profile.dimmerChannel;
    
    profile.groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'control-group' + (group.isColor ? ' color-group' : '');
        
        const title = document.createElement('h3');
        title.textContent = group.name;
        groupDiv.appendChild(title);
        
        group.sliders.forEach(sliderDef => {
            const row = document.createElement('div');
            row.className = 'slider-row';
            
            const label = document.createElement('label');
            label.textContent = sliderDef.label;
            if (sliderDef.cssClass) {
                label.className = sliderDef.cssClass;
            }
            
            const input = document.createElement('input');
            input.type = 'range';
            input.className = 'fx-slider';
            input.setAttribute('data-ch', sliderDef.ch);
            input.min = "0";
            input.max = "255";
            input.value = sliderDef.default !== undefined ? sliderDef.default : 0;
            
            const valDisplay = document.createElement('span');
            valDisplay.className = 'val-display';
            valDisplay.textContent = input.value;
            
            input.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                valDisplay.textContent = val;
                const absoluteCh = getFixtureStartAddr() + sliderDef.ch - 1;
                if (absoluteCh <= 512) {
                    localChannels[absoluteCh] = val;
                    sendDmxCommand(absoluteCh, val);
                    renderActiveChannels();
                }
            });
            
            row.appendChild(label);
            row.appendChild(input);
            row.appendChild(valDisplay);
            groupDiv.appendChild(row);
        });
        
        fixtureControlsGrid.appendChild(groupDiv);
    });
    
    // Macros
    if (profile.macros && profile.macros.length > 0) {
        const lastGroup = fixtureControlsGrid.lastElementChild;
        if (lastGroup) {
            const macroContainer = document.createElement('div');
            macroContainer.className = 'macro-btns';
            
            profile.macros.forEach(mac => {
                const btn = document.createElement('button');
                btn.className = mac.style === 'danger' ? 'macro-btn fx-btn-danger' : 'macro-btn fx-btn';
                btn.textContent = mac.label;
                
                btn.addEventListener('click', () => {
                    if (mac.action === 'custom') {
                        mac.handler(setFixtureChannel);
                    } else if (mac.action === 'reset') {
                        setFixtureChannel(mac.ch, mac.val);
                        if (mac.duration) {
                            setTimeout(() => {
                                setFixtureChannel(mac.ch, 0); // reset implicitly to 0 after duration
                            }, mac.duration);
                        }
                    }
                    renderActiveChannels();
                });
                
                macroContainer.appendChild(btn);
            });
            
            lastGroup.appendChild(macroContainer);
        }
    }
}

// Initial setup
function initFixtures() {
    for (const key in FIXTURE_PROFILES) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = FIXTURE_PROFILES[key].name;
        fixtureSelect.appendChild(option);
    }
    
    fixtureSelect.value = currentFixtureKey;
    renderFixtureControls(currentFixtureKey);
    
    fixtureSelect.addEventListener('change', (e) => {
        currentFixtureKey = e.target.value;
        renderFixtureControls(currentFixtureKey);
    });
}

// Call on load
initFixtures();

// ----------------------------------------------------
// Bluetooth Logic
// ----------------------------------------------------
connectBtn.addEventListener('click', async () => {
    if (isConnected) {
        disconnectBLE();
        return;
    }

    try {
        console.log('Requesting Bluetooth Device...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'J DMX tester' }],
            optionalServices: [SERVICE_UUID]
        });

        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

        console.log('Connecting to GATT Server...');
        bleServer = await bleDevice.gatt.connect();

        console.log('Getting Service...');
        const service = await bleServer.getPrimaryService(SERVICE_UUID);

        console.log('Getting Characteristic...');
        dmxCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        isConnected = true;
        updateUI();
        console.log('Connected!');

        // Send master initialization
        setFixtureChannel(currentDimmerChannel, masterSlider.value);

    } catch (error) {
        console.error('Connection failed!', error);
        alert('連線失敗或使用者取消，請確保藍芽已開啟：\n' + error);
    }
});

function disconnectBLE() {
    if (!bleDevice || !bleDevice.gatt.connected) return;
    bleDevice.gatt.disconnect();
}

function onDisconnected() {
    isConnected = false;
    dmxCharacteristic = null;
    updateUI();
    console.log('Disconnected.');
}

function updateUI() {
    if (isConnected) {
        connectBtn.textContent = 'Disconnect';
        connectBtn.classList.replace('btn-primary', 'btn-danger');
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'status connected';
    } else {
        connectBtn.textContent = 'Connect BLE';
        connectBtn.classList.replace('btn-danger', 'btn-primary');
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'status disconnected';
    }
}

// Queue system to prevent BLE congestion
let commandQueue = [];
let isSending = false;

async function sendDmxCommand(channel, value) {
    if (!isConnected || !dmxCharacteristic) return;

    // Packet format: [Channel_High, Channel_Low, Value]
    const highByte = (channel >> 8) & 0xFF;
    const lowByte = channel & 0xFF;
    const valByte = parseInt(value, 10) & 0xFF;

    const data = new Uint8Array([highByte, lowByte, valByte]);
    
    // Add to queue and process
    commandQueue.push(data);
    processQueue();
}

async function processQueue() {
    if (isSending || commandQueue.length === 0) return;
    isSending = true;

    try {
        if (commandQueue.length > 20) {
           commandQueue = commandQueue.slice(commandQueue.length - 10);
        }

        const data = commandQueue.shift();
        await dmxCharacteristic.writeValueWithoutResponse(data);
        
    } catch (error) {
        console.error('Send error:', error);
    } finally {
        isSending = false;
        // Proceed next
        if (commandQueue.length > 0) {
            setTimeout(processQueue, 5); // small delay to prevent crashing ESP32
        }
    }
}
