(() => {
    const style = document.createElement('style');
    style.textContent = `
        .error-neon-box {
            position: fixed;
            background: rgba(10, 2, 2, 0.92);
            border: 2px solid #ff2a2a;
            box-shadow: 0 0 15px rgba(255, 42, 42, 0.7), inset 0 0 15px rgba(255, 42, 42, 0.3);
            padding: 18px 24px 14px 24px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            border-radius: 4px;
            z-index: 999999;
            pointer-events: none;
            user-select: none;
            animation: errorPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .error-neon-title {
            color: transparent;
            -webkit-text-stroke: 1.5px #ff2a2a;
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 4px;
            line-height: 1;
            text-shadow: 0 0 10px rgba(255, 42, 42, 0.6);
        }

        .error-neon-sub {
            color: #ff4d4d;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            margin-top: 6px;
            text-shadow: 0 0 5px rgba(255, 42, 42, 0.8);
        }

        @keyframes errorPop {
            0% { transform: scale(0) rotate(-15deg); opacity: 0; }
            60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
            80% { transform: scale(0.95) rotate(-2deg); }
            100% { transform: scale(1) rotate(var(--rot, 0deg)); opacity: 1; }
        }

        .page-shake-effect {
            animation: screenShake 0.25s ease-in-out;
        }

        @keyframes screenShake {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-8px, 6px); }
            50% { transform: translate(8px, -6px); }
            75% { transform: translate(-6px, -6px); }
        }

        .neon-spider-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(5, 2, 2, 0.96);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000000;
            opacity: 0;
            animation: spiderFadeIn 0.6s ease-out forwards;
        }

        /* Увеличенный паук */
        .neon-spider-svg {
            width: 120vw;
            height: 120vh;
            position: absolute;
            top: -10vh;
            left: -10vw;
            cursor: pointer;
            filter: drop-shadow(0 0 20px #ff1a1a) drop-shadow(0 0 40px #ff0000);
            transition: filter 0.15s ease;
            animation: spiderDrop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, spiderPulse 2s infinite alternate;
        }

        .neon-spider-svg:hover {
            filter: drop-shadow(0 0 30px #ff3333) drop-shadow(0 0 70px #ff0000);
        }

        @keyframes spiderPulse {
            0% { filter: drop-shadow(0 0 15px #ff1a1a) drop-shadow(0 0 30px #cc0000); }
            100% { filter: drop-shadow(0 0 30px #ff4d4d) drop-shadow(0 0 70px #ff0000); }
        }

        .hack-sector-box {
            position: absolute;
            background: rgba(20, 0, 0, 0.95);
            border: 2.5px solid #ff0000;
            box-shadow: 0 0 25px rgba(255, 0, 0, 0.8), inset 0 0 20px rgba(255, 0, 0, 0.4);
            padding: 20px 30px;
            border-radius: 6px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            z-index: 1000001;
            user-select: none;
            opacity: 0;
            cursor: pointer;
            animation: sectorAppear 0.5s ease-out forwards, dangerPulse 1.5s infinite alternate;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .hack-sector-box:hover {
            transform: scale(1.05);
            background: rgba(40, 0, 0, 0.98);
            box-shadow: 0 0 35px rgba(255, 0, 0, 1);
        }

        .hack-sector-title {
            color: transparent;
            -webkit-text-stroke: 1.8px #ff0000;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
            text-shadow: 0 0 12px rgba(255, 0, 0, 0.9);
            margin-bottom: 6px;
        }

        .hack-sector-sub {
            color: #ff6666;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            text-shadow: 0 0 8px rgba(255, 0, 0, 0.9);
        }

        .tools-dropdown {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(10px);
            width: 340px;
            max-height: 200px;
            overflow-y: auto;
            background: rgba(10, 0, 0, 0.98);
            border: 2px solid #ff2a2a;
            box-shadow: 0 0 25px rgba(255, 0, 0, 0.8);
            border-radius: 4px;
            display: none;
            z-index: 1000005;
            text-align: left;
            padding: 5px;
        }

        .hack-sector-box:hover .tools-dropdown {
            display: block;
        }

        .tool-item {
            padding: 10px 14px;
            color: #ff8888;
            font-size: 13px;
            font-weight: 700;
            border-bottom: 1px solid rgba(255, 42, 42, 0.3);
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
        }

        .tool-item:last-child {
            border-bottom: none;
        }

        .tool-item:hover {
            background: #ff2a2a;
            color: #fff;
        }

        /* Увеличенное окно терминала инициализации */
        .init-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 680px;
            background: rgba(8, 2, 2, 0.98);
            border: 3px solid #ff0000;
            box-shadow: 0 0 50px rgba(255, 0, 0, 0.95);
            padding: 35px;
            border-radius: 8px;
            z-index: 1000010;
            font-family: monospace;
            color: #ff2a2a;
            text-align: left;
            display: none;
        }

        .init-modal h3 {
            margin: 0 0 15px 0;
            font-size: 22px;
            letter-spacing: 2px;
            text-shadow: 0 0 12px red;
            border-bottom: 1px solid rgba(255, 0, 0, 0.4);
            padding-bottom: 10px;
        }

        .init-log {
            font-size: 14px;
            color: #fff;
            line-height: 1.7;
            height: 160px;
            overflow-y: auto;
        }

        @keyframes sectorAppear {
            0% { transform: scale(0.7); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes dangerPulse {
            0% { box-shadow: 0 0 15px rgba(255,0,0,0.6), inset 0 0 15px rgba(255,0,0,0.3); border-color: #cc0000; }
            100% { box-shadow: 0 0 35px rgba(255,0,0,1), inset 0 0 25px rgba(255,0,0,0.6); border-color: #ff3333; }
        }

        @keyframes spiderFadeIn {
            to { opacity: 1; }
        }

        @keyframes spiderDrop {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        .spider-hit-anim {
            animation: spiderHit 0.25s ease-in-out !important;
        }
        @keyframes spiderHit {
            0%, 100% { transform: scale(1) translate(0, 0); }
            30% { transform: scale(0.95) translate(-15px, 12px); filter: drop-shadow(0 0 70px #ffffff); }
            70% { transform: scale(1.05) translate(15px, -12px); }
        }

        .system-destroyed {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #050000;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #ff2a2a;
            font-family: monospace;
            text-align: center;
            animation: glitchBg 0.15s infinite;
        }

        .system-destroyed h1 {
            font-size: 52px;
            letter-spacing: 6px;
            text-shadow: 3px 3px 0px #00ffcc, -3px -3px 0px #ff0055;
            margin-bottom: 15px;
        }

        .system-destroyed p {
            color: #fff;
            font-size: 20px;
            letter-spacing: 2.5px;
        }

        @keyframes glitchBg {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-4px, 3px); }
            50% { transform: translate(4px, -3px); }
            75% { transform: translate(-3px, -4px); }
            100% { transform: translate(0, 0); }
        }
    `;
    document.head.appendChild(style);

    let clickCount = 0;

    function createErrorBox(x, y) {
        const box = document.createElement('div');
        box.className = 'error-neon-box';
        box.innerHTML = `
            <div class="error-neon-title">ОШИБКА</div>
            <div class="error-neon-sub">КРИТИЧЕСКИЙ СБОЙ СИСТЕМЫ // ДОСТУП ЗАПРЕЩЕН</div>
        `;
        const rotation = (Math.random() - 0.5) * 20;
        box.style.setProperty('--rot', `${rotation}deg`);
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        document.body.appendChild(box);
    }

    // Уникальные наборы команд на английском для каждой утилиты
    const toolLogs = {
        "BruteForce Tool": [
            "Initializing hydra multi-threaded attack...",
            "Loading wordlist: /usr/share/wordlists/rockyou.txt",
            "Target port: 22 (SSH) - Attempting authentication...",
            "Password found: root@12345! Access granted."
        ],
        "Network Sniffer": [
            "Binding to network interface eth0 in promiscuous mode...",
            "Capturing packets via libpcap...",
            "Analyzing TCP/IP stream [Port 443]...",
            "Extracted session cookies & bearer tokens successfully."
        ],
        "SQL Database Dump": [
            "Connecting to target database via SQL injection...",
            "Executing automated UNION-based queries...",
            "Dumping tables: users, transactions, profit_logs...",
            "Export complete: 14,280 rows dumped to local buffer."
        ],
        "Privilege Escalation": [
            "Running system vulnerability assessment (CVE-2026-X)...",
            "Exploiting kernel permission flaw in sudoers file...",
            "Spawning root interactive shell...",
            "UID changed to 0 (root). Full control established."
        ],
        "Audit Log Purger": [
            "Locating system log directories (/var/log/syslog)...",
            "Terminating auditd daemon process...",
            "Overwriting log sectors with random null bytes...",
            "All traces successfully wiped out."
        ],
        "System Backdoor": [
            "Compiling stealth backdoor binary...",
            "Injecting payload into system startup services...",
            "Opening hidden reverse shell listener on port 1337...",
            "Persistent access secured."
        ],
        "Buffer Overflow": [
            "Allocating malicious shellcode in stack memory...",
            "Sending oversized payload to vulnerable daemon buffer...",
            "Overwriting instruction pointer (EIP)...",
            "Memory corruption executed successfully."
        ],
        "CPU Stress Lock": [
            "Spawning infinite heavy calculation threads...",
            "Disabling core temperature throttling...",
            "Forcing CPU clock to maximum frequency...",
            "Processor thermal limit reached. Hardware locked."
        ],
        "Cache Cleaner": [
            "Flushing RAM cache and temporary buffers...",
            "Clearing browser local storage and cookies...",
            "Unmounting swap partitions...",
            "System memory purged."
        ],
        "Remote Shell (SSH)": [
            "Establishing encrypted SSH tunnel to remote C2 server...",
            "Authenticating via RSA private key...",
            "Interactive remote terminal ready.",
            "Executing remote administrative tasks."
        ],
        "Command Injector": [
            "Injecting system shell commands via HTTP parameters...",
            "Executing 'rm -rf / --no-preserve-root' simulation...",
            "Bypassing input sanitization filters...",
            "Payload executed with high privileges."
        ],
        "DNS Spoofing": [
            "Poisoning local ARP cache table...",
            "Intercepting DNS lookup requests...",
            "Redirecting traffic to malicious phished gateway...",
            "DNS redirection active."
        ],
        "AES-256 Disk Encryptor": [
            "Initializing AES-256 cipher block chaining...",
            "Encrypting master file table (MFT)...",
            "Locking user documents and database files...",
            "Ransom note generated. Keys destroyed."
        ],
        "Shadow Copy Wiper": [
            "Accessing Volume Shadow Copy Service (VSS)...",
            "Executing command: vssadmin delete shadows /all /quiet...",
            "Purging system restore points...",
            "Recovery made impossible."
        ],
        "MBR Overwriter": [
            "Targeting Master Boot Record (Sector 0)...",
            "Writing custom bootloader payload...",
            "Corrupting partition table structures...",
            "Next reboot will trigger fatal system halt."
        ],
        "Input Locker": [
            "Hooking low-level Windows keyboard and mouse events...",
            "Blocking user input hardware drivers...",
            "Disabling Task Manager and hotkeys...",
            "Input devices successfully frozen."
        ],
        "Service Killer": [
            "Enumerating running system services...",
            "Terminating critical daemons (explorer.exe, lsass)...",
            "Crashing background subsystems...",
            "System services terminated."
        ],
        "Total Server Wipe": [
            "Initiating final cleanup sequence...",
            "Corrupting core firmware sectors...",
            "Wiping storage drives completely...",
            "FATAL: System core destroyed. Connection lost."
        ]
    };

    // Инициализация работы выбранного инструмента с выводом английских логов
    function initializeTool(toolName, callback) {
        let modal = document.getElementById('initModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'initModal';
            modal.className = 'init-modal';
            modal.innerHTML = `
                <h3 id="initTitle">INITIALIZING...</h3>
                <div class="init-log" id="initLog">Loading modules...</div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        document.getElementById('initTitle').textContent = `EXEC: ${toolName.toUpperCase()}`;
        const logEl = document.getElementById('initLog');

        const logs = toolLogs[toolName] || [
            "Initializing tool sequence...",
            "Bypassing security controls...",
            "Executing payload...",
            "Operation completed successfully."
        ];

        let index = 0;
        logEl.innerHTML = `> ${logs[0]}`;

        const interval = setInterval(() => {
            index++;
            if (index < logs.length) {
                logEl.innerHTML += `<br>> ${logs[index]}`;
                logEl.scrollTop = logEl.scrollHeight;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    modal.style.display = 'none';
                    if (callback) callback();
                }, 900);
            }
        }, 300);
    }

    function triggerSystemCrash() {
        const spiderOverlay = document.getElementById('neonSpider');
        if (spiderOverlay) spiderOverlay.remove();
        const modal = document.getElementById('initModal');
        if (modal) modal.remove();

        document.querySelectorAll('.error-neon-box').forEach(el => el.remove());

        const crashScreen = document.createElement('div');
        crashScreen.className = 'system-destroyed';
        crashScreen.innerHTML = `
            <h1>СИСТЕМА ПОЛНОСТЬЮ ВЗЛОМАНА</h1>
            <p>ДОСТУП ЗАБЛОКИРОВАН НАВСЕГДА. ПАУК ЗАХВАТИЛ СЕРВЕР.</p>
        `;
        document.body.appendChild(crashScreen);
    }

    // Спавн увеличенного паука
    function spawnInteractiveSpider() {
        if (document.getElementById('neonSpider')) return;

        const overlay = document.createElement('div');
        overlay.className = 'neon-spider-overlay';
        overlay.id = 'neonSpider';

        const sectorsHTML = `
            <div class="hack-sector-box" style="top: 5%; left: 4%; animation-delay: 0.2s;">
                <div class="hack-sector-title">ПРОРЫВ ЯДРА</div>
                <div class="hack-sector-sub">ОБХОД ЗАЩИТЫ // ПОРТ 0</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="BruteForce Tool">🛠️ BruteForce Tool</div>
                    <div class="tool-item" data-tool="Network Sniffer">🛠️ Network Sniffer</div>
                    <div class="tool-item" data-tool="SQL Database Dump">🛠️ SQL Database Dump</div>
                </div>
            </div>

            <div class="hack-sector-box" style="top: 5%; right: 4%; animation-delay: 0.35s;">
                <div class="hack-sector-title">ПРАВА СУПЕРПОЛЬЗОВАТЕЛЯ</div>
                <div class="hack-sector-sub">ПОЛНЫЙ КОНТРОЛЬ ROOT</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="Privilege Escalation">🛠️ Privilege Escalation</div>
                    <div class="tool-item" data-tool="Audit Log Purger">🛠️ Audit Log Purger</div>
                    <div class="tool-item" data-tool="System Backdoor">🛠️ System Backdoor</div>
                </div>
            </div>

            <div class="hack-sector-box" style="top: 42%; left: 2%; animation-delay: 0.5s;">
                <div class="hack-sector-title">КРИТИЧЕСКИЙ СБОЙ</div>
                <div class="hack-sector-sub">ПОВРЕЖДЕНИЕ ОПЕРАТИВНОЙ ПАМЯТИ</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="Buffer Overflow">🛠️ Buffer Overflow</div>
                    <div class="tool-item" data-tool="CPU Stress Lock">🛠️ CPU Stress Lock</div>
                    <div class="tool-item" data-tool="Cache Cleaner">🛠️ Cache Cleaner</div>
                </div>
            </div>

            <div class="hack-sector-box" style="top: 42%; right: 2%; animation-delay: 0.65s;">
                <div class="hack-sector-title">ЗАХВАТ СЕРВЕРА</div>
                <div class="hack-sector-sub">УДАЛЕННОЕ УПРАВЛЕНИЕ УСТАНОВЛЕНО</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="Remote Shell (SSH)">🛠️ Remote Shell (SSH)</div>
                    <div class="tool-item" data-tool="Command Injector">🛠️ Command Injector</div>
                    <div class="tool-item" data-tool="DNS Spoofing">🛠️ DNS Spoofing</div>
                </div>
            </div>

            <div class="hack-sector-box" style="bottom: 8%; left: 5%; animation-delay: 0.8s;">
                <div class="hack-sector-title">ВИРУС-ШИФРОВЩИК</div>
                <div class="hack-sector-sub">БЛОКИРОВКА ВСЕХ ФАЙЛОВ // RANSOMWARE</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="AES-256 Disk Encryptor">🛠️ AES-256 Disk Encryptor</div>
                    <div class="tool-item" data-tool="Shadow Copy Wiper">🛠️ Shadow Copy Wiper</div>
                    <div class="tool-item" data-tool="MBR Overwriter">🛠️ MBR Overwriter</div>
                </div>
            </div>

            <div class="hack-sector-box" style="bottom: 8%; right: 5%; animation-delay: 0.95s;">
                <div class="hack-sector-title">ТОТАЛЬНАЯ БЛОКИРОВКА</div>
                <div class="hack-sector-sub">ОТМЕНА ПРАВ АДМИНИСТРАТОРА</div>
                <div class="tools-dropdown">
                    <div class="tool-item" data-tool="Input Locker">🛠️ Input Locker</div>
                    <div class="tool-item" data-tool="Service Killer">🛠️ Service Killer</div>
                    <div class="tool-item" data-tool="Total Server Wipe">🛠️ Total Server Wipe</div>
                </div>
            </div>
        `;

        overlay.innerHTML = `
            <svg id="spiderElement" class="neon-spider-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#661111" stroke-width="2.5" opacity="0.8">
                    <path d="M490 0 C495 200, 485 350, 492 460" />
                    <path d="M500 0 C500 220, 505 370, 500 460" />
                    <path d="M510 0 C505 200, 515 350, 508 460" />
                    <path d="M500 575 C495 750, 505 900, 498 1000" />
                    <path d="M505 575 C515 750, 495 900, 506 1000" />
                    <path d="M0 150 Q 300 400 450 420" />
                    <path d="M1000 150 Q 700 400 550 420" />
                    <path d="M0 850 Q 300 600 450 540" />
                    <path d="M1000 850 Q 700 600 550 540" />
                    <path d="M200 0 Q 350 300 440 430" />
                    <path d="M800 0 Q 650 300 560 430" />
                </g>

                <g stroke="#ff2a2a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="500,450 525,480 500,510 475,480" fill="#1a0000" />
                    <line x1="500" y1="450" x2="500" y2="510" stroke-width="3" />
                    <line x1="475" y1="480" x2="525" y2="480" stroke-width="3" />
                    
                    <path d="M491 450 L484 432 L494 439" />
                    <path d="M509 450 L516 432 L506 439" />

                    <polygon points="500,514 542,558 528,620 500,648 472,620 458,558" fill="#1a0000" />
                    <polygon points="500,530 522,558 500,618 478,558" stroke-width="3" />
                    <line x1="500" y1="514" x2="500" y2="648" stroke-width="3" />
                    <line x1="458" y1="558" x2="542" y2="558" stroke-width="3" />
                    <line x1="472" y1="620" x2="528" y2="620" stroke-width="3" />

                    <polyline points="478,468 430,370 450,310" />
                    <polyline points="474,478 370,420 310,370" />
                    <polyline points="474,490 350,490 280,550" />
                    <polyline points="480,502 385,570 400,670" />

                    <polyline points="522,468 570,370 550,310" />
                    <polyline points="526,478 630,420 690,370" />
                    <polyline points="526,490 650,490 720,550" />
                    <polyline points="520,502 615,570 600,670" />
                </g>

                <g stroke="#ffaaaa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
                    <polygon points="500,450 525,480 500,510 475,480" />
                    <polygon points="500,514 542,558 528,620 500,648 472,620 458,558" />
                    <polyline points="478,468 430,370 450,310" />
                    <polyline points="474,478 370,420 310,370" />
                    <polyline points="474,490 350,490 280,550" />
                    <polyline points="480,502 385,570 400,670" />
                    <polyline points="522,468 570,370 550,310" />
                    <polyline points="526,478 630,420 690,370" />
                    <polyline points="526,490 650,490 720,550" />
                    <polyline points="520,502 615,570 600,670" />
                </g>
            </svg>
            ${sectorsHTML}
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolName = item.getAttribute('data-tool');
                initializeTool(toolName, () => {
                    for (let i = 0; i < 15; i++) {
                        createErrorBox(Math.random() * (window.innerWidth - 260), Math.random() * (window.innerHeight - 90));
                    }
                    if (toolName.includes('Wipe') || toolName.includes('Encryptor') || toolName.includes('Overwriter')) {
                        triggerSystemCrash();
                    }
                });
            });
        });

        const spider = document.getElementById('spiderElement');

        spider.addEventListener('click', (ev) => {
            ev.stopPropagation();

            spider.classList.remove('spider-hit-anim');
            void spider.offsetWidth;
            spider.classList.add('spider-hit-anim');

            const allTools = overlay.querySelectorAll('.tool-item');
            const randomTool = allTools[Math.floor(Math.random() * allTools.length)];
            const toolName = randomTool.getAttribute('data-tool');

            initializeTool(toolName, () => {
                const randChoice = Math.floor(Math.random() * 3);
                if (randChoice === 0) {
                    for (let i = 0; i < 35; i++) {
                        setTimeout(() => {
                            createErrorBox(Math.random() * (window.innerWidth - 260), Math.random() * (window.innerHeight - 90));
                        }, i * 20);
                    }
                } else if (randChoice === 1) {
                    document.body.classList.remove('page-shake-effect');
                    void document.body.offsetWidth;
                    document.body.classList.add('page-shake-effect');
                } else {
                    triggerSystemCrash();
                }
            });
        });
    }

    document.addEventListener('click', (e) => {
        const clickable = e.target.closest('button, a, select, [role="button"], input[type="button"], input[type="submit"]');
        if (!clickable) return;

        e.preventDefault();
        e.stopPropagation();

        clickCount++;

        document.body.classList.remove('page-shake-effect');
        void document.body.offsetWidth;
        document.body.classList.add('page-shake-effect');

        createErrorBox(e.clientX - 110, e.clientY - 40);
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const randomX = Math.random() * (window.innerWidth - 260);
                const randomY = Math.random() * (window.innerHeight - 90);
                createErrorBox(randomX, randomY);
            }, i * 30);
        }

        if (clickCount === 5) {
            setTimeout(() => {
                spawnInteractiveSpider();
            }, 300);
        }
    }, true);
})();