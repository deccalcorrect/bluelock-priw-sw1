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
    deleteDoc
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

const DEFAULT_STAT_CAP = 60;


// =====================================
// GENEL DURUM (STATE)
// =====================================

const state = {
    statCap: DEFAULT_STAT_CAP,
    currentPlayerId: null,
    currentTeamId: null
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
    teamDetail: "Takım Detayı",
    league: "Lig",
    matchResults: "Maç Sonuçları",
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
    if (pageId === "players") loadPlayers();
    if (pageId === "teams") loadTeams();
    if (pageId === "league") { loadLeagueTable(); }
    if (pageId === "matchResults") { loadMatches(); loadMatchTeams(); }
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

    const playerCount = document.getElementById("playerCount");
    const teamCount = document.getElementById("teamCount");

    if (playerCount) playerCount.innerHTML = playerSnap.size;
    if (teamCount) teamCount.innerHTML = teamSnap.size;

    const permText = document.getElementById("permissionText");
    const permBadge = document.getElementById("permissionBadge");

    if (permText) permText.innerHTML = isAdmin ? "Admin" : "Ziyaretçi";

    if (permBadge) {
        permBadge.innerHTML = isAdmin ? "Admin" : "Ziyaretçi";
        permBadge.className = isAdmin ? "adminBadge" : "visitorBadge";
    }

    await renderGoalKing();
    await renderAssistKing();
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
                    <span>🏟 ${player.matches || 0} Maç</span>
                    <span>⚽ ${player.goals || 0} Gol</span>
                    <span>🅰️ ${player.assists || 0} Asist</span>
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

    ${isAdmin ? `
    <div class="panel">
        <h3>İstatistik Düzenle (Admin)</h3>

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

    await updateDoc(ref, {
        stats: stats,
        goals: Number(value("editGoals") || 0),
        assists: Number(value("editAssists") || 0),
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
    const selects = ["homeTeam", "awayTeam"];
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
// GOL / ASİST KRALLIĞI
// =====================================

window.renderGoalKing = async function () {
    const area = document.getElementById("goalKing");
    if (!area) return;

    const players = await getPlayersRanking();
    players.sort((a, b) => (b.goals || 0) - (a.goals || 0));

    if (players.length && (players[0].goals || 0) > 0) {
        area.innerHTML = `${escapeHtml(players[0].name)}<strong>⚽ ${players[0].goals} Gol</strong>`;
    } else {
        area.innerHTML = "Veri yok";
    }
};

window.renderAssistKing = async function () {
    const area = document.getElementById("assistKing");
    if (!area) return;

    const players = await getPlayersRanking();
    players.sort((a, b) => (b.assists || 0) - (a.assists || 0));

    if (players.length && (players[0].assists || 0) > 0) {
        area.innerHTML = `${escapeHtml(players[0].name)}<strong>🅰️ ${players[0].assists} Asist</strong>`;
    } else {
        area.innerHTML = "Veri yok";
    }
};


// =====================================
// ADMİN PANELİ - TAKIM BUFF DÜZENLEME
// =====================================

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

    showPage("dashboard");

    console.log("BlueLock Panel Hazır");
}

window.addEventListener("load", () => {
    startApp();
});

console.log("BLUELOCK APP.JS YÜKLENDİ");
