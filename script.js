// App Configuration
const ranks = [
    { title: "E-Rank", expReq: 0 },
    { title: "D-Rank", expReq: 27500 },
    { title: "C-Rank", expReq: 55000 },
    { title: "B-Rank", expReq: 82500 },
    { title: "A-Rank", expReq: 110000 },
    { title: "S-Rank", expReq: 137500 },
    { title: "SS-Rank", expReq: 165000 },
    { title: "SSS-Rank", expReq: 192500 },
    { title: "NATIONAL-LEVEL", expReq: 220000 },
    { title: "MONARCH", expReq: 247500 },
    { title: "GODLY", expReq: 275000 }
];

const defaultTasks = [
    { id: "def-1", text: "Workout", exp: 100, stat: "Strength" },
    { id: "def-2", text: "Study 2 hours", exp: 100, stat: "Intelligence" },
    { id: "def-3", text: "Read a book", exp: 100, stat: "Intelligence" },
    { id: "def-4", text: "Drink 8 glasses of water", exp: 100, stat: "Vitality" },
    { id: "def-5", text: "Sleep 8 hours", exp: 100, stat: "Vitality" },
    { id: "def-6", text: "No junk food today", exp: 100, stat: "Vitality" },
    { id: "def-7", text: "Meditate 10 mins", exp: 100, stat: "Focus" },
    { id: "def-8", text: "Journal / reflect", exp: 100, stat: "Focus" },
    { id: "def-9", text: "Practice a skill", exp: 100, stat: "Discipline" }
];

let allUsers = {};
let currentUser = null;
let radarChartInstance = null;

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    main: document.getElementById('main-app'),
    quests: document.getElementById('view-quests'),
    profile: document.getElementById('view-profile'),
    friends: document.getElementById('view-friends'),
    leaderboard: document.getElementById('view-leaderboard'),
    schedule: document.getElementById('view-schedule')
};

function init() {
    const savedUsers = localStorage.getItem('systemGlobalUsers');
    if (savedUsers) {
        allUsers = JSON.parse(savedUsers);
    }
    
    // Bind Auth
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-signup').addEventListener('click', handleSignup);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Bind Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            let target = e.target.getAttribute('data-target');
            switchView(target);
        });
    });
}

function handleLogin() {
    let un = document.getElementById('auth-username').value.trim();
    let pw = document.getElementById('auth-password').value;
    let err = document.getElementById('auth-error');
    
    if(!un || !allUsers[un]) {
        err.textContent = "Player does not exist."; err.classList.remove('hidden'); return;
    }
    if(allUsers[un].password !== pw) {
        err.textContent = "Invalid password."; err.classList.remove('hidden'); return;
    }
    
    loginUser(un);
}

function handleSignup() {
    let un = document.getElementById('auth-username').value.trim();
    let pw = document.getElementById('auth-password').value;
    let err = document.getElementById('auth-error');
    
    if(!un || !pw) {
        err.textContent = "Username and password required."; err.classList.remove('hidden'); return;
    }
    if(allUsers[un]) {
        err.textContent = "Username already taken."; err.classList.remove('hidden'); return;
    }
    
    allUsers[un] = {
        password: pw,
        exp: 0,
        rankIndex: 0,
        lastLoginDate: "",
        customTasks: [],
        completedIds: [],
        friends: [],
        schedule: [],
        stats: { Strength: 0, Intelligence: 0, Vitality: 0, Focus: 0, Discipline: 0 }
    };
    saveGlobalData();
    loginUser(un);
}

function loginUser(username) {
    currentUser = username;
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-error').classList.add('hidden');
    views.auth.classList.remove('active-view');
    views.auth.classList.add('hidden');
    views.main.classList.remove('hidden');
    document.getElementById('player-name-display').textContent = username;
    
    // Fix missing properties for older schema migrations if necessary
    if(!allUsers[currentUser].stats) allUsers[currentUser].stats = { Strength: 0, Intelligence: 0, Vitality: 0, Focus: 0, Discipline: 0 };
    if(!allUsers[currentUser].friends) allUsers[currentUser].friends = [];
    if(!allUsers[currentUser].schedule) allUsers[currentUser].schedule = [];
    
    checkDailyReset();
    updateUI();
    switchView('view-quests'); // Default view
}

function handleLogout() {
    currentUser = null;
    views.main.classList.add('hidden');
    views.auth.classList.remove('hidden');
    views.auth.classList.add('active-view');
}

function saveGlobalData() {
    localStorage.setItem('systemGlobalUsers', JSON.stringify(allUsers));
}

function switchView(viewId) {
    document.querySelectorAll('.view-content').forEach(v => {
        v.classList.remove('active-view');
        v.classList.add('hidden');
    });
    const targetElement = document.getElementById(viewId);
    if (targetElement) {
        targetElement.classList.remove('hidden');
        targetElement.classList.add('active-view');
    }
    
    if(viewId === 'view-quests') renderTasks();
    if(viewId === 'view-profile') renderProfile();
    if(viewId === 'view-friends') renderFriends();
    if(viewId === 'view-leaderboard') renderLeaderboard();
    if(viewId === 'view-schedule') renderSchedule();
}

function getTodayString() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function checkDailyReset() {
    const todayStr = getTodayString();
    let uData = allUsers[currentUser];
    
    if (uData.lastLoginDate !== todayStr) {
        uData.completedIds = [];
        uData.lastLoginDate = todayStr;
        saveGlobalData();
        
        let dateDisplay = document.getElementById('daily-date');
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = `[System] Daily Quests Refreshed — ${new Date().toLocaleDateString('en-US', options)}`;
        document.getElementById('system-message-overlay').classList.remove('hidden');
    }
}

function updateUI() {
    let uData = allUsers[currentUser];
    let currentRankIndex = 0;
    for (let i = 0; i < ranks.length; i++) {
        if (uData.exp >= ranks[i].expReq) currentRankIndex = i;
        else break;
    }

    if (currentRankIndex > uData.rankIndex) {
        document.getElementById('new-rank-display').textContent = ranks[currentRankIndex].title;
        document.getElementById('rank-up-overlay').classList.remove('hidden');
        uData.rankIndex = currentRankIndex;
        saveGlobalData();
    }

    const currentRank = ranks[currentRankIndex];
    document.getElementById('current-rank-badge').textContent = currentRank.title;
    document.getElementById('current-exp').textContent = uData.exp;

    let nextRankExp = currentRank.expReq;
    let rankProgress = 100;

    if (currentRankIndex < ranks.length - 1) {
        const nextRank = ranks[currentRankIndex + 1];
        nextRankExp = nextRank.expReq;
        const expInCurrentRank = uData.exp - currentRank.expReq;
        const totalExpForNextRank = nextRank.expReq - currentRank.expReq;
        rankProgress = (expInCurrentRank / totalExpForNextRank) * 100;
        document.getElementById('next-rank-exp').textContent = nextRank.expReq;
    } else {
        document.getElementById('next-rank-exp').textContent = "MAX";
    }

    document.getElementById('exp-progress').style.width = `${Math.min(rankProgress, 100)}%`;
}

// === QUESTS ===
function renderTasks() {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    let uData = allUsers[currentUser];
    const allTasks = [...defaultTasks, ...uData.customTasks];

    allTasks.forEach(task => {
        const isCompleted = uData.completedIds.includes(task.id);
        const li = document.createElement('li');
        li.className = `task-item ${isCompleted ? 'completed' : ''}`;
        
        li.innerHTML = `
            <div class="task-info" onclick="toggleTask('${task.id}')">
                <div class="checkbox-custom"></div>
                <div>
                   <span class="task-text">${task.text}</span>
                   <span class="stat-badge">${task.stat}</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span class="task-reward">+${task.exp} EXP</span>
                ${task.id.startsWith('custom') ? `<button class="delete-btn" onclick="deleteTask(event, '${task.id}')">X</button>` : ''}
            </div>
        `;
        list.appendChild(li);
    });
}

window.toggleTask = function(taskId) {
    let uData = allUsers[currentUser];
    const allTasks = [...defaultTasks, ...uData.customTasks];
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleted = uData.completedIds.includes(taskId);

    if (isCompleted) {
        uData.completedIds = uData.completedIds.filter(id => id !== taskId);
        uData.exp = Math.max(0, uData.exp - task.exp);
        uData.stats[task.stat] = Math.max(0, uData.stats[task.stat] - 10);
    } else {
        uData.completedIds.push(taskId);
        uData.exp += task.exp;
        uData.stats[task.stat] += 10;
    }

    saveGlobalData();
    updateUI();
    renderTasks();
};

window.deleteTask = function(e, taskId) {
    e.stopPropagation();
    if(confirm("Delete this custom quest?")) {
        let uData = allUsers[currentUser];
        uData.customTasks = uData.customTasks.filter(t => t.id !== taskId);
        uData.completedIds = uData.completedIds.filter(id => id !== taskId);
        saveGlobalData();
        renderTasks();
    }
}

document.getElementById('add-task-btn').addEventListener('click', () => {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (text) {
        allUsers[currentUser].customTasks.push({
            id: `custom-${Date.now()}`,
            text: text,
            exp: 100,
            stat: "Discipline"
        });
        input.value = '';
        saveGlobalData();
        renderTasks();
    }
});

// === PROFILE ===
function renderProfile() {
    let stats = allUsers[currentUser].stats;
    let statLabels = Object.keys(stats);
    let statData = Object.values(stats);
    
    // Stats List
    let listHTML = '';
    statLabels.forEach(k => {
        listHTML += `<div class="stat-box"><div class="stat-name">${k}</div><div class="stat-val">${stats[k]}</div></div>`;
    });
    document.getElementById('stats-list-display').innerHTML = listHTML;

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: statLabels,
            datasets: [{
                label: 'Stats',
                data: statData,
                backgroundColor: 'rgba(0, 229, 255, 0.2)',
                borderColor: 'rgba(0, 229, 255, 1)',
                pointBackgroundColor: 'rgba(176, 0, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(176, 0, 255, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: 'rgba(0, 229, 255, 0.8)', font: { family: 'Orbitron', size: 12 } },
                    ticks: { display: false },
                    min: 0,
                    max: 20000
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// === FRIENDS ===
function renderFriends() {
    const list = document.getElementById('friends-list');
    list.innerHTML = '';
    let fList = allUsers[currentUser].friends;
    
    fList.forEach(f => {
        let fData = allUsers[f];
        if(!fData) return;
        
        // Find friend rank
        let rankT = ranks[0].title;
        for(let i=0; i<ranks.length; i++) if(fData.exp >= ranks[i].expReq) rankT = ranks[i].title;

        const li = document.createElement('li');
        li.className = `task-item`;
        li.innerHTML = `
            <div class="task-info">
                <span class="task-text" style="font-family: var(--font-heading); color: var(--neon-blue);">${f}</span>
            </div>
            <div>
                <span class="stat-badge">${rankT}</span>
                <span class="task-reward">${fData.exp} EXP</span>
            </div>
        `;
        list.appendChild(li);
    });
}

document.getElementById('add-friend-btn').addEventListener('click', () => {
    let search = document.getElementById('friend-search-input').value.trim();
    let err = document.getElementById('friend-error');
    if(!search) return;
    
    if(search === currentUser) { err.textContent = "You cannot add yourself."; err.classList.remove('hidden'); return; }
    if(!allUsers[search]) { err.textContent = "Player not found on this device."; err.classList.remove('hidden'); return; }
    if(allUsers[currentUser].friends.includes(search)) { err.textContent = "Already in party."; err.classList.remove('hidden'); return; }
    
    allUsers[currentUser].friends.push(search);
    document.getElementById('friend-search-input').value = '';
    err.classList.add('hidden');
    saveGlobalData();
    renderFriends();
});

// === LEADERBOARD ===
function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    let uData = allUsers[currentUser];
    let lbIds = [currentUser, ...uData.friends];
    
    let lbData = lbIds.filter(id => allUsers[id]).map(id => {
        let exp = allUsers[id].exp;
        let rankT = ranks[0].title;
        for(let i=0; i<ranks.length; i++) if(exp >= ranks[i].expReq) rankT = ranks[i].title;
        return { username: id, exp: exp, rank: rankT };
    });
    
    lbData.sort((a,b) => b.exp - a.exp);
    
    lbData.forEach((player, idx) => {
        const li = document.createElement('li');
        li.className = `task-item ${player.username === currentUser ? 'leaderboard-me' : ''}`;
        li.innerHTML = `
            <div class="task-info">
                <span class="task-text" style="font-weight: bold; width: 30px;">#${idx+1}</span>
                <span class="task-text">${player.username}</span>
            </div>
            <div>
                <span class="stat-badge">${player.rank}</span>
                <span class="task-reward">${player.exp} EXP</span>
            </div>
        `;
        list.appendChild(li);
    });
}

// === SCHEDULE ===
function renderSchedule() {
    const tList = document.getElementById('schedule-timeline');
    tList.innerHTML = '';
    
    let sched = allUsers[currentUser].schedule;
    sched.sort((a,b) => a.time.localeCompare(b.time));
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    for(let i=0; i<sched.length; i++) {
        let b = sched[i];
        let [h, m] = b.time.split(':').map(Number);
        let bMins = h * 60 + m;
        
        let nextMins = 24 * 60; // default to end of day
        if(i < sched.length - 1) {
            let [nh, nm] = sched[i+1].time.split(':').map(Number);
            nextMins = nh * 60 + nm;
        }
        
        let isCurrent = (currentMins >= bMins && currentMins < nextMins);
        
        // formats e.g. 14:00 to 02:00 PM
        let displayH = h % 12 || 12;
        let ampm = h >= 12 ? 'PM' : 'AM';
        let displayTime = `${displayH}:${m.toString().padStart(2,'0')} ${ampm}`;

        const div = document.createElement('div');
        div.className = `time-block ${isCurrent ? 'current' : ''}`;
        div.innerHTML = `
            <div class="time-label">${displayTime}</div>
            <div class="time-content">
                <span style="color: var(--text-main); font-size: 1.1rem;">${b.text}</span>
                <button class="delete-btn" onclick="deleteScheduleBlock(event, '${b.id}')">X</button>
            </div>
        `;
        tList.appendChild(div);
    }
}

document.getElementById('add-schedule-btn').addEventListener('click', () => {
    let tVal = document.getElementById('schedule-time').value;
    let text = document.getElementById('schedule-desc').value.trim();
    if(tVal && text) {
        allUsers[currentUser].schedule.push({
            id: `sch-${Date.now()}`,
            time: tVal,
            text: text
        });
        document.getElementById('schedule-time').value = '';
        document.getElementById('schedule-desc').value = '';
        saveGlobalData();
        renderSchedule();
    }
});

window.deleteScheduleBlock = function(e, sid) {
    if(confirm('Delete schedule block?')) {
        let uData = allUsers[currentUser];
        uData.schedule = uData.schedule.filter(s => s.id !== sid);
        saveGlobalData();
        renderSchedule();
    }
}

// Global Overlays Add-on
document.getElementById('close-sys-msg').addEventListener('click', () => document.getElementById('system-message-overlay').classList.add('hidden'));
document.getElementById('close-rank-up').addEventListener('click', () => document.getElementById('rank-up-overlay').classList.add('hidden'));

init();
