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

function clearAllDmxSignals() {
    for (let i = 1; i <= 512; i++) {
        if (localChannels[i] > 0) {
            localChannels[i] = 0;
            sendDmxCommand(i, 0);
        }
    }
    
    // Clear General Page Buffer
    inputBuffer = "";
    updateDisplay();
    
    // Reset Master Slider
    masterSlider.value = 0;
    if (blackoutState) {
        blackoutState = false;
        blackoutBtn.textContent = 'BLACKOUT';
        blackoutBtn.classList.replace('btn-danger', 'btn-primary');
    }
    
    // Reset Fixture Sliders to Default (without sending)
    const sliders = document.querySelectorAll('.fx-slider');
    sliders.forEach(slider => {
        const profile = FIXTURE_PROFILES[currentFixtureKey];
        const ch = parseInt(slider.getAttribute('data-ch'), 10);
        let defaultVal = 0;
        if (profile && profile.groups) {
            for (let g of profile.groups) {
                const s = g.sliders.find(x => x.ch === ch);
                if (s && s.default !== undefined) {
                    defaultVal = s.default;
                    break;
                }
            }
        }
        slider.value = defaultVal;
        if (slider.nextElementSibling && slider.nextElementSibling.classList.contains('val-display')) {
            slider.nextElementSibling.textContent = defaultVal;
        }
    });

    renderActiveChannels();
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Clear all sent signals when switching pages
        clearAllDmxSignals();

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
let lastSelectedChannel = 1;
let lastSelectedValue = 255;

let clearClickCount = 0;
let clearClickTimer = null;

keys.forEach(key => {
    key.addEventListener('click', () => {
        const val = key.dataset.val;
        
        if (val === 'C') {
            inputBuffer = "";
            lcdHint.textContent = "Cleared";
            
            clearClickCount++;
            if (clearClickCount >= 3) {
                clearAllDmxSignals();
                lcdHint.textContent = "All Outputs Cleared";
                clearClickCount = 0;
            }
            
            if (clearClickTimer) clearTimeout(clearClickTimer);
            clearClickTimer = setTimeout(() => {
                clearClickCount = 0;
            }, 600);
            
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
            lastSelectedChannel = ch;
            lastSelectedValue = value;
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
// Quick Tools (Prev/Next/Effects)
// ----------------------------------------------------
const btnPrevCh = document.getElementById('btnPrevCh');
const btnNextCh = document.getElementById('btnNextCh');
const btnAllBlink = document.getElementById('btnAllBlink');
const btnChase = document.getElementById('btnChase');

let activeEffectInterval = null;
let effectState = false;
let chaseIndex = 1;

function stopEffects() {
    if (activeEffectInterval) {
        clearInterval(activeEffectInterval);
        activeEffectInterval = null;
    }
    if(btnAllBlink) btnAllBlink.classList.remove('active-effect');
    if(btnChase) btnChase.classList.remove('active-effect');
}

if(btnPrevCh) {
    btnPrevCh.addEventListener('click', () => {
        stopEffects();
        localChannels[lastSelectedChannel] = 0;
        sendDmxCommand(lastSelectedChannel, 0);
        
        lastSelectedChannel--;
        if (lastSelectedChannel < 1) lastSelectedChannel = 512;
        
        localChannels[lastSelectedChannel] = lastSelectedValue;
        sendDmxCommand(lastSelectedChannel, lastSelectedValue);
        
        lcdHint.textContent = `Moved to CH ${lastSelectedChannel}`;
        renderActiveChannels();
    });
}

if(btnNextCh) {
    btnNextCh.addEventListener('click', () => {
        stopEffects();
        localChannels[lastSelectedChannel] = 0;
        sendDmxCommand(lastSelectedChannel, 0);
        
        lastSelectedChannel++;
        if (lastSelectedChannel > 512) lastSelectedChannel = 1;
        
        localChannels[lastSelectedChannel] = lastSelectedValue;
        sendDmxCommand(lastSelectedChannel, lastSelectedValue);
        
        lcdHint.textContent = `Moved to CH ${lastSelectedChannel}`;
        renderActiveChannels();
    });
}

if(btnAllBlink) {
    btnAllBlink.addEventListener('click', () => {
        if (btnAllBlink.classList.contains('active-effect')) {
            stopEffects();
            clearAllDmxSignals();
            return;
        }
        
        stopEffects();
        clearAllDmxSignals();
        btnAllBlink.classList.add('active-effect');
        
        let sweepIndex = 1;
        
        activeEffectInterval = setInterval(() => {
            // Turn ON the front of the snake
            localChannels[sweepIndex] = 255;
            sendDmxCommand(sweepIndex, 255);
            
            // Turn OFF the tail of the snake (5 channels behind)
            let tailIndex = sweepIndex - 5;
            if (tailIndex < 1) tailIndex += 512; // wrap around
            
            localChannels[tailIndex] = 0;
            sendDmxCommand(tailIndex, 0);
            
            sweepIndex++;
            if (sweepIndex > 512) sweepIndex = 1;
            
            renderActiveChannels();
        }, 80); // Move forward every 80ms
    });
}

if(btnChase) {
    btnChase.addEventListener('click', () => {
        if (btnChase.classList.contains('active-effect')) {
            stopEffects();
            clearAllDmxSignals();
            return;
        }
        
        stopEffects();
        clearAllDmxSignals();
        btnChase.classList.add('active-effect');
        
        chaseIndex = 1;
        activeEffectInterval = setInterval(() => {
            let prev = chaseIndex - 1;
            if (prev < 1) prev = 512;
            localChannels[prev] = 0;
            sendDmxCommand(prev, 0);
            
            localChannels[chaseIndex] = 255;
            sendDmxCommand(chaseIndex, 255);
            
            renderActiveChannels();
            
            chaseIndex++;
            if (chaseIndex > 512) chaseIndex = 1;
        }, 200); // 200ms per step for a slower chase
    });
}

// ----------------------------------------------------
// Master Controls
// ----------------------------------------------------

masterSlider.addEventListener('input', (e) => {
    if (blackoutState) {
        blackoutState = false;
        blackoutBtn.textContent = 'BLACKOUT';
        blackoutBtn.classList.replace('btn-primary', 'btn-danger');
    }
    // Channel 0 can be used by ESP32 as a global brightness multiplier if supported
    sendDmxCommand(0, e.target.value); 
});

blackoutBtn.addEventListener('click', () => {
    blackoutState = !blackoutState;
    if (blackoutState) {
        previousMasterValue = masterSlider.value;
        masterSlider.value = 0;
        blackoutBtn.textContent = 'RESTORE';
        blackoutBtn.classList.replace('btn-danger', 'btn-primary');
        // Actually clear all channels for conventional blackout
        for (let i = 1; i <= 512; i++) {
            if (localChannels[i] > 0) {
                sendDmxCommand(i, 0);
            }
        }
        sendDmxCommand(0, 0);
    } else {
        masterSlider.value = previousMasterValue;
        blackoutBtn.textContent = 'BLACKOUT';
        blackoutBtn.classList.replace('btn-primary', 'btn-danger');
        // Restore active channels
        for (let i = 1; i <= 512; i++) {
            if (localChannels[i] > 0) {
                sendDmxCommand(i, localChannels[i]);
            }
        }
        sendDmxCommand(0, previousMasterValue);
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
    
    // Ensure "Dimmer" group is always rendered first
    const dimmerGroupIndex = profile.groups.findIndex(g => g.name.toLowerCase().includes('dimmer'));
    if (dimmerGroupIndex > 0) {
        const dimmerGroup = profile.groups.splice(dimmerGroupIndex, 1)[0];
        profile.groups.unshift(dimmerGroup);
    }
    
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

// ----------------------------------------------------
// MA2 XML Import Logic
// ----------------------------------------------------
const ma2XmlInput = document.getElementById('ma2XmlInput');
const btnImportMa2 = document.getElementById('btnImportMa2');
const chkSaveMa2 = document.getElementById('chkSaveMa2');
const btnClearMa2Cache = document.getElementById('btnClearMa2Cache');

if (btnImportMa2 && ma2XmlInput) {
    btnImportMa2.addEventListener('click', () => {
        ma2XmlInput.click();
    });

    ma2XmlInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const xmlString = ev.target.result;
            try {
                const profile = parseMA2XML(xmlString, file.name.replace('.xml', ''));
                if (profile && profile.groups.length > 0) {
                    const key = 'ma2_' + Date.now();
                    FIXTURE_PROFILES[key] = profile;
                    
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = profile.name;
                    fixtureSelect.appendChild(option);
                    
                    fixtureSelect.value = key;
                    currentFixtureKey = key;
                    renderFixtureControls(key);
                    
                    if (chkSaveMa2.checked) {
                        saveFixturesToCache();
                    }
                    alert(`成功匯入燈庫: ${profile.name}`);
                } else {
                    alert("無法解析此檔案或找不到通道設定。");
                }
            } catch (err) {
                console.error("XML Parsing Error", err);
                alert("解析 XML 失敗，格式可能不支援。");
            }
        };
        reader.readAsText(file);
        ma2XmlInput.value = '';
    });
}

if (btnClearMa2Cache) {
    btnClearMa2Cache.addEventListener('click', () => {
        if (confirm("確定要清除所有已儲存的 MA2 燈庫嗎？")) {
            localStorage.removeItem('ma2_cached_fixtures');
            location.reload();
        }
    });
}

function saveFixturesToCache() {
    const customFixtures = {};
    for (const key in FIXTURE_PROFILES) {
        if (key.startsWith('ma2_')) {
            const copy = JSON.parse(JSON.stringify(FIXTURE_PROFILES[key]));
            customFixtures[key] = copy;
        }
    }
    localStorage.setItem('ma2_cached_fixtures', JSON.stringify(customFixtures));
    updateClearCacheButton();
}

function loadFixturesFromCache() {
    try {
        const cached = localStorage.getItem('ma2_cached_fixtures');
        if (cached) {
            const customFixtures = JSON.parse(cached);
            let hasCache = false;
            for (const key in customFixtures) {
                const profile = customFixtures[key];
                // Macros are no longer needed for blackout
                profile.macros = [];
                FIXTURE_PROFILES[key] = profile;
                hasCache = true;
            }
            if(hasCache && chkSaveMa2) {
                chkSaveMa2.checked = true;
            }
        }
    } catch(e) {
        console.error("Failed to load cached fixtures", e);
    }
    updateClearCacheButton();
}

function updateClearCacheButton() {
    if (!btnClearMa2Cache) return;
    const cached = localStorage.getItem('ma2_cached_fixtures');
    if (cached && Object.keys(JSON.parse(cached)).length > 0) {
        btnClearMa2Cache.style.display = 'inline-block';
    } else {
        btnClearMa2Cache.style.display = 'none';
    }
}

function parseMA2XML(xmlString, baseName) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Invalid XML");
    }

    const profile = {
        name: baseName + " (MA2 Import)",
        channelCount: 0,
        dimmerChannel: 1,
        groups: [],
        macros: []
    };

    const channels = [];

    const addChannel = (chStr, attrStr) => {
        const ch = parseInt(chStr, 10);
        if (!isNaN(ch) && ch > 0) {
            channels.push({ ch, label: attrStr, attribute: attrStr.toLowerCase() });
            if (ch > profile.channelCount) profile.channelCount = ch;
        }
    };

    // Extract Coarse, Fine, DMX, or Offset allocations
    const allElems = xmlDoc.getElementsByTagName("*");
    for (let i = 0; i < allElems.length; i++) {
        const el = allElems[i];
        let ch = null;
        let chFine = null;
        let attrName = null;

        // Iterate through all attributes to be case-insensitive and format-agnostic
        for (let j = 0; j < el.attributes.length; j++) {
            const attr = el.attributes[j];
            const name = attr.name.toLowerCase();
            const val = attr.value;

            if (name === "coarse" || name === "dmx") ch = val;
            if (name === "fine") chFine = val;
            if (name === "offset") {
                const parts = val.split(",");
                if (parts.length > 0) ch = parts[0];
                if (parts.length > 1) chFine = parts[1];
            }
            if (name === "attribute" || name === "name" || name === "logicalchannel") {
                attrName = val;
            }
        }

        if (ch || chFine) {
            if (!attrName) {
                if (el.parentElement) {
                    attrName = el.parentElement.getAttribute("Attribute") || el.parentElement.getAttribute("Name");
                }
                attrName = attrName || el.tagName;
            }

            if (ch && ch !== "None") addChannel(ch, attrName);
            if (chFine && chFine !== "None") addChannel(chFine, attrName + " Fine");
        }
    }
    
    // De-duplicate and Sort channels
    const uniqueChannelsMap = new Map();
    channels.forEach(c => uniqueChannelsMap.set(c.ch, c));
    const uniqueChannels = Array.from(uniqueChannelsMap.values()).sort((a, b) => a.ch - b.ch);

    const dimmerGroup = { name: "Dimmer (亮度)", sliders: [] };
    const posGroup = { name: "Position (位置)", sliders: [] };
    const colorGroup = { name: "Color (顏色)", isColor: true, sliders: [] };
    const beamGroup = { name: "Optics & Beam (光學/光束)", sliders: [] };
    const goboGroup = { name: "Gobo (圖案)", sliders: [] };
    const shutterGroup = { name: "Shutter & Strobe (快門/頻閃)", sliders: [] };
    const otherGroup = { name: "Features (其他)", sliders: [] };

    uniqueChannels.forEach(c => {
        const attr = c.attribute;
        const sliderDef = { ch: c.ch, label: c.label, default: 0 };

        if (attr.includes("dim") || attr.includes("intensity")) {
            profile.dimmerChannel = c.ch;
            if (!attr.includes("fine")) sliderDef.default = 255;
            dimmerGroup.sliders.push(sliderDef);
        } else if (attr.includes("strobe") || attr.includes("shutter")) {
            shutterGroup.sliders.push(sliderDef);
        } else if (attr.includes("pan") || attr.includes("tilt")) {
            if (!attr.includes("fine")) sliderDef.default = 128;
            posGroup.sliders.push(sliderDef);
        } else if (attr.includes("colorrgb") || attr.includes("red") || attr.includes("green") || attr.includes("blue") || attr.includes("white") || attr.includes("cyan") || attr.includes("magenta") || attr.includes("yellow") || attr.includes("cto") || attr.includes("ctb")) {
            if (attr.includes("red") || attr.includes("magenta")) sliderDef.cssClass = "c-red";
            if (attr.includes("green") || attr.includes("yellow")) sliderDef.cssClass = "c-green";
            if (attr.includes("blue") || attr.includes("cyan")) sliderDef.cssClass = "c-blue";
            if (attr.includes("white")) sliderDef.cssClass = "c-white";
            colorGroup.sliders.push(sliderDef);
        } else if (attr.includes("zoom") || attr.includes("focus") || attr.includes("iris") || attr.includes("frost") || attr.includes("prism") || attr.includes("blade") || attr.includes("frame")) {
            beamGroup.sliders.push(sliderDef);
        } else if (attr.includes("gobo") || attr.includes("wheel")) {
            goboGroup.sliders.push(sliderDef);
        } else {
            otherGroup.sliders.push(sliderDef);
        }
    });

    if (dimmerGroup.sliders.length > 0) profile.groups.push(dimmerGroup);
    if (posGroup.sliders.length > 0) profile.groups.push(posGroup);
    if (colorGroup.sliders.length > 0) profile.groups.push(colorGroup);
    if (beamGroup.sliders.length > 0) profile.groups.push(beamGroup);
    if (goboGroup.sliders.length > 0) profile.groups.push(goboGroup);
    if (shutterGroup.sliders.length > 0) profile.groups.push(shutterGroup);
    if (otherGroup.sliders.length > 0) profile.groups.push(otherGroup);

    // Removed the default Blackout macro since Master controls it.

    return profile;
}


// Initial setup
function initFixtures() {
    // Clear first to prevent duplicates if re-init
    fixtureSelect.innerHTML = '';
    
    for (const key in FIXTURE_PROFILES) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = FIXTURE_PROFILES[key].name;
        fixtureSelect.appendChild(option);
    }
    
    // Prefer last selected or first available
    if (currentFixtureKey && FIXTURE_PROFILES[currentFixtureKey]) {
        fixtureSelect.value = currentFixtureKey;
    } else {
        const keys = Object.keys(FIXTURE_PROFILES);
        if (keys.length > 0) {
            currentFixtureKey = keys[0];
            fixtureSelect.value = currentFixtureKey;
        } else {
            currentFixtureKey = null;
        }
    }
    
    if (currentFixtureKey) {
        renderFixtureControls(currentFixtureKey);
    } else {
        fixtureControlsGrid.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-secondary);">請點擊上方 [匯入 MA2 XML] 選擇燈庫檔案以開始操作。</div>';
    }
    
    // Bind change listener only once
    if (!fixtureSelect.hasAttribute('data-bound')) {
        fixtureSelect.addEventListener('change', (e) => {
            clearAllDmxSignals(); // Clear signals when switching fixtures
            currentFixtureKey = e.target.value;
            renderFixtureControls(currentFixtureKey);
        });
        fixtureSelect.setAttribute('data-bound', 'true');
    }
}

// Call on load
loadFixturesFromCache();
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
            // Accept any device to avoid name prefix mismatch after firmware updates
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

        // Backward compatibility: Send channel 0 = 255 to unlock output on older ESP32 firmwares 
        // that still use channel 0 as a global master dimmer multiplier.
        sendDmxCommand(0, 255);

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
