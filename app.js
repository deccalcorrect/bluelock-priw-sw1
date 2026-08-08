// =====================================
// BLUELOCK PANEL - APP.JS
// =====================================

import { db } from "./firebase.js";
import { uploadPlayerImage } from "./cloudinary.js";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    setDoc,
    deleteDoc,
    onSnapshot,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================
// SABİTLER
// =====================================

const ADMIN_PASSWORD = "bluelock2026";

// Oyuncu Statları + Fiziksel Statlar (FM tarzı profil için)
// Not: Şut Menzili ve Pas Menzili burada YOK — bunlar manuel girilmez,
// Vuruş ve Pas statlarından otomatik hesaplanır (bkz. computeRangeStats).
const CORE_STATS = [
    { key: "hiz", label: "Hız" },
    { key: "defans", label: "Defans" },
    { key: "pas", label: "Pas" },
    { key: "vurus", label: "Vuruş" },
    { key: "topKontrol", label: "Top Kontrol" },
    { key: "calim", label: "Çalım" },
    { key: "algi", label: "Algı" },
    { key: "kasYapisi", label: "Kas Yapısı" },
    { key: "refleks", label: "Refleks" },
    { key: "ceviklik", label: "Çeviklik" },
    { key: "esneklik", label: "Esneklik" },
    { key: "dayaniklilik", label: "Dayanıklılık" },
    { key: "zayifAyak", label: "Zayıf Ayak" }
];

// Otomatik hesaplanan menzil statları
// Şut Menzili: Base 20m, her 100 Vuruş statında +5
// Pas Menzili: Base 30m, her 50 Pas statında +5
function computeRangeStats(effectiveStats) {
    const vurus = Number(effectiveStats.vurus || 0);
    const pas = Number(effectiveStats.pas || 0);

    return {
        sutMenzili: 20 + Math.floor(vurus / 100) * 5,
        pasMenzili: 30 + Math.floor(pas / 50) * 5
    };
}

// Piyasa Değeri hesap katsayıları
// Not: Match-up başına gerçek rastgele değer, her sayfa yenilendiğinde
// değişmemesi için sabit €100.000 alınıyor (kullanıcı onayıyla, "rastgele
// olamıyorsa 100k sabitle" talebi).
const MARKET_VALUE_RATES = {
    goal: 500000,
    assist: 300000,
    matchup: 100000,
    criticalIntervention: 400000
};

function computeMarketValue(player) {
    const goals = Number(player.goals || 0);
    const assists = Number(player.assists || 0);
    const matchups = Number(player.matchups || 0);
    const criticalInterventions = Number(player.criticalInterventions || 0);

    return (
        goals * MARKET_VALUE_RATES.goal +
        assists * MARKET_VALUE_RATES.assist +
        matchups * MARKET_VALUE_RATES.matchup +
        criticalInterventions * MARKET_VALUE_RATES.criticalIntervention
    );
}

function formatEuro(amount) {
    return "€" + Number(amount || 0).toLocaleString("tr-TR");
}

const DEFAULT_STAT_CAP = 60;

// Canlı maç olay tipleri
const EVENT_TYPES = {
    gol: { label: "Gol", icon: "⚽" },
    sarikart: { label: "Sarı Kart", icon: "🟨" },
    kirmizikart: { label: "Kırmızı Kart", icon: "🟥" },
    matchup: { label: "Match-up", icon: "🔀" },
    kritik: { label: "Kritik Müdahale", icon: "🛡" }
};


// =====================================
// GENEL DURUM (STATE)
// =====================================

const state = {
    statCap: DEFAULT_STAT_CAP,
    currentPlayerId: null,
    currentTeamId: null,
    currentMatchId: null,
    allMatches: []
};


// =====================================
// YETKİ SİSTEMİ
// =====================================

const urlParams = new URLSearchParams(window.location.search);
const urlAdmin = urlParams.get("admin") === ADMIN_PASSWORD;

// Özel admin linki: .../adminkemal (klasör veya son parça olarak)
const pathParts = window.location.pathname.split("/").filter(Boolean);
const pathAdmin = pathParts[pathParts.length - 1] === "adminkemal";

const storedAdmin = localStorage.getItem("bluelockAdmin") === "1";

let isAdmin = urlAdmin || pathAdmin || storedAdmin;
window.isAdmin = isAdmin;

if ((urlAdmin || pathAdmin) && !storedAdmin) {
    localStorage.setItem("bluelockAdmin", "1");
}

console.log(isAdmin ? "ADMIN AKTİF" : "ZİYARETÇİ MODU");


window.adminLogin = function () {
    const pass = value("adminPasswordInput");

    if (pass === ADMIN_PASSWORD) {
        localStorage.setItem("bluelockAdmin", "1");
        isAdmin = true;
        window.isAdmin = true;
        applyPermissions();
        renderAdminPage();
        updateDashboard();
        alert("Admin girişi başarılı");
    } else {
        alert("Şifre hatalı");
    }
};

window.adminLogout = function () {
    localStorage.removeItem("bluelockAdmin");
    isAdmin = false;
    window.isAdmin = false;
    applyPermissions();
    renderAdminPage();
    updateDashboard();
    showPage("dashboard");
};


// =====================================
// GENEL YARDIMCILAR
// =====================================

function value(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.value.trim();
}

function number(id) {
    const v = value(id);
    return Number(v || 0);
}

function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function clear(id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

window.value = value;
window.number = number;
window.set = set;
window.clear = clear;


// =====================================
// SAYFA (TAB) SİSTEMİ
// =====================================

const PAGE_TITLES = {
    dashboard: "Ana Sayfa",
    players: "Oyuncular",
    playerProfile: "Oyuncu Profili",
    teams: "Takımlar",
    marketValue: "Piyasa Değeri",
    teamDetail: "Takım Detayı",
    league: "Lig",
    matchResults: "Maç Sonuçları",
    matchControl: "Maç Kontrolü",
    addPlayer: "Oyuncu Ekle",
    addTeam: "Takım Ekle",
    admin: "Admin Paneli"
};

window.showPage = function (pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.remove("hidden");

    document.querySelectorAll(".sidebar button[data-page]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === pageId);
    });

    const title = document.getElementById("pageTitle");
    if (title) title.innerHTML = PAGE_TITLES[pageId] || "";

    // Sayfaya girerken ilgili veriyi tazele
    if (pageId === "dashboard") { renderLiveMatches("dashboardLiveArea"); }
    if (pageId === "players") loadPlayers();
    if (pageId === "teams") loadTeams();
    if (pageId === "marketValue") loadMarketValueList();
    if (pageId === "league") { loadLeagueTable(); }
    if (pageId === "matchResults") { loadMatches(); loadMatchTeams(); renderLiveMatches("liveMatchesArea"); }
    if (pageId === "addPlayer") { loadTeamSelect(); renderCoreStatInputs(); }
    if (pageId === "admin") renderAdminPage();
};


// =====================================
// STAT SINIRI (SETTINGS)
// =====================================

async function loadSettings() {
    try {
        const ref = doc(db, "settings", "config");
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();
            state.statCap = Number(data.statCap) || DEFAULT_STAT_CAP;
        } else {
            state.statCap = DEFAULT_STAT_CAP;
        }
    } catch (error) {
        console.error("Ayarlar okunamadı, varsayılan sınır kullanılıyor.", error);
        state.statCap = DEFAULT_STAT_CAP;
    }

    const note = document.getElementById("statCapNote");
    if (note) note.innerHTML = `(0-${state.statCap} arası, takım buff'ı ile aşılabilir)`;

    const capInput = document.getElementById("globalStatCap");
    if (capInput) capInput.value = state.statCap;
}

window.saveStatCap = async function () {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const newCap = Number(value("globalStatCap") || DEFAULT_STAT_CAP);

    if (newCap <= 0) { alert("Geçerli bir sınır gir"); return; }

    await setDoc(doc(db, "settings", "config"), { statCap: newCap }, { merge: true });

    state.statCap = newCap;
    alert("Stat sınırı güncellendi: " + newCap);

    const note = document.getElementById("statCapNote");
    if (note) note.innerHTML = `(0-${state.statCap} arası, takım buff'ı ile aşılabilir)`;

    renderCoreStatInputs();
};


// =====================================
// TEMEL STAT INPUTLARINI OLUŞTUR
// (Oyuncu Ekle sayfası)
// =====================================

function renderCoreStatInputs() {
    const area = document.getElementById("coreStatInputs");
    if (!area) return;

    area.innerHTML = CORE_STATS.map(stat => `
        <div>
            <label>${stat.label} (0-${state.statCap})</label>
            <input class="coreStatInput" data-stat="${stat.key}" type="number" min="0" max="${state.statCap}" value="0">
        </div>
    `).join("");
}


// =====================================
// STAT TOPLAMA (temel + ek statlar)
// =====================================

function collectCoreStats() {
    const stats = {};

    document.querySelectorAll(".coreStatInput").forEach(input => {
        const key = input.dataset.stat;
        let val = Number(input.value || 0);

        // Temel giriş sınırı - sadece takım buff'ı bunu aşabilir, kullanıcı girişi aşamaz
        if (val > state.statCap) val = state.statCap;
        if (val < 0) val = 0;

        stats[key] = val;
    });

    return stats;
}

window.addStat = function () {
    const area = document.getElementById("statsContainer");
    if (!area) return;

    const row = document.createElement("div");
    row.className = "statRow formGrid";

    row.innerHTML = `
    <input class="statName" placeholder="Stat adı">
    <input class="statValue" type="number" placeholder="Değer">
    `;

    area.appendChild(row);
};

function collectExtraStats() {
    const stats = {};

    document.querySelectorAll(".statRow").forEach(row => {
        const name = row.querySelector(".statName")?.value;
        const val = row.querySelector(".statValue")?.value;

        if (name) stats[name] = Number(val || 0);
    });

    return stats;
}


// =====================================
// EFEKTİF STAT HESAPLAMA (base + takım buff)
// =====================================

function getEffectiveStats(player, team) {
    const base = player.stats || {};
    const buffs = team?.buffs || {};
    const effective = {};

    CORE_STATS.forEach(stat => {
        const b = Number(base[stat.key] || 0);
        const buff = Number(buffs[stat.key] || 0);
        effective[stat.key] = b + buff;
    });

    return effective;
}

function calculateRating(player, team) {
    const eff = getEffectiveStats(player, team);
    const values = CORE_STATS.map(s => eff[s.key] || 0);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return Math.round(avg);
}

function fillClass(value, cap) {
    if (value > cap) return "fill buffed";
    if (value >= cap * 0.9) return "fill top";
    if (value >= cap * 0.65) return "fill high";
    if (value >= cap * 0.4) return "fill mid";
    return "fill low";
}


// =====================================
// DASHBOARD
// =====================================

async function updateDashboard() {
    const playerSnap = await getDocs(collection(db, "players"));
    const teamSnap = await getDocs(collection(db, "teams"));
    const matchSnap = await getDocs(collection(db, "matches"));

    const playerCount = document.getElementById("playerCount");
    const teamCount = document.getElementById("teamCount");
    const matchCount = document.getElementById("matchCount");
    const totalGoalsCount = document.getElementById("totalGoalsCount");

    if (playerCount) playerCount.innerHTML = playerSnap.size;
    if (teamCount) teamCount.innerHTML = teamSnap.size;
    if (matchCount) matchCount.innerHTML = matchSnap.size;

    if (totalGoalsCount) {
        let totalGoals = 0;
        playerSnap.forEach(item => totalGoals += Number(item.data().goals || 0));
        totalGoalsCount.innerHTML = totalGoals;
    }

    const permText = document.getElementById("permissionText");
    const permBadge = document.getElementById("permissionBadge");

    if (permText) permText.innerHTML = isAdmin ? "Admin" : "Ziyaretçi";

    if (permBadge) {
        permBadge.innerHTML = isAdmin ? "Admin" : "Ziyaretçi";
        permBadge.className = isAdmin ? "adminBadge" : "visitorBadge";
    }

    await renderRecentMatches();
    await renderGoalKing();
    await renderAssistKing();
    await renderMarketValueTable();
}

window.updateDashboard = updateDashboard;


// =====================================
// TAKIM VERİSİ (yardımcı)
// =====================================

async function getTeamsData() {
    const snap = await getDocs(collection(db, "teams"));
    const teams = [];

    snap.forEach(item => teams.push({ id: item.id, ...item.data() }));

    return teams;
}

async function getTeamById(id) {
    if (!id) return null;

    const ref = doc(db, "teams", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return { id, ...snap.data() };
}


// =====================================
// OYUNCU VERİSİ HAZIRLA
// =====================================

async function createPlayerData() {
    let image = "";
    const file = document.getElementById("playerImage");

    if (file && file.files[0]) {
        image = await uploadPlayerImage(file.files[0]);
    }

    const team = document.getElementById("playerTeam");
    let teamId = "";
    let teamName = "";

    if (team && team.value) {
        teamId = team.value;
        teamName = team.options[team.selectedIndex].text;
    }

    return {
        name: value("playerName"),
        image: image,
        teamId: teamId,
        teamName: teamName,
        info: {
            position: value("playerPosition"),
            age: value("playerAge"),
            height: value("playerHeight"),
            weight: value("playerWeight")
        },
        stats: collectCoreStats(),
        extraStats: collectExtraStats(),
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        createdAt: new Date()
    };
}

window.savePlayer = async function () {
    try {
        const player = await createPlayerData();

        if (!player.name) {
            alert("Oyuncu adı gir");
            return;
        }

        await addDoc(collection(db, "players"), player);

        alert(player.image
            ? "Oyuncu eklendi (fotoğraf yüklendi ✅)"
            : "Oyuncu eklendi (fotoğraf yüklenMEDİ — dosya seçilmemiş ya da yükleme başarısız oldu)");
        clear("playerName");
        clear("playerPosition");
        clear("playerAge");
        clear("playerHeight");
        clear("playerWeight");
        document.querySelectorAll(".coreStatInput").forEach(i => i.value = 0);
        document.getElementById("statsContainer").innerHTML = "";

        updateDashboard();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

async function getPlayer(id) {
    const ref = doc(db, "players", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return { id, ...snap.data() };
}

async function getPlayersRanking() {
    const snap = await getDocs(collection(db, "players"));
    const players = [];

    snap.forEach(item => players.push({ id: item.id, ...item.data() }));

    return players;
}


// =====================================
// OYUNCULAR - DISCORD FORUM TARZI LİSTE
// =====================================

window.loadPlayers = async function () {
    const area = document.getElementById("playersList");
    if (!area) return;

    const [players, teams] = await Promise.all([getPlayersRanking(), getTeamsData()]);
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t);

    if (!players.length) {
        area.innerHTML = `<div class="forum-empty">Henüz oyuncu eklenmedi.</div>`;
        return;
    }

    area.innerHTML = players.map(p => {
        const team = teamMap[p.teamId] || null;
        const rating = calculateRating(p, team);

        return `
        <div class="forum-row" onclick="openPlayer('${p.id}')">
            <img class="forum-avatar" src="${p.image || ''}" onerror="this.style.visibility='hidden'">
            <div>
                <div class="forum-name">${escapeHtml(p.name)}</div>
                <div class="forum-sub">${escapeHtml(p.teamName || 'Takımsız')}</div>
            </div>
            <span>${escapeHtml(p.info?.position || '-')}</span>
            <span>${escapeHtml(p.teamName || 'Takımsız')}</span>
            <span class="forum-rating">${rating}</span>
            <span>⚽ ${p.goals || 0}</span>
            <span>🅰️ ${p.assists || 0}</span>
        </div>
        `;
    }).join("");
};


// =====================================
// OYUNCU PROFİLİ (FM TARZI - TAM SAYFA)
// =====================================

window.openPlayer = async function (id) {
    const player = await getPlayer(id);
    if (!player) return;

    state.currentPlayerId = id;
    window.currentPlayerId = id;

    const team = await getTeamById(player.teamId);
    const allTeams = await getTeamsData();
    const effective = getEffectiveStats(player, team);
    const rating = calculateRating(player, team);
    const cap = state.statCap;

    const area = document.getElementById("playerProfileArea");
    if (!area) return;

    const attributeRows = CORE_STATS.map(stat => {
        const val = effective[stat.key] || 0;
        const pct = Math.min(100, (val / cap) * 100);

        return `
        <div class="attribute">
            <div class="attribute-title">
                <span>${stat.label}</span>
                <span class="attVal">${val}/${cap}</span>
            </div>
            <div class="bar">
                <div class="${fillClass(val, cap)}" style="width:${pct}%;"></div>
            </div>
        </div>
        `;
    }).join("");

    const ranges = computeRangeStats(effective);
    const rangeRows = `
        <div class="attribute">
            <div class="attribute-title"><span>Şut Menzili</span><span class="attVal">${ranges.sutMenzili}m</span></div>
        </div>
        <div class="attribute">
            <div class="attribute-title"><span>Pas Menzili</span><span class="attVal">${ranges.pasMenzili}m</span></div>
        </div>
    `;

    const extraStatsHtml = Object.entries(player.extraStats || {}).map(([key, val]) => `
        <div class="attribute">
            <div class="attribute-title"><span>${escapeHtml(key)}</span><span class="attVal">${val}</span></div>
        </div>
    `).join("");

    area.innerHTML = `
    <div class="fm-card">
        <div class="fm-header">
            <img class="fm-photo" src="${player.image || ''}" onerror="this.style.visibility='hidden'">

            <div class="fm-info">
                <h2>${escapeHtml(player.name)}</h2>
                <h3>${escapeHtml(player.info?.position || '-')} / ${escapeHtml(player.teamName || 'Takımsız')}</h3>
                <div class="fm-meta">Yaş: ${escapeHtml(player.info?.age || '-')} · Boy: ${escapeHtml(player.info?.height || '-')} cm · Kilo: ${escapeHtml(player.info?.weight || '-')} kg</div>

                <div class="performance">
                    <span>⭐ Genel Rating: <strong>${rating}</strong></span>
                    <span>💰 Piyasa Değeri: <strong>${formatEuro(computeMarketValue(player))}</strong></span>
                    <span>🏟 ${player.matches || 0} Maç</span>
                    <span>⚽ ${player.goals || 0} Gol</span>
                    <span>🅰️ ${player.assists || 0} Asist</span>
                    <span>🔀 ${player.matchups || 0} Match-up</span>
                    <span>🛡 ${player.criticalInterventions || 0} Kritik Müdahale</span>
                    <span>🟨 ${player.yellowCards || 0}</span>
                    <span>🟥 ${player.redCards || 0}</span>
                </div>
            </div>
        </div>

        <div class="attribute-section">
            <h3>Öznitelikler ${team ? `<span class="capNote">(${escapeHtml(team.name)} buff'ları dahil)</span>` : ""}</h3>
            ${attributeRows}
            ${rangeRows}
        </div>

        ${extraStatsHtml ? `<div class="attribute-section"><h3>Ek Statlar</h3>${extraStatsHtml}</div>` : ""}

        <hr>

        <button class="btn ghost" onclick="editPlayer('${id}')">Bilgileri Düzenle</button>
        ${isAdmin ? `<button class="btn danger" onclick="deletePlayer('${id}')">Oyuncuyu Sil</button>` : ""}
    </div>

    ${!isAdmin ? `
    <div class="panel">
        <h3>📩 Stat Güncelleme Talebi Gönder</h3>
        <p class="capNote">Talebin admin panelinde görünür, admin onayladığında statını elle günceller.</p>

        <label>Stat</label>
        <select id="statReqKey">
            ${CORE_STATS.map(s => `<option value="${s.key}">${s.label}</option>`).join("")}
        </select>

        <label>Miktar (örn. 10)</label>
        <input id="statReqAmount" type="number" value="5">

        <label>Not (opsiyonel)</label>
        <textarea id="statReqNote" placeholder="Örn: son maçlarda çok pas attım, pasım artsın"></textarea>

        <button class="btn" onclick="sendStatRequest('${id}')">Talep Gönder</button>
    </div>
    ` : ""}

    ${isAdmin ? `
    <div class="panel">
        <h3>İstatistik Düzenle (Admin)</h3>

        <label>Takım</label>
        <select id="editPlayerTeam">
            <option value="">Takımsız</option>
            ${allTeams.map(t => `<option value="${t.id}" ${t.id === player.teamId ? "selected" : ""}>${escapeHtml(t.name)}</option>`).join("")}
        </select>

        <div class="formGrid" id="adminCoreStatEdit">
            ${CORE_STATS.map(stat => `
                <div>
                    <label>${stat.label} (0-${cap})</label>
                    <input class="adminStatEdit" data-stat="${stat.key}" type="number" min="0" max="${cap}" value="${player.stats?.[stat.key] || 0}">
                </div>
            `).join("")}
        </div>

        <hr>

        <div class="formGrid">
            <div><label>Gol</label><input id="editGoals" type="number" value="${player.goals || 0}"></div>
            <div><label>Asist</label><input id="editAssists" type="number" value="${player.assists || 0}"></div>
            <div><label>Match-up</label><input id="editMatchups" type="number" value="${player.matchups || 0}"></div>
            <div><label>Kritik Müdahale</label><input id="editCriticalInterventions" type="number" value="${player.criticalInterventions || 0}"></div>
            <div><label>Maç</label><input id="editMatches" type="number" value="${player.matches || 0}"></div>
            <div><label>Sarı Kart</label><input id="editYellow" type="number" value="${player.yellowCards || 0}"></div>
            <div><label>Kırmızı Kart</label><input id="editRed" type="number" value="${player.redCards || 0}"></div>
        </div>

        <button class="btn" onclick="updatePlayerStats('${id}')">Kaydet</button>
    </div>
    ` : ""}
    `;

    showPage("playerProfile");
};

window.updatePlayerStats = async function (id) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const ref = doc(db, "players", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const cap = state.statCap;
    const stats = {};

    document.querySelectorAll(".adminStatEdit").forEach(input => {
        let val = Number(input.value || 0);
        if (val > cap) val = cap;
        if (val < 0) val = 0;
        stats[input.dataset.stat] = val;
    });

    const teamSelect = document.getElementById("editPlayerTeam");
    const teamId = teamSelect ? teamSelect.value : (snap.data().teamId || "");
    let teamName = "";
    if (teamId) {
        const t = await getTeamById(teamId);
        teamName = t ? t.name : "";
    }

    await updateDoc(ref, {
        stats: stats,
        teamId: teamId,
        teamName: teamName,
        goals: Number(value("editGoals") || 0),
        assists: Number(value("editAssists") || 0),
        matchups: Number(value("editMatchups") || 0),
        criticalInterventions: Number(value("editCriticalInterventions") || 0),
        matches: Number(value("editMatches") || 0),
        yellowCards: Number(value("editYellow") || 0),
        redCards: Number(value("editRed") || 0)
    });

    alert("Oyuncu istatistikleri güncellendi");
    openPlayer(id);
    updateDashboard();
};


// =====================================
// OYUNCU BİLGİ DÜZENLEME (modal)
// =====================================

window.editPlayer = async function (id) {
    const player = await getPlayer(id);
    if (!player) return;

    const modal = document.getElementById("playerEditModal");
    const box = document.getElementById("playerEditArea");
    if (!modal || !box) return;

    box.innerHTML = `
    <h2>${escapeHtml(player.name)} Düzenle</h2>

    <label>İsim</label>
    <input id="editName" value="${escapeHtml(player.name || '')}">

    <label>Mevki</label>
    <input id="editPosition" value="${escapeHtml(player.info?.position || '')}">

    <label>Yaş</label>
    <input id="editAge" value="${escapeHtml(player.info?.age || '')}">

    <label>Boy</label>
    <input id="editHeight" value="${escapeHtml(player.info?.height || '')}">

    <label>Kilo</label>
    <input id="editWeight" value="${escapeHtml(player.info?.weight || '')}">

    <button class="btn" onclick="savePlayerEdit('${id}')">Kaydet</button>
    `;

    modal.classList.remove("hidden");
};

window.savePlayerEdit = async function (id) {
    try {
        const ref = doc(db, "players", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        await updateDoc(ref, {
            name: value("editName"),
            info: {
                position: value("editPosition"),
                age: value("editAge"),
                height: value("editHeight"),
                weight: value("editWeight")
            }
        });

        alert("Oyuncu güncellendi");
        closeModal("playerEditModal");
        openPlayer(id);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.deletePlayer = async function (id) {
    if (!isAdmin) { alert("Bu işlem için admin yetkisi gerekli"); return; }

    if (!confirm("Oyuncu tamamen silinsin mi?")) return;

    await deleteDoc(doc(db, "players", id));
    showPage("players");
    updateDashboard();
};


// =====================================
// TAKIMLAR
// =====================================

window.loadTeams = async function () {
    const area = document.getElementById("teamsList");
    if (!area) return;

    const teams = await getTeamsData();

    if (!teams.length) {
        area.innerHTML = `<div class="forum-empty">Henüz takım eklenmedi.</div>`;
        return;
    }

    area.innerHTML = teams.map(team => {
        const buffs = team.buffs || {};
        const buffTags = CORE_STATS
            .filter(s => Number(buffs[s.key] || 0) !== 0)
            .map(s => `<span class="buffTag">${s.label} +${buffs[s.key]}</span>`)
            .join("");

        return `
        <div class="team-card" onclick="openTeam('${team.id}')">
            ${team.logo ? `<img src="${team.logo}" onerror="this.style.display='none'">` : ""}
            <h3>${escapeHtml(team.name)}</h3>
            <div class="teamMini">
                <span>🏆 ${team.points || 0} P</span>
                <span>⚽ ${team.goals || 0}</span>
                <span>🥅 ${team.conceded || 0}</span>
            </div>
            ${buffTags ? `<div class="buffTagRow">${buffTags}</div>` : ""}
        </div>
        `;
    }).join("");
};

window.openTeam = async function (id) {
    const team = await getTeamById(id);
    if (!team) return;

    state.currentTeamId = id;
    window.currentTeamId = id;

    const area = document.getElementById("teamDetailArea");
    if (!area) return;

    const buffs = team.buffs || {};
    const buffRows = CORE_STATS.map(s => `
        <div class="attribute">
            <div class="attribute-title"><span>${s.label}</span><span class="attVal">+${buffs[s.key] || 0}</span></div>
        </div>
    `).join("");

    area.innerHTML = `
    <div class="fm-card">
        <div class="fm-header">
            ${team.logo ? `<img class="fm-photo" src="${team.logo}" onerror="this.style.visibility='hidden'">` : ""}
            <div class="fm-info">
                <h2>${escapeHtml(team.name)}</h2>
                <div class="performance">
                    <span>🏆 Puan: <strong>${team.points || 0}</strong></span>
                    <span>✅ Galibiyet: ${team.wins || 0}</span>
                    <span>🤝 Beraberlik: ${team.draws || 0}</span>
                    <span>❌ Mağlubiyet: ${team.losses || 0}</span>
                    <span>⚽ Attığı Gol: ${team.goals || 0}</span>
                    <span>🥅 Yediği Gol: ${team.conceded || 0}</span>
                </div>
            </div>
        </div>

        <div class="attribute-section">
            <h3>Takım Buffları <span class="capNote">(Admin Paneli'nden düzenlenir)</span></h3>
            ${buffRows}
        </div>

        <hr>
        <button class="btn ghost" onclick="editTeamName('${id}')">Takım Adını Düzenle</button>
        ${isAdmin ? `<button class="btn danger" onclick="deleteTeam('${id}')">Takımı Sil</button>` : ""}
    </div>

    ${isAdmin ? `
    <div class="panel">
        <h3>Takım İstatistik Düzenle (Admin)</h3>
        <div class="formGrid">
            <div><label>Puan</label><input id="editTeamPoints" type="number" value="${team.points || 0}"></div>
            <div><label>Galibiyet</label><input id="editTeamWins" type="number" value="${team.wins || 0}"></div>
            <div><label>Beraberlik</label><input id="editTeamDraws" type="number" value="${team.draws || 0}"></div>
            <div><label>Mağlubiyet</label><input id="editTeamLosses" type="number" value="${team.losses || 0}"></div>
            <div><label>Attığı Gol</label><input id="editTeamGoals" type="number" value="${team.goals || 0}"></div>
            <div><label>Yediği Gol</label><input id="editTeamConceded" type="number" value="${team.conceded || 0}"></div>
        </div>
        <button class="btn" onclick="updateTeamStats('${id}')">Kaydet</button>
    </div>
    ` : ""}
    `;

    showPage("teamDetail");
};

window.editTeamName = async function (id) {
    const team = await getTeamById(id);
    if (!team) return;

    const name = prompt("Takım adı", team.name);
    if (!name) return;

    await updateDoc(doc(db, "teams", id), { name });
    openTeam(id);
    loadTeams();
};

window.updateTeamStats = async function (id) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    await updateDoc(doc(db, "teams", id), {
        points: Number(value("editTeamPoints") || 0),
        wins: Number(value("editTeamWins") || 0),
        draws: Number(value("editTeamDraws") || 0),
        losses: Number(value("editTeamLosses") || 0),
        goals: Number(value("editTeamGoals") || 0),
        conceded: Number(value("editTeamConceded") || 0)
    });

    alert("Takım güncellendi");
    openTeam(id);
    loadLeagueTable();
};

window.deleteTeam = async function (id) {
    if (!isAdmin) { alert("Yetkin yok"); return; }
    if (!confirm("Takım silinsin mi?")) return;

    await deleteDoc(doc(db, "teams", id));
    showPage("teams");
    updateDashboard();
};


// =====================================
// TAKIM SEÇİM LİSTELERİ
// =====================================

window.loadTeamSelect = async function () {
    const select = document.getElementById("playerTeam");
    if (!select) return;

    select.innerHTML = `<option value="">Takım Seç</option>`;

    const teams = await getTeamsData();
    teams.forEach(team => {
        select.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
    });
};

window.loadMatchTeams = async function () {
    const selects = ["homeTeam", "awayTeam", "liveHomeTeam", "liveAwayTeam"];
    const teams = await getTeamsData();

    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        select.innerHTML = `<option value="">Takım</option>`;
        teams.forEach(team => {
            select.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
        });
    });
};

window.saveTeam = async function () {
    if (!isAdmin) { alert("Bu işlem için admin yetkisi gerekli"); return; }

    const name = value("teamName");
    if (!name) { alert("Takım adı gerekli"); return; }

    let logo = "";
    const logoFile = document.getElementById("teamLogo");

    if (logoFile && logoFile.files[0]) {
        try {
            logo = await uploadPlayerImage(logoFile.files[0]);
        } catch (error) {
            console.error(error);
            alert(error.message);
            return;
        }
    }

    const emptyBuffs = {};
    CORE_STATS.forEach(s => emptyBuffs[s.key] = 0);

    await addDoc(collection(db, "teams"), {
        name,
        logo,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        conceded: 0,
        buffs: emptyBuffs,
        createdAt: new Date()
    });

    alert("Takım oluşturuldu");
    clear("teamName");
    if (logoFile) logoFile.value = "";

    updateDashboard();
};


// =====================================
// LİG TABLOSU (Puan, Averaj, Gol)
// =====================================

window.loadLeagueTable = async function () {
    const area = document.getElementById("leagueTable");
    if (!area) return;

    let teams = await getTeamsData();

    teams.forEach(t => {
        t.played = (t.wins || 0) + (t.draws || 0) + (t.losses || 0);
        t.diff = (t.goals || 0) - (t.conceded || 0);
    });

    teams.sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        if (b.diff !== a.diff) return b.diff - a.diff;
        return (b.goals || 0) - (a.goals || 0);
    });

    if (!teams.length) {
        area.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#64748b;">Henüz takım eklenmedi.</td></tr>`;
        return;
    }

    area.innerHTML = teams.map((team, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(team.name)}</strong></td>
            <td>${team.played}</td>
            <td>${team.wins || 0}</td>
            <td>${team.draws || 0}</td>
            <td>${team.losses || 0}</td>
            <td>${team.goals || 0}</td>
            <td>${team.conceded || 0}</td>
            <td>${team.diff > 0 ? "+" : ""}${team.diff}</td>
            <td><strong>${team.points || 0}</strong></td>
        </tr>
    `).join("");
};


// =====================================
// MAÇ SİSTEMİ
// =====================================

window.addMatchResult = async function () {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const home = value("homeTeam");
    const away = value("awayTeam");
    const homeGoals = Number(value("homeGoals"));
    const awayGoals = Number(value("awayGoals"));

    if (!home || !away) { alert("Takım seç"); return; }
    if (home === away) { alert("Aynı takım seçilemez"); return; }

    const homeRef = doc(db, "teams", home);
    const awayRef = doc(db, "teams", away);

    const homeSnap = await getDoc(homeRef);
    const awaySnap = await getDoc(awayRef);
    if (!homeSnap.exists() || !awaySnap.exists()) return;

    const h = homeSnap.data();
    const a = awaySnap.data();

    let hPoints = h.points || 0, aPoints = a.points || 0;
    let hWins = h.wins || 0, aWins = a.wins || 0;
    let hDraws = h.draws || 0, aDraws = a.draws || 0;
    let hLoss = h.losses || 0, aLoss = a.losses || 0;

    if (homeGoals > awayGoals) { hPoints += 3; hWins++; aLoss++; }
    else if (homeGoals < awayGoals) { aPoints += 3; aWins++; hLoss++; }
    else { hPoints += 1; aPoints += 1; hDraws++; aDraws++; }

    await updateDoc(homeRef, {
        points: hPoints, wins: hWins, draws: hDraws, losses: hLoss,
        goals: (h.goals || 0) + homeGoals, conceded: (h.conceded || 0) + awayGoals
    });

    await updateDoc(awayRef, {
        points: aPoints, wins: aWins, draws: aDraws, losses: aLoss,
        goals: (a.goals || 0) + awayGoals, conceded: (a.conceded || 0) + homeGoals
    });

    await addDoc(collection(db, "matches"), {
        homeId: home, awayId: away,
        homeName: h.name, awayName: a.name,
        homeGoals, awayGoals,
        createdAt: new Date()
    });

    loadLeagueTable();
    loadMatches();
    loadTeams();
};

window.loadMatches = async function () {
    const area = document.getElementById("matchesList");
    if (!area) return;

    const snap = await getDocs(collection(db, "matches"));
    const matches = [];
    snap.forEach(item => matches.push({ id: item.id, ...item.data() }));

    // en yeni maç en üstte
    matches.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
    });

    if (!matches.length) {
        area.innerHTML = `<div class="forum-empty">Henüz maç oynanmadı.</div>`;
        return;
    }

    area.innerHTML = matches.map(match => `
        <div class="leagueRow" style="background:#111827;padding:12px 16px;border-radius:10px;margin:5px 0;display:flex;justify-content:space-between;align-items:center;">
            <strong>${escapeHtml(match.homeName)} ${match.homeGoals} - ${match.awayGoals} ${escapeHtml(match.awayName)}</strong>
            ${isAdmin ? `<button class="btn danger small" onclick="deleteMatch('${match.id}')">Sil</button>` : ""}
        </div>
    `).join("");
};

window.deleteMatch = async function (id) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const ok = confirm(
        "Bu maç sonucu geçmişten silinsin mi?\n\n" +
        "Not: Bu işlem takımların Puan/Galibiyet/Gol istatistiklerini otomatik olarak geri almaz. " +
        "Gerekirse ilgili takımların istatistiklerini Takım Detayı sayfasından elle düzelt."
    );
    if (!ok) return;

    await deleteDoc(doc(db, "matches", id));
    loadMatches();
};


// =====================================
// CANLI MAÇ SİSTEMİ
// =====================================

function newEventId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "ev_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

// Firestore "matches" koleksiyonunu canlı dinler, her değişimde
// dashboard / maç sonuçları / maç kontrol panelini günceller.
function startMatchesListener() {
    onSnapshot(collection(db, "matches"), (snap) => {
        const matches = [];
        snap.forEach(item => matches.push({ id: item.id, ...item.data() }));
        state.allMatches = matches;

        renderLiveMatches("dashboardLiveArea");
        renderLiveMatches("liveMatchesArea");

        if (state.currentMatchId) {
            const current = matches.find(m => m.id === state.currentMatchId);
            if (current) renderMatchControl(current);
        }
    }, (error) => {
        console.error("Maç dinleyici hatası:", error);
    });
}

window.startLiveMatch = async function () {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const home = value("liveHomeTeam");
    const away = value("liveAwayTeam");

    if (!home || !away) { alert("İki takım da seçilmeli"); return; }
    if (home === away) { alert("Aynı takım seçilemez"); return; }

    const homeTeam = await getTeamById(home);
    const awayTeam = await getTeamById(away);
    if (!homeTeam || !awayTeam) return;

    await addDoc(collection(db, "matches"), {
        homeId: home, awayId: away,
        homeName: homeTeam.name, awayName: awayTeam.name,
        homeGoals: 0, awayGoals: 0,
        status: "live",
        events: [],
        createdAt: new Date()
    });

    alert("Canlı maç başlatıldı");
};

// Misafirlerin de gördüğü canlı maç(lar) bölümü — dashboard ve Maç Sonuçları'nda kullanılır.
window.renderLiveMatches = function (containerId) {
    const area = document.getElementById(containerId);
    if (!area) return;

    const liveMatches = (state.allMatches || []).filter(m => m.status === "live");

    if (!liveMatches.length) {
        area.innerHTML = "";
        return;
    }

    area.innerHTML = liveMatches.map(match => {
        const events = (match.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

        const timeline = events.length ? events.map(ev => renderEventLine(ev)).join("") : `<div class="capNote">Henüz olay yok.</div>`;

        return `
        <div class="fm-card" style="margin-bottom:18px;border-color:#dc2626;">
            <div class="fm-header" style="justify-content:space-between;">
                <div class="fm-info">
                    <h2 style="display:flex;align-items:center;gap:10px;">
                        <span class="liveDot"></span> CANLI
                    </h2>
                    <h3>${escapeHtml(match.homeName)} <span style="color:#fff;font-size:22px;">${match.homeGoals ?? 0} - ${match.awayGoals ?? 0}</span> ${escapeHtml(match.awayName)}</h3>
                </div>
                ${isAdmin ? `<button class="btn" onclick="openMatchControl('${match.id}')">Maçı Yönet</button>` : ""}
            </div>
            <div class="attribute-section">
                <h3>Dakika Dakika</h3>
                ${timeline}
            </div>
        </div>
        `;
    }).join("");
};

function eventDescription(ev) {
    if (ev.type === "gol") {
        return `${escapeHtml(ev.scorerName)}${ev.assistName ? ` (asist: ${escapeHtml(ev.assistName)})` : ""} — ${escapeHtml(ev.teamName)}`;
    }
    if (ev.type === "sarikart" || ev.type === "kirmizikart" || ev.type === "kritik") {
        return `${escapeHtml(ev.playerName)} — ${escapeHtml(ev.teamName)}`;
    }
    if (ev.type === "matchup") {
        return `${escapeHtml(ev.playerAName)} vs ${escapeHtml(ev.playerBName)} — kazanan: <strong>${escapeHtml(ev.winnerName)}</strong>`;
    }
    return "";
}

function renderEventLine(ev) {
    const meta = EVENT_TYPES[ev.type] || { label: ev.type, icon: "•" };

    return `
    <div class="eventLine">
        <span class="eventMinute">${ev.minute}'</span>
        <span class="eventIcon">${meta.icon}</span>
        <span>${eventDescription(ev)}</span>
    </div>
    `;
}

window.openMatchControl = function (matchId) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    state.currentMatchId = matchId;
    window.currentMatchId = matchId;

    const match = (state.allMatches || []).find(m => m.id === matchId);
    if (match) renderMatchControl(match);

    showPage("matchControl");
};

async function renderMatchControl(match) {
    const area = document.getElementById("matchControlArea");
    if (!area) return;

    if (match.status === "finished") {
        area.innerHTML = `
        <div class="fm-card">
            <h2>${escapeHtml(match.homeName)} ${match.homeGoals} - ${match.awayGoals} ${escapeHtml(match.awayName)}</h2>
            <p class="capNote">Bu maç sona erdi, istatistikler oyunculara işlendi.</p>
        </div>
        `;
        return;
    }

    const homePlayers = await getPlayersByTeam(match.homeId);
    const awayPlayers = await getPlayersByTeam(match.awayId);
    const allPlayers = [...homePlayers, ...awayPlayers];

    const events = (match.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

    area.innerHTML = `
    <div class="fm-card" style="border-color:#dc2626;">
        <div class="fm-header" style="justify-content:space-between;">
            <div class="fm-info">
                <h2 style="display:flex;align-items:center;gap:10px;"><span class="liveDot"></span> CANLI</h2>
                <h3>${escapeHtml(match.homeName)} <span style="color:#fff;font-size:22px;">${match.homeGoals ?? 0} - ${match.awayGoals ?? 0}</span> ${escapeHtml(match.awayName)}</h3>
            </div>
            <button class="btn danger" onclick="finishLiveMatch('${match.id}')">🏁 Maçı Bitir</button>
        </div>
    </div>

    <div class="panel">
        <h3>Olay Ekle</h3>

        <div class="formGrid">
            <div>
                <label>Dakika</label>
                <input id="evMinute" type="number" min="0" max="130" placeholder="Örn: 23">
            </div>
            <div>
                <label>Olay Tipi</label>
                <select id="evType" onchange="renderEventForm('${match.id}')">
                    ${Object.entries(EVENT_TYPES).map(([key, meta]) => `<option value="${key}">${meta.icon} ${meta.label}</option>`).join("")}
                </select>
            </div>
        </div>

        <div id="evExtraFields"></div>

        <button class="btn" onclick="addMatchEvent('${match.id}')">Olayı Ekle</button>
    </div>

    <div class="panel">
        <h3>Maç Zaman Çizelgesi</h3>
        <div id="eventListArea">
            ${events.length ? events.map(ev => `
                <div class="eventLine">
                    <span class="eventMinute">${ev.minute}'</span>
                    <span class="eventIcon">${(EVENT_TYPES[ev.type] || {}).icon || "•"}</span>
                    <span style="flex:1;">${eventDescription(ev)}</span>
                    <button class="btn danger small" onclick="deleteMatchEvent('${match.id}','${ev.id}')">Sil</button>
                </div>
            `).join("") : `<div class="capNote">Henüz olay yok.</div>`}
        </div>
    </div>
    `;

    // Bu maça özel oyuncu listesini global'e koy (form render'ları kullanıyor)
    window._matchControlPlayers = { home: homePlayers, away: awayPlayers, all: allPlayers, match };

    renderEventForm(match.id);
}

async function getPlayersByTeam(teamId) {
    const all = await getPlayersRanking();
    return all.filter(p => p.teamId === teamId);
}

window.renderEventForm = function (matchId) {
    const type = value("evType");
    const area = document.getElementById("evExtraFields");
    if (!area) return;

    const ctx = window._matchControlPlayers;
    if (!ctx) return;

    const { home, away, all, match } = ctx;

    const teamOptionsHtml = `
        <option value="${match.homeId}">${escapeHtml(match.homeName)}</option>
        <option value="${match.awayId}">${escapeHtml(match.awayName)}</option>
    `;

    function playerOptions(list) {
        return list.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
    }

    if (type === "gol") {
        area.innerHTML = `
        <label>Takım</label>
        <select id="evTeam" onchange="refreshEventPlayerOptions()">${teamOptionsHtml}</select>

        <label>Golü Atan</label>
        <select id="evScorer"></select>

        <label>Asist Yapan (opsiyonel)</label>
        <select id="evAssist"><option value="">Yok</option></select>
        `;
        refreshEventPlayerOptions();
    } else if (type === "sarikart" || type === "kirmizikart" || type === "kritik") {
        area.innerHTML = `
        <label>Takım</label>
        <select id="evTeam" onchange="refreshEventPlayerOptions()">${teamOptionsHtml}</select>

        <label>Oyuncu</label>
        <select id="evPlayer"></select>
        `;
        refreshEventPlayerOptions();
    } else if (type === "matchup") {
        area.innerHTML = `
        <label>1. Oyuncu</label>
        <select id="evPlayerA">${playerOptions(all)}</select>

        <label>2. Oyuncu</label>
        <select id="evPlayerB">${playerOptions(all)}</select>

        <label>Kazanan</label>
        <select id="evWinner">${playerOptions(all)}</select>
        `;
    }
};

window.refreshEventPlayerOptions = function () {
    const ctx = window._matchControlPlayers;
    if (!ctx) return;

    const teamId = value("evTeam");
    const list = teamId === ctx.match.homeId ? ctx.home : ctx.away;

    const scorerSelect = document.getElementById("evScorer");
    const assistSelect = document.getElementById("evAssist");
    const playerSelect = document.getElementById("evPlayer");

    const opts = list.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");

    if (scorerSelect) scorerSelect.innerHTML = opts;
    if (assistSelect) assistSelect.innerHTML = `<option value="">Yok</option>` + opts;
    if (playerSelect) playerSelect.innerHTML = opts;
};

window.addMatchEvent = async function (matchId) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const minute = Number(value("evMinute"));
    const type = value("evType");

    if (!minute && minute !== 0) { alert("Dakika gir"); return; }

    const ctx = window._matchControlPlayers;
    if (!ctx) return;

    const matchRef = doc(db, "matches", matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;

    const match = snap.data();
    const events = match.events || [];

    let event = { id: newEventId(), minute, type };
    let homeGoals = match.homeGoals || 0;
    let awayGoals = match.awayGoals || 0;

    if (type === "gol") {
        const teamId = value("evTeam");
        const scorerId = value("evScorer");
        const assistId = value("evAssist");

        const scorer = ctx.all.find(p => p.id === scorerId);
        if (!scorer) { alert("Golü atan oyuncuyu seç"); return; }

        const assist = assistId ? ctx.all.find(p => p.id === assistId) : null;
        const teamName = teamId === match.homeId ? match.homeName : match.awayName;

        event = {
            ...event,
            teamId, teamName,
            scorerId, scorerName: scorer.name,
            assistId: assistId || "", assistName: assist ? assist.name : ""
        };

        if (teamId === match.homeId) homeGoals++; else awayGoals++;

    } else if (type === "sarikart" || type === "kirmizikart" || type === "kritik") {
        const teamId = value("evTeam");
        const playerId = value("evPlayer");
        const player = ctx.all.find(p => p.id === playerId);
        if (!player) { alert("Oyuncu seç"); return; }

        const teamName = teamId === match.homeId ? match.homeName : match.awayName;

        event = { ...event, teamId, teamName, playerId, playerName: player.name };

    } else if (type === "matchup") {
        const playerAId = value("evPlayerA");
        const playerBId = value("evPlayerB");
        const winnerId = value("evWinner");

        const playerA = ctx.all.find(p => p.id === playerAId);
        const playerB = ctx.all.find(p => p.id === playerBId);
        const winner = ctx.all.find(p => p.id === winnerId);

        if (!playerA || !playerB || !winner) { alert("Oyuncuları seç"); return; }
        if (playerAId === playerBId) { alert("Aynı oyuncu iki tarafta olamaz"); return; }

        event = {
            ...event,
            playerAId, playerAName: playerA.name,
            playerBId, playerBName: playerB.name,
            winnerId, winnerName: winner.name
        };
    }

    events.push(event);

    await updateDoc(matchRef, { events, homeGoals, awayGoals });

    clear("evMinute");
};

window.deleteMatchEvent = async function (matchId, eventId) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const matchRef = doc(db, "matches", matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;

    const match = snap.data();
    const events = match.events || [];
    const removed = events.find(e => e.id === eventId);
    const remaining = events.filter(e => e.id !== eventId);

    let homeGoals = match.homeGoals || 0;
    let awayGoals = match.awayGoals || 0;

    if (removed && removed.type === "gol") {
        if (removed.teamId === match.homeId) homeGoals = Math.max(0, homeGoals - 1);
        else awayGoals = Math.max(0, awayGoals - 1);
    }

    await updateDoc(matchRef, { events: remaining, homeGoals, awayGoals });
};

// Maçı bitirir: tüm olayları oyuncu istatistiklerine işler, takım puan
// durumunu günceller ve maçı "finished" olarak işaretler.
window.finishLiveMatch = async function (matchId) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    if (!confirm("Maç bitirilsin mi? Tüm olaylar oyuncu istatistiklerine işlenecek, bu işlem geri alınamaz.")) return;

    const matchRef = doc(db, "matches", matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;

    const match = snap.data();
    if (match.status === "finished") { alert("Bu maç zaten bitirilmiş"); return; }

    const events = match.events || [];
    const participantIds = new Set();

    for (const ev of events) {
        if (ev.type === "gol") {
            await updateDoc(doc(db, "players", ev.scorerId), { goals: increment(1) });
            participantIds.add(ev.scorerId);

            if (ev.assistId) {
                await updateDoc(doc(db, "players", ev.assistId), { assists: increment(1) });
                participantIds.add(ev.assistId);
            }
        } else if (ev.type === "sarikart") {
            await updateDoc(doc(db, "players", ev.playerId), { yellowCards: increment(1) });
            participantIds.add(ev.playerId);
        } else if (ev.type === "kirmizikart") {
            await updateDoc(doc(db, "players", ev.playerId), { redCards: increment(1) });
            participantIds.add(ev.playerId);
        } else if (ev.type === "kritik") {
            await updateDoc(doc(db, "players", ev.playerId), { criticalInterventions: increment(1) });
            participantIds.add(ev.playerId);
        } else if (ev.type === "matchup") {
            await updateDoc(doc(db, "players", ev.winnerId), { matchups: increment(1) });
            participantIds.add(ev.playerAId);
            participantIds.add(ev.playerBId);
        }
    }

    for (const playerId of participantIds) {
        await updateDoc(doc(db, "players", playerId), { matches: increment(1) });
    }

    // Takım puan durumunu güncelle (mevcut hızlı sonuç mantığıyla aynı)
    const homeRef = doc(db, "teams", match.homeId);
    const awayRef = doc(db, "teams", match.awayId);
    const homeSnap = await getDoc(homeRef);
    const awaySnap = await getDoc(awayRef);

    if (homeSnap.exists() && awaySnap.exists()) {
        const h = homeSnap.data();
        const a = awaySnap.data();
        const homeGoals = match.homeGoals || 0;
        const awayGoals = match.awayGoals || 0;

        let hPoints = h.points || 0, aPoints = a.points || 0;
        let hWins = h.wins || 0, aWins = a.wins || 0;
        let hDraws = h.draws || 0, aDraws = a.draws || 0;
        let hLoss = h.losses || 0, aLoss = a.losses || 0;

        if (homeGoals > awayGoals) { hPoints += 3; hWins++; aLoss++; }
        else if (homeGoals < awayGoals) { aPoints += 3; aWins++; hLoss++; }
        else { hPoints += 1; aPoints += 1; hDraws++; aDraws++; }

        await updateDoc(homeRef, {
            points: hPoints, wins: hWins, draws: hDraws, losses: hLoss,
            goals: (h.goals || 0) + homeGoals, conceded: (h.conceded || 0) + awayGoals
        });

        await updateDoc(awayRef, {
            points: aPoints, wins: aWins, draws: aDraws, losses: aLoss,
            goals: (a.goals || 0) + awayGoals, conceded: (a.conceded || 0) + homeGoals
        });
    }

    await updateDoc(matchRef, { status: "finished", finishedAt: new Date() });

    alert("Maç bitirildi, istatistikler işlendi");
    state.currentMatchId = null;
    window.currentMatchId = null;

    showPage("matchResults");
    loadLeagueTable();
    loadTeams();
    updateDashboard();
};


// =====================================
// ANA SAYFA - SON MAÇLAR / GOL VE ASİST KRALLIĞI (TABLO)
// =====================================

function tableRowsHtml(colCount, rowsHtml, emptyText) {
    if (!rowsHtml.length) {
        return `<tr><td colspan="${colCount}" class="forum-empty">${emptyText}</td></tr>`;
    }
    return rowsHtml.join("");
}

window.renderRecentMatches = async function () {
    const area = document.getElementById("recentMatchesTable");
    if (!area) return;

    const snap = await getDocs(collection(db, "matches"));
    const matches = [];
    snap.forEach(item => matches.push({ id: item.id, ...item.data() }));

    matches.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
    });

    const rows = matches.slice(0, 5).map(m => {
        const date = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString("tr-TR") : "-";
        return `
        <tr>
            <td>${date}</td>
            <td>${escapeHtml(m.homeName)} - ${escapeHtml(m.awayName)}</td>
            <td><strong>${m.homeGoals} - ${m.awayGoals}</strong></td>
        </tr>
        `;
    });

    area.innerHTML = tableRowsHtml(3, rows, "Henüz maç oynanmadı");
};

window.renderGoalKing = async function () {
    const area = document.getElementById("goalKingTable");
    if (!area) return;

    const [players, teams] = await Promise.all([getPlayersRanking(), getTeamsData()]);
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t);

    players.sort((a, b) => (b.goals || 0) - (a.goals || 0));

    const rows = players.filter(p => (p.goals || 0) > 0).slice(0, 5).map(p => `
        <tr onclick="openPlayer('${p.id}')" style="cursor:pointer;">
            <td>${escapeHtml(p.name)}</td>
            <td class="forum-sub">${escapeHtml((teamMap[p.teamId] || {}).name || "Takımsız")}</td>
            <td><strong>${p.goals}</strong></td>
        </tr>
    `);

    area.innerHTML = tableRowsHtml(3, rows, "Veri yok");
};

window.renderAssistKing = async function () {
    const area = document.getElementById("assistKingTable");
    if (!area) return;

    const [players, teams] = await Promise.all([getPlayersRanking(), getTeamsData()]);
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t);

    players.sort((a, b) => (b.assists || 0) - (a.assists || 0));

    const rows = players.filter(p => (p.assists || 0) > 0).slice(0, 5).map(p => `
        <tr onclick="openPlayer('${p.id}')" style="cursor:pointer;">
            <td>${escapeHtml(p.name)}</td>
            <td class="forum-sub">${escapeHtml((teamMap[p.teamId] || {}).name || "Takımsız")}</td>
            <td><strong>${p.assists}</strong></td>
        </tr>
    `);

    area.innerHTML = tableRowsHtml(3, rows, "Veri yok");
};


// =====================================
// PİYASA DEĞERİ
// =====================================

window.renderMarketValueTable = async function () {
    const area = document.getElementById("marketValueTable");
    if (!area) return;

    const [players, teams] = await Promise.all([getPlayersRanking(), getTeamsData()]);
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t);

    players.sort((a, b) => computeMarketValue(b) - computeMarketValue(a));

    const rows = players.filter(p => computeMarketValue(p) > 0).slice(0, 5).map(p => `
        <tr onclick="openPlayer('${p.id}')" style="cursor:pointer;">
            <td>${escapeHtml(p.name)}</td>
            <td class="forum-sub">${escapeHtml((teamMap[p.teamId] || {}).name || "Takımsız")}</td>
            <td><strong>${formatEuro(computeMarketValue(p))}</strong></td>
        </tr>
    `);

    area.innerHTML = tableRowsHtml(3, rows, "Veri yok");
};

window.loadMarketValueList = async function () {
    const area = document.getElementById("marketValueList");
    if (!area) return;

    const [players, teams] = await Promise.all([getPlayersRanking(), getTeamsData()]);
    const teamMap = {};
    teams.forEach(t => teamMap[t.id] = t);

    if (!players.length) {
        area.innerHTML = `<div class="forum-empty">Henüz oyuncu eklenmedi.</div>`;
        return;
    }

    players.sort((a, b) => computeMarketValue(b) - computeMarketValue(a));

    area.innerHTML = players.map((p, i) => {
        const team = teamMap[p.teamId];
        return `
        <div class="forum-row" style="grid-template-columns:60px 2fr 1.3fr 1fr;" onclick="openPlayer('${p.id}')">
            <span class="rankNum">${i + 1}</span>
            <span class="forum-name">${escapeHtml(p.name)}</span>
            <span class="forum-sub">${escapeHtml(team ? team.name : "Takımsız")}</span>
            <span class="forum-rating">${formatEuro(computeMarketValue(p))}</span>
        </div>
        `;
    }).join("");
};



// =====================================
// STAT GÜNCELLEME TALEPLERİ (Misafir -> Admin)
// =====================================

window.sendStatRequest = async function (playerId) {
    const player = await getPlayer(playerId);
    if (!player) return;

    const statKey = value("statReqKey");
    const statLabel = (CORE_STATS.find(s => s.key === statKey) || {}).label || statKey;
    const amount = Number(value("statReqAmount") || 0);
    const note = value("statReqNote");

    if (!amount) { alert("Miktar gir"); return; }

    await addDoc(collection(db, "statRequests"), {
        playerId,
        playerName: player.name,
        statKey,
        statLabel,
        amount,
        note,
        status: "pending",
        createdAt: new Date()
    });

    alert("Talebin gönderildi, admin onayı bekleniyor.");
    clear("statReqNote");
};

window.loadStatRequests = async function () {
    const area = document.getElementById("statRequestsArea");
    if (!area) return;

    const snap = await getDocs(collection(db, "statRequests"));
    const requests = [];
    snap.forEach(item => requests.push({ id: item.id, ...item.data() }));

    requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (!requests.length) {
        area.innerHTML = `<div class="forum-empty">Bekleyen talep yok.</div>`;
        return;
    }

    area.innerHTML = requests.map(r => `
        <div class="statRequestRow">
            <div>
                <strong>${escapeHtml(r.playerName || "Bilinmeyen oyuncu")}</strong>
                — ${escapeHtml(r.statLabel || r.statKey)} <strong>${r.amount > 0 ? "+" : ""}${r.amount}</strong>
                ${r.note ? `<div class="capNote">"${escapeHtml(r.note)}"</div>` : ""}
            </div>
            <div>
                <button class="btn small" onclick="openPlayer('${r.playerId}')">Oyuncuya Git</button>
                <button class="btn small ghost" onclick="resolveStatRequest('${r.id}')">Talebi Kapat</button>
            </div>
        </div>
    `).join("");
};

window.resolveStatRequest = async function (id) {
    if (!isAdmin) { alert("Yetkin yok"); return; }
    await deleteDoc(doc(db, "statRequests", id));
    loadStatRequests();
};



async function renderAdminPage() {
    const loginBox = document.getElementById("adminLoginBox");
    const toolsBox = document.getElementById("adminToolsBox");
    if (!loginBox || !toolsBox) return;

    if (isAdmin) {
        loginBox.classList.add("hidden");
        toolsBox.classList.remove("hidden");

        set("globalStatCap", state.statCap);

        const select = document.getElementById("buffTeamSelect");
        if (select) {
            select.innerHTML = `<option value="">Takım Seç</option>`;
            const teams = await getTeamsData();
            teams.forEach(team => {
                select.innerHTML += `<option value="${team.id}">${escapeHtml(team.name)}</option>`;
            });
        }

        document.getElementById("buffFormArea").innerHTML = "";

        loadStatRequests();
    } else {
        loginBox.classList.remove("hidden");
        toolsBox.classList.add("hidden");
    }
}

window.loadTeamBuffForm = async function () {
    const teamId = value("buffTeamSelect");
    const area = document.getElementById("buffFormArea");
    if (!area) return;

    if (!teamId) { area.innerHTML = ""; return; }

    const team = await getTeamById(teamId);
    if (!team) return;

    const buffs = team.buffs || {};

    area.innerHTML = `
        <div class="buff-grid">
            ${CORE_STATS.map(s => `
                <div>
                    <label>${s.label} Buff</label>
                    <input class="teamBuffInput" data-stat="${s.key}" type="number" value="${buffs[s.key] || 0}">
                </div>
            `).join("")}
        </div>
        <button class="btn" onclick="saveTeamBuff('${teamId}')">Buffları Kaydet</button>
    `;
};

window.saveTeamBuff = async function (teamId) {
    if (!isAdmin) { alert("Yetkin yok"); return; }

    const buffs = {};
    document.querySelectorAll(".teamBuffInput").forEach(input => {
        buffs[input.dataset.stat] = Number(input.value || 0);
    });

    await updateDoc(doc(db, "teams", teamId), { buffs });

    alert("Takım buffları güncellendi");
    loadTeams();
};


// =====================================
// MODAL KAPATMA
// =====================================

window.closeModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("hidden");
};


// =====================================
// YETKİYİ UYGULA (adminOnly elemanlar)
// =====================================

function applyPermissions() {
    document.querySelectorAll(".adminOnly").forEach(el => {
        el.style.display = isAdmin ? "" : "none";
    });
}


// =====================================
// BAŞLATMA
// =====================================

async function startApp() {
    console.log("BlueLock Panel Başlatılıyor...");

    applyPermissions();
    await loadSettings();

    await updateDashboard();
    await loadTeamSelect();
    renderCoreStatInputs();

    startMatchesListener();

    showPage("dashboard");

    console.log("BlueLock Panel Hazır");
}

window.addEventListener("load", () => {
    startApp();
});

console.log("BLUELOCK APP.JS YÜKLENDİ");
