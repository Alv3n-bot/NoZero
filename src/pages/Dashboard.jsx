// ============================================================
// NOZERO DASHBOARD — Upgraded v2
// Mobile-first | Persistent Pomodoro | Delete Confirmations
// Task Editing | Habit Streaks | Onboarding | Keyboard Shortcuts
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc, onSnapshot,
  doc, serverTimestamp, query, orderBy, getDoc, setDoc,
  getDocs, writeBatch,
} from "firebase/firestore";

// ============================================================
// QUOTES
// ============================================================
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "All our dreams can come true if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "Eighty percent of success is showing up.", author: "Woody Allen" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Go confidently in the direction of your dreams.", author: "Henry David Thoreau" },
  { text: "Believe and act as if it were impossible to fail.", author: "Charles Kettering" },
  { text: "We become what we repeatedly do.", author: "Sean Covey" },
  { text: "Success is liking yourself, liking what you do, and liking how you do it.", author: "Maya Angelou" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "Good things come to people who wait, but better things come to those who go out and get them.", author: "Anonymous" },
  { text: "If you do what you always did, you will get what you always got.", author: "Anonymous" },
  { text: "You've got to get up every morning with determination if you're going to go to bed with satisfaction.", author: "George Lorimer" },
  { text: "To live a creative life, we must lose our fear of being wrong.", author: "Anonymous" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Zig Ziglar" },
  { text: "When you stop chasing the wrong things, you give the right things a chance to catch you.", author: "Lolly Daskal" },
  { text: "I attribute my success to this: I never gave or took any excuse.", author: "Florence Nightingale" },
  { text: "You can never cross the ocean until you have the courage to lose sight of the shore.", author: "Christopher Columbus" },
  { text: "Certain things catch your eye, but pursue only those that capture the heart.", author: "Ancient Indian Proverb" },
  { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso" },
  { text: "Few things help an individual more than to place responsibility on him.", author: "Booker T. Washington" },
  { text: "When I stand before God at the end of my life, I would hope I had not a single bit of talent left.", author: "Erma Bombeck" },
  { text: "I've learned that people will never forget how you made them feel.", author: "Maya Angelou" },
  { text: "Trust because you are willing to accept the risk, not because it's safe.", author: "Anonymous" },
];

// ============================================================
// HELPERS
// ============================================================
const formatDate = (date) => {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toISOString().slice(0, 10) + " " + d.toTimeString().slice(0, 5);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const useTerminalMessage = (duration = 3000) => {
  const [message, setMessage] = useState(null);
  const show = useCallback((msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, [duration]);
  return [message, show];
};

// Calculate streak for an array of date strings
const calcHabitStreak = (completions) => {
  if (!completions || completions.length === 0) return 0;
  const sorted = [...completions].sort().reverse();
  const today = todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yStr) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev - curr) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return streak;
};

// ============================================================
// SHARED UI COMPONENTS
// ============================================================
const TerminalCard = ({ title, children, className = "" }) => (
  <div className={`bg-gray-900 border border-purple-500 rounded-sm ${className}`}>
    <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-b border-purple-700">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 flex-shrink-0" />
      <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
      <span className="text-pink-400 text-xs font-mono ml-1 truncate">{title}</span>
    </div>
    <div className="p-3 sm:p-4">{children}</div>
  </div>
);

const TerminalMessage = ({ message }) => {
  if (!message) return null;
  const isError = message.startsWith("> [ERROR]");
  return (
    <div className={`font-mono text-sm mt-2 ${isError ? "text-red-400" : "text-green-400"}`}>
      {message}
    </div>
  );
};

// ============================================================
// DELETE CONFIRMATION MODAL
// ============================================================
const DeleteConfirmModal = ({ isOpen, onConfirm, onCancel, itemName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-600 rounded-sm w-full max-w-sm font-mono">
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-red-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-red-400 text-xs ml-1">&gt; confirm_delete.exe</span>
        </div>
        <div className="p-5">
          <p className="text-red-400 text-sm mb-1">&gt; [WARNING] Irreversible action.</p>
          <p className="text-gray-300 text-sm mb-5">
            Delete <span className="text-pink-400">"{itemName}"</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-900 border border-red-600 text-red-300 hover:bg-red-800 text-sm py-2 rounded-sm transition-all"
            >
              &gt; CONFIRM DELETE
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm py-2 rounded-sm transition-all"
            >
              &gt; CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ONBOARDING MODAL
// ============================================================
const OnboardingModal = ({ onComplete, uid }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  const steps = [
    {
      title: "> welcome.exe",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-5xl">🚀</div>
          <p className="text-pink-400 text-lg font-bold">&gt; WELCOME TO NOZERO_</p>
          <p className="text-gray-400 text-sm">Your personal development terminal. Track habits, goals, tasks, focus sessions, and more — all in one place.</p>
          <p className="text-gray-600 text-xs">// Zero days wasted. That's the mission.</p>
        </div>
      ),
    },
    {
      title: "> setup_identity.exe",
      content: (
        <div className="space-y-4">
          <p className="text-purple-400 text-sm">&gt; What should we call you?</p>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name or alias..."
            className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm"
          />
          <p className="text-gray-600 text-xs">// You can change this anytime in Settings.</p>
        </div>
      ),
    },
    {
      title: "> quick_tour.exe",
      content: (
        <div className="space-y-3">
          <p className="text-purple-400 text-sm mb-3">&gt; Here's what you have access to:</p>
          {[
            ["📝", "LOGS", "Daily journaling with mood tracking"],
            ["✅", "TASKS", "Priority tasks with due dates"],
            ["🎯", "GOALS", "Goals with milestone tracking"],
            ["🔁", "HABITS", "Habit streaks and completion grids"],
            ["💰", "MONEY", "Income and expense tracking"],
            ["🍅", "POMODORO", "Focus timer with stats"],
            ["📅", "CALENDAR", "Activity overview across all modules"],
          ].map(([icon, label, desc]) => (
            <div key={label} className="flex items-start gap-3">
              <span className="text-lg">{icon}</span>
              <div>
                <span className="text-pink-400 text-xs font-bold">{label}</span>
                <span className="text-gray-500 text-xs"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "> keyboard_shortcuts.exe",
      content: (
        <div className="space-y-3">
          <p className="text-purple-400 text-sm mb-3">&gt; Pro tip — keyboard shortcuts:</p>
          {[
            ["1–9", "Navigate to module by number"],
            ["/", "Focus global search bar"],
            ["Esc", "Close modals / clear search"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="bg-gray-800 border border-purple-700 text-purple-300 text-xs px-2 py-1 rounded-sm font-mono min-w-8 text-center">{key}</span>
              <span className="text-gray-400 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  const handleNext = async () => {
    if (isLast) {
      if (name.trim()) {
        try {
          await updateDoc(doc(db, `users/${uid}`), { displayName: name.trim(), onboardingComplete: true, updatedAt: serverTimestamp() });
        } catch {}
      } else {
        try {
          await updateDoc(doc(db, `users/${uid}`), { onboardingComplete: true, updatedAt: serverTimestamp() });
        } catch {}
      }
      onComplete(name.trim());
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-purple-500 rounded-sm w-full max-w-md font-mono shadow-2xl shadow-purple-900/40">
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-purple-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-pink-400 text-xs ml-1">{steps[step].title}</span>
          <span className="ml-auto text-gray-600 text-xs">{step + 1}/{steps.length}</span>
        </div>
        <div className="p-6 min-h-48">{steps[step].content}</div>
        <div className="px-6 pb-5 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-pink-500" : "bg-gray-700"}`} />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-5 py-2 rounded-sm transition-all"
          >
            {isLast ? "&gt; LET'S GO" : "&gt; NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// NAV CONFIG
// ============================================================
const NAV_ITEMS = [
  { key: "home",      label: "HOME",      icon: "⌂" },
  { key: "logs",      label: "LOGS",      icon: "📝" },
  { key: "tasks",     label: "TASKS",     icon: "✅" },
  { key: "goals",     label: "GOALS",     icon: "🎯" },
  { key: "habits",    label: "HABITS",    icon: "🔁" },
  { key: "money",     label: "MONEY",     icon: "💰" },
  { key: "pomodoro",  label: "POMODORO",  icon: "🍅" },
  { key: "calendar",  label: "CALENDAR",  icon: "📅" },
  { key: "settings",  label: "SETTINGS",  icon: "⚙" },
];

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function Dashboard() {
  const [currentUser, setCurrentUser]       = useState(null);
  const [activeModule, setActiveModule]     = useState("home");
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [showSearch, setShowSearch]         = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [streakData, setStreakData]         = useState({ currentStreak: 0, longestStreak: 0 });
  const [settings, setSettings]            = useState({ displayName: "", defaultPomodoroDuration: 25, weeklyPomodoroGoal: 10 });
  const [theme, setTheme]                  = useState(() => localStorage.getItem("noZeroTheme") || "dark");

  // Data
  const [logs, setLogs]                         = useState([]);
  const [tasks, setTasks]                       = useState([]);
  const [goals, setGoals]                       = useState([]);
  const [habits, setHabits]                     = useState([]);
  const [habitCompletions, setHabitCompletions] = useState({});
  const [moneyEntries, setMoneyEntries]         = useState([]);
  const [pomodoroSessions, setPomodoroSessions] = useState([]);
  const [savedQuotes, setSavedQuotes]           = useState([]);

  // ── Pomodoro timer state lifted to parent so it persists across tab switches ──
  const [pomSessionTitle, setPomSessionTitle] = useState("");
  const [pomSessionType, setPomSessionType]   = useState("work");
  const [pomDuration, setPomDuration]         = useState(25);
  const [pomTimeLeft, setPomTimeLeft]         = useState(25 * 60);
  const [pomRunning, setPomRunning]           = useState(false);
  const pomIntervalRef = useRef(null);
  const pomCompleteFn  = useRef(null); // set by PomodoroModule

  const searchRef = useRef(null);

  // Theme classes
  const rootBg   = theme === "darker" ? "bg-black" : "bg-gray-950";
  const sidebarBg = theme === "darker" ? "bg-gray-950" : "bg-gray-900";

  // Apply theme to body
  useEffect(() => {
    document.body.className = theme === "darker" ? "bg-black" : "bg-gray-950";
    localStorage.setItem("noZeroTheme", theme);
  }, [theme]);

  // ── Auth ──
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setCurrentUser(user));
  }, []);

  // ── Firestore subscriptions ──
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const unsubs = [];
    const sub = (q, setter) => unsubs.push(onSnapshot(q, (snap) => setter(snap.docs.map((d) => ({ id: d.id, ...d.data() })))));

    sub(query(collection(db, `users/${uid}/logs`),      orderBy("createdAt",   "desc")), setLogs);
    sub(query(collection(db, `users/${uid}/tasks`),     orderBy("createdAt",   "desc")), setTasks);
    sub(query(collection(db, `users/${uid}/goals`),     orderBy("createdAt",   "desc")), setGoals);
    sub(query(collection(db, `users/${uid}/habits`),    orderBy("createdAt",   "asc")),  setHabits);
    sub(query(collection(db, `users/${uid}/money`),     orderBy("createdAt",   "desc")), setMoneyEntries);
    sub(query(collection(db, `users/${uid}/pomodoro`),  orderBy("completedAt", "desc")), setPomodoroSessions);
    sub(query(collection(db, `users/${uid}/quotes`),    orderBy("createdAt",   "desc")), setSavedQuotes);

    return () => unsubs.forEach((u) => u());
  }, [currentUser]);

  // ── User doc + streak + onboarding check ──
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    (async () => {
      const userRef = doc(db, `users/${uid}`);
      const snap = await getDoc(userRef);
      const today = todayStr();
      if (snap.exists()) {
        const data = snap.data();
        setSettings((p) => ({
          ...p,
          displayName: data.displayName || currentUser.displayName || "",
          defaultPomodoroDuration: data.defaultPomodoroDuration || 25,
          weeklyPomodoroGoal: data.weeklyPomodoroGoal || 10,
        }));
        setPomDuration(data.defaultPomodoroDuration || 25);
        setPomTimeLeft((data.defaultPomodoroDuration || 25) * 60);

        if (!data.onboardingComplete) setShowOnboarding(true);

        let { currentStreak = 0, longestStreak = 0, lastActiveDate = "" } = data;
        if (lastActiveDate !== today) {
          const yest = new Date(); yest.setDate(yest.getDate() - 1);
          currentStreak = lastActiveDate === yest.toISOString().slice(0, 10) ? currentStreak + 1 : 1;
          if (currentStreak > longestStreak) longestStreak = currentStreak;
          await updateDoc(userRef, { currentStreak, longestStreak, lastActiveDate: today });
        }
        setStreakData({ currentStreak, longestStreak });
      } else {
        await setDoc(userRef, {
          currentStreak: 1, longestStreak: 1, lastActiveDate: today,
          displayName: currentUser.displayName || "",
          defaultPomodoroDuration: 25, weeklyPomodoroGoal: 10,
          onboardingComplete: false,
          createdAt: serverTimestamp(),
        });
        setStreakData({ currentStreak: 1, longestStreak: 1 });
        setShowOnboarding(true);
      }
    })();
  }, [currentUser]);

  // ── Habit completions ──
  useEffect(() => {
    if (!currentUser || habits.length === 0) return;
    const uid = currentUser.uid;
    const unsubs = habits.map((h) =>
      onSnapshot(collection(db, `users/${uid}/habits/${h.id}/completions`), (snap) => {
        const dates = snap.docs.map((d) => d.id);
        setHabitCompletions((prev) => ({ ...prev, [h.id]: dates }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [currentUser, habits]);

  // ── Pomodoro timer (parent-level, persists across tabs) ──
  useEffect(() => {
    if (pomRunning) {
      pomIntervalRef.current = setInterval(() => {
        setPomTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(pomIntervalRef.current);
            setPomRunning(false);
            pomCompleteFn.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(pomIntervalRef.current);
    }
    return () => clearInterval(pomIntervalRef.current);
  }, [pomRunning]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "/" ) { e.preventDefault(); searchRef.current?.focus(); setShowSearch(true); return; }
      if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); setSidebarOpen(false); return; }
      const idx = parseInt(e.key);
      if (idx >= 1 && idx <= 9) setActiveModule(NAV_ITEMS[idx - 1].key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Auth guard ──
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${rootBg} flex items-center justify-center font-mono`}>
        <TerminalCard title="> auth_gate.exe" className="w-80">
          <p className="text-red-400">&gt; ACCESS DENIED.</p>
          <p className="text-gray-500 text-sm mt-1">Please authenticate to continue.</p>
        </TerminalCard>
      </div>
    );
  }

  const uid = currentUser.uid;
  const displayName = settings.displayName || currentUser.email?.split("@")[0] || "user";

  // ── Search ──
  const searchResults = searchQuery.length > 1 ? {
    logs:   logs.filter((l)   => l.title?.toLowerCase().includes(searchQuery.toLowerCase()) || l.content?.toLowerCase().includes(searchQuery.toLowerCase())),
    tasks:  tasks.filter((t)  => t.title?.toLowerCase().includes(searchQuery.toLowerCase())),
    goals:  goals.filter((g)  => g.title?.toLowerCase().includes(searchQuery.toLowerCase()) || g.description?.toLowerCase().includes(searchQuery.toLowerCase())),
    habits: habits.filter((h) => h.name?.toLowerCase().includes(searchQuery.toLowerCase())),
  } : null;

  const moduleNav = (key) => { setActiveModule(key); setSidebarOpen(false); };

  const renderModule = () => {
    const common = { uid };
    switch (activeModule) {
      case "home":      return <HomeModule     {...common} logs={logs} tasks={tasks} goals={goals} pomodoroSessions={pomodoroSessions} moneyEntries={moneyEntries} habits={habits} habitCompletions={habitCompletions} streakData={streakData} displayName={displayName} savedQuotes={savedQuotes} />;
      case "logs":      return <LogsModule     {...common} logs={logs} />;
      case "tasks":     return <TasksModule    {...common} tasks={tasks} />;
      case "goals":     return <GoalsModule    {...common} goals={goals} />;
      case "habits":    return <HabitsModule   {...common} habits={habits} habitCompletions={habitCompletions} />;
      case "money":     return <MoneyModule    {...common} moneyEntries={moneyEntries} />;
      case "pomodoro":  return (
        <PomodoroModule
          {...common}
          pomodoroSessions={pomodoroSessions}
          settings={settings}
          // Lifted timer state
          sessionTitle={pomSessionTitle}  setSessionTitle={setPomSessionTitle}
          sessionType={pomSessionType}    setSessionType={setPomSessionType}
          duration={pomDuration}          setDuration={setPomDuration}
          timeLeft={pomTimeLeft}          setTimeLeft={setPomTimeLeft}
          isRunning={pomRunning}          setIsRunning={setPomRunning}
          completeFnRef={pomCompleteFn}
        />
      );
      case "calendar":  return <CalendarModule logs={logs} tasks={tasks} pomodoroSessions={pomodoroSessions} habits={habits} habitCompletions={habitCompletions} />;
      case "settings":  return <SettingsModule {...common} settings={settings} setSettings={setSettings} savedQuotes={savedQuotes} currentUser={currentUser} logs={logs} tasks={tasks} goals={goals} habits={habits} moneyEntries={moneyEntries} pomodoroSessions={pomodoroSessions} theme={theme} setTheme={setTheme} />;
      default: return null;
    }
  };

  const pomMM = String(Math.floor(pomTimeLeft / 60)).padStart(2, "0");
  const pomSS = String(pomTimeLeft % 60).padStart(2, "0");

  return (
    <div className={`flex min-h-screen ${rootBg} font-mono`}>
      {/* ── ONBOARDING ── */}
      {showOnboarding && (
        <OnboardingModal uid={uid} onComplete={(name) => {
          if (name) setSettings((p) => ({ ...p, displayName: name }));
          setShowOnboarding(false);
        }} />
      )}

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 ${sidebarBg} border-r border-purple-900 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="px-5 pt-5 pb-3 border-b border-purple-900">
          <div className="text-purple-400 text-lg font-bold">&gt; NoZero_</div>
          <div className="text-gray-600 text-xs mt-0.5 truncate">{currentUser.email}</div>
          <div className="text-pink-400 text-xs mt-2">🔥 STREAK: {streakData.currentStreak} DAYS</div>
          {pomRunning && (
            <div className="mt-2 bg-gray-800 border border-purple-700 rounded-sm px-2 py-1 text-xs">
              <span className="text-pink-400">⏱ {pomMM}:{pomSS}</span>
              <span className="text-gray-500 ml-1">running</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => (
            <button
              key={item.key}
              onClick={() => moduleNav(item.key)}
              className={`w-full text-left px-5 py-2.5 text-sm transition-all flex items-center gap-3 ${
                activeModule === item.key
                  ? "bg-purple-950 border-l-2 border-pink-500 text-pink-400"
                  : "text-gray-400 hover:text-purple-300 hover:bg-gray-800 border-l-2 border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>&gt; {item.label}</span>
              <span className="ml-auto text-gray-700 text-xs">{idx + 1}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-purple-900">
          <button
            onClick={() => signOut(auth)}
            className="w-full bg-transparent border border-red-700 text-red-500 hover:bg-red-950 text-xs py-2 rounded-sm transition-all"
          >
            &gt; LOGOUT
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-purple-900 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-purple-400 text-xl p-1">☰</button>
          <span className="text-purple-400 font-bold text-sm">&gt; NoZero_</span>
          {pomRunning && (
            <span className="ml-auto text-pink-400 text-xs bg-gray-800 border border-purple-700 px-2 py-1 rounded-sm">
              ⏱ {pomMM}:{pomSS}
            </span>
          )}
        </div>

        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {/* Global Search */}
          <div className="relative mb-5">
            <div className="flex items-center bg-gray-900 border border-purple-700 rounded-sm px-3 py-2">
              <span className="text-purple-400 mr-2 text-xs flex-shrink-0">&gt; SEARCH:</span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="search everything... (press /)"
                className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 focus:outline-none text-sm min-w-0"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setShowSearch(false); }} className="text-gray-500 hover:text-gray-300 ml-2 text-xs">✕</button>
              )}
            </div>
            {showSearch && searchResults && (
              <div className="absolute top-full left-0 right-0 bg-gray-900 border border-purple-500 rounded-sm z-50 max-h-60 overflow-y-auto shadow-lg shadow-purple-900/30">
                {Object.entries(searchResults).map(([type, items]) =>
                  items.length > 0 ? (
                    <div key={type}>
                      <div className="px-3 py-1 text-purple-400 text-xs bg-gray-800 uppercase sticky top-0">{type}</div>
                      {items.map((item) => {
                        const text = item.title || item.name || item.text || "";
                        const q = searchQuery.toLowerCase();
                        const idx2 = text.toLowerCase().indexOf(q);
                        const highlighted = idx2 >= 0
                          ? <>{text.slice(0, idx2)}<span className="bg-yellow-500/30 text-yellow-300">{text.slice(idx2, idx2 + q.length)}</span>{text.slice(idx2 + q.length)}</>
                          : text;
                        return (
                          <button key={item.id} onClick={() => { moduleNav(type === "logs" ? "logs" : type === "tasks" ? "tasks" : type === "goals" ? "goals" : "habits"); setSearchQuery(""); setShowSearch(false); }}
                            className="w-full text-left px-4 py-2 text-gray-300 text-sm hover:bg-gray-800 transition-all">
                            {highlighted}
                          </button>
                        );
                      })}
                    </div>
                  ) : null
                )}
                {Object.values(searchResults).every((a) => a.length === 0) && (
                  <div className="px-4 py-3 text-gray-500 text-sm">&gt; No results found.</div>
                )}
              </div>
            )}
          </div>

          {renderModule()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODULE 1 — HOME
// ============================================================
function HomeModule({ uid, logs, tasks, goals, pomodoroSessions, moneyEntries, habits, habitCompletions, streakData, displayName, savedQuotes }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const today = todayStr();
  const [quote, setQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [termMsg, showTermMsg] = useTerminalMessage();

  const dayNames   = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const now = new Date();
  const dateDisplay = `// ${dayNames[now.getDay()]}, ${String(now.getDate()).padStart(2,"0")} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const pendingTasks    = tasks.filter((t) => !t.completed).length;
  const goalsInProgress = goals.filter((g) => !g.achieved).length;
  const todayPomodoros  = pomodoroSessions.filter((s) => s.completedAt?.toDate?.()?.toISOString().slice(0,10) === today && s.type === "work").length;
  const todayMoney      = moneyEntries.filter((e) => e.date === today).reduce((a,e) => a + (e.type === "income" ? e.amount : -e.amount), 0);
  const tasksDueToday   = tasks.filter((t) => t.dueDate === today && !t.completed);
  const habitsNotDone   = habits.filter((h) => !habitCompletions[h.id]?.includes(today));

  const handleSaveQuote = async () => {
    try {
      await addDoc(collection(db, `users/${uid}/quotes`), { text: quote.text, author: quote.author, createdAt: serverTimestamp() });
      showTermMsg("> [SUCCESS] Quote saved.");
    } catch (err) { showTermMsg("> [ERROR] Failed to save quote."); }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-pink-400 text-xl sm:text-2xl font-bold">&gt; {greeting}, {displayName.toUpperCase()}</div>
        <div className="text-gray-500 text-xs sm:text-sm mt-1">{dateDisplay}</div>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-3">
        <TerminalCard title="> streak.sys">
          <div className="text-center py-1">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-pink-400 text-2xl font-bold">{streakData.currentStreak}</div>
            <div className="text-gray-500 text-xs">CURRENT STREAK</div>
          </div>
        </TerminalCard>
        <TerminalCard title="> best.sys">
          <div className="text-center py-1">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-purple-400 text-2xl font-bold">{streakData.longestStreak}</div>
            <div className="text-gray-500 text-xs">LONGEST STREAK</div>
          </div>
        </TerminalCard>
      </div>

      {/* Quick Stats — 2×2 on mobile, 4×1 on desktop */}
      <TerminalCard title="> quick_stats.exe">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { val: pendingTasks,  label: "PENDING TASKS",    color: "text-yellow-400" },
            { val: goalsInProgress, label: "GOALS ACTIVE",  color: "text-purple-400" },
            { val: todayPomodoros,  label: "POMODOROS",     color: "text-pink-400"   },
            { val: `${todayMoney >= 0 ? "+" : ""}${todayMoney.toFixed(0)}`, label: "TODAY BALANCE", color: todayMoney >= 0 ? "text-green-400" : "text-red-400" },
          ].map(({ val, label, color }) => (
            <div key={label} className="text-center bg-gray-800/50 rounded-sm py-2">
              <div className={`text-xl font-bold ${color}`}>{val}</div>
              <div className="text-gray-600 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </TerminalCard>

      {/* Quote */}
      <TerminalCard title="> daily_quote.txt">
        <blockquote className="border-l-2 border-pink-500 pl-3 mb-3">
          <p className="text-gray-300 text-sm italic">"{quote.text}"</p>
          <p className="text-purple-400 text-xs mt-1">— {quote.author}</p>
        </blockquote>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])} className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded-sm">&gt; REFRESH</button>
          <button onClick={handleSaveQuote} className="bg-transparent border border-green-600 text-green-400 hover:bg-green-900 text-xs px-3 py-1.5 rounded-sm">&gt; SAVE FAV</button>
        </div>
        <TerminalMessage message={termMsg} />
        {savedQuotes.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setShowSavedQuotes(!showSavedQuotes)} className="text-purple-400 text-xs hover:text-pink-400">
              &gt; SAVED [{savedQuotes.length}] {showSavedQuotes ? "▲" : "▼"}
            </button>
            {showSavedQuotes && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {savedQuotes.map((q) => (
                  <div key={q.id} className="border border-gray-800 p-2 rounded-sm">
                    <p className="text-gray-400 text-xs italic">"{q.text}"</p>
                    <p className="text-gray-600 text-xs">— {q.author}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </TerminalCard>

      {/* Today Summary — stacked on mobile */}
      <TerminalCard title="> today_summary.exe">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-purple-400 text-xs mb-2">&gt; TASKS DUE TODAY:</div>
            {tasksDueToday.length === 0
              ? <p className="text-gray-600 text-xs">// None due today.</p>
              : tasksDueToday.map((t) => (
                  <div key={t.id} className="text-gray-300 text-sm py-1 border-b border-gray-800 flex items-center gap-2">
                    <span className={t.priority === "high" ? "text-red-400 text-xs" : t.priority === "medium" ? "text-yellow-400 text-xs" : "text-gray-500 text-xs"}>[{t.priority?.toUpperCase()}]</span>
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
          </div>
          <div>
            <div className="text-purple-400 text-xs mb-2">&gt; HABITS NOT DONE:</div>
            {habitsNotDone.length === 0
              ? <p className="text-gray-600 text-xs">// All habits complete! 🎉</p>
              : habitsNotDone.map((h) => <div key={h.id} className="text-gray-300 text-sm py-1 border-b border-gray-800 truncate">{h.name}</div>)}
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}

// ============================================================
// MODULE 2 — DAILY LOGS
// ============================================================
function LogsModule({ uid, logs }) {
  const [title, setTitle]       = useState("");
  const [content, setContent]   = useState("");
  const [mood, setMood]         = useState(3);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [expanded, setExpanded] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [termMsg, showTermMsg]  = useTerminalMessage();
  const moods = ["😞","😐","🙂","😊","🤩"];

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await addDoc(collection(db, `users/${uid}/logs`), { title: title.trim(), content: content.trim(), mood, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setTitle(""); setContent(""); setMood(3);
      showTermMsg("> [SUCCESS] Log saved.");
    } catch { showTermMsg("> [ERROR] Failed to save log."); }
  };

  const handleDeleteLog = async () => {
    try {
      await deleteDoc(doc(db, `users/${uid}/logs/${deleteTarget.id}`));
      showTermMsg("> [SUCCESS] Log deleted.");
    } catch { showTermMsg("> [ERROR] Failed to delete."); }
    setDeleteTarget(null);
  };

  const handleEditSave = async (id) => {
    try {
      await updateDoc(doc(db, `users/${uid}/logs/${id}`), { ...editData, updatedAt: serverTimestamp() });
      setEditingId(null);
      showTermMsg("> [SUCCESS] Log updated.");
    } catch { showTermMsg("> [ERROR] Failed to update."); }
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const moodByDay = last7Days.map((day) => { const dl = logs.filter((l) => l.createdAt?.toDate?.()?.toISOString().slice(0,10) === day); return dl.length ? dl.reduce((a,b) => a + b.mood, 0) / dl.length : 0; });

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteTarget} itemName={deleteTarget?.title || ""} onConfirm={handleDeleteLog} onCancel={() => setDeleteTarget(null)} />

      <TerminalCard title="> new_log.exe">
        <form onSubmit={handleAddLog} className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="log title..." className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="write your thoughts..." rows={4} className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm resize-none" />
          <div>
            <div className="text-purple-400 text-xs mb-2">&gt; MOOD:</div>
            <div className="flex gap-2">
              {moods.map((m, i) => (
                <button key={i} type="button" onClick={() => setMood(i + 1)} className={`text-2xl p-1 rounded-sm border transition-all ${mood === i+1 ? "border-pink-500 bg-pink-500/10" : "border-transparent hover:border-purple-700"}`}>{m}</button>
              ))}
            </div>
          </div>
          <button type="submit" className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px]">&gt; SAVE LOG</button>
          <TerminalMessage message={termMsg} />
        </form>
      </TerminalCard>

      <TerminalCard title="> mood_graph_7d.exe">
        <div className="flex items-end gap-1 sm:gap-2 h-20">
          {moodByDay.map((avg, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div style={{ height: avg ? `${(avg/5)*64}px` : "3px" }} className={`w-full rounded-sm transition-all ${avg >= 4 ? "bg-pink-400" : avg >= 3 ? "bg-purple-400" : avg > 0 ? "bg-purple-700" : "bg-gray-800"}`} />
              <span className="text-gray-600 text-xs">{last7Days[i].slice(5)}</span>
            </div>
          ))}
        </div>
      </TerminalCard>

      <div className="space-y-3">
        {logs.map((log) => (
          <TerminalCard key={log.id} title={`> log_${log.id.slice(0,6)}.txt`}>
            {editingId === log.id ? (
              <div className="space-y-2">
                <input value={editData.title||""} onChange={(e) => setEditData({...editData,title:e.target.value})} className="w-full bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
                <textarea value={editData.content||""} onChange={(e) => setEditData({...editData,content:e.target.value})} rows={3} className="w-full bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm resize-none" />
                <div className="flex gap-2">
                  {moods.map((m,i) => <button key={i} type="button" onClick={() => setEditData({...editData,mood:i+1})} className={`text-xl p-1 rounded-sm border ${(editData.mood||log.mood)===i+1?"border-pink-500":"border-transparent"}`}>{m}</button>)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditSave(log.id)} className="bg-transparent border border-green-600 text-green-400 hover:bg-green-900 text-xs px-3 py-2 rounded-sm min-h-[44px]">&gt; SAVE</button>
                  <button onClick={() => setEditingId(null)} className="bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-800 text-xs px-3 py-2 rounded-sm min-h-[44px]">&gt; CANCEL</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="text-pink-400 font-bold truncate block">{log.title}</span>
                    <span className="text-gray-500 text-xs">{log.createdAt ? formatDate(log.createdAt) : ""}</span>
                  </div>
                  <span className="text-xl flex-shrink-0">{moods[(log.mood||3)-1]}</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">{expanded[log.id] ? log.content : log.content?.slice(0,100) + (log.content?.length > 100 ? "..." : "")}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {log.content?.length > 100 && <button onClick={() => setExpanded({...expanded,[log.id]:!expanded[log.id]})} className="text-purple-400 text-xs hover:text-pink-400 min-h-[44px] pr-2">&gt; {expanded[log.id]?"COLLAPSE":"EXPAND"}</button>}
                  <button onClick={() => { setEditingId(log.id); setEditData({title:log.title,content:log.content,mood:log.mood}); }} className="text-purple-400 text-xs hover:text-pink-400 min-h-[44px] pr-2">&gt; EDIT</button>
                  <button onClick={() => setDeleteTarget(log)} className="bg-transparent border border-red-600 text-red-500 hover:bg-red-900 text-xs px-3 py-1 rounded-sm min-h-[44px]">&gt; DELETE</button>
                </div>
              </>
            )}
          </TerminalCard>
        ))}
        {logs.length === 0 && <p className="text-gray-600 text-sm">// No logs yet. Start writing!</p>}
      </div>
    </div>
  );
}

// ============================================================
// MODULE 3 — TASKS (with editing)
// ============================================================
function TasksModule({ uid, tasks }) {
  const [title, setTitle]         = useState("");
  const [priority, setPriority]   = useState("medium");
  const [dueDate, setDueDate]     = useState("");
  const [filter, setFilter]       = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData]   = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [termMsg, showTermMsg]    = useTerminalMessage();
  const today = todayStr();

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await addDoc(collection(db, `users/${uid}/tasks`), { title:title.trim(), completed:false, priority, dueDate:dueDate||null, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
      setTitle(""); setPriority("medium"); setDueDate("");
      showTermMsg("> [SUCCESS] Task added.");
    } catch { showTermMsg("> [ERROR] Failed to add task."); }
  };

  const handleToggleTask = async (task) => {
    try { await updateDoc(doc(db, `users/${uid}/tasks/${task.id}`), { completed:!task.completed, updatedAt:serverTimestamp() }); }
    catch { showTermMsg("> [ERROR] Failed to toggle task."); }
  };

  const handleEditSave = async () => {
    try {
      await updateDoc(doc(db, `users/${uid}/tasks/${editingId}`), { ...editData, updatedAt:serverTimestamp() });
      setEditingId(null);
      showTermMsg("> [SUCCESS] Task updated.");
    } catch { showTermMsg("> [ERROR] Failed to update task."); }
  };

  const handleDeleteTask = async () => {
    try { await deleteDoc(doc(db, `users/${uid}/tasks/${deleteTarget.id}`)); showTermMsg("> [SUCCESS] Task deleted."); }
    catch { showTermMsg("> [ERROR] Failed to delete."); }
    setDeleteTarget(null);
  };

  const pColor = { low:"text-gray-400", medium:"text-yellow-400", high:"text-red-400" };

  const sorted = [...tasks].sort((a,b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1; if (b.dueDate) return 1;
    return ({high:0,medium:1,low:2}[a.priority]||1) - ({high:0,medium:1,low:2}[b.priority]||1);
  });

  const filtered = sorted.filter((t) => {
    if (filter === "ACTIVE")        return !t.completed;
    if (filter === "COMPLETED")     return t.completed;
    if (filter === "HIGH PRIORITY") return t.priority === "high";
    return true;
  });

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteTarget} itemName={deleteTarget?.title||""} onConfirm={handleDeleteTask} onCancel={() => setDeleteTarget(null)} />

      <TerminalCard title="> new_task.exe">
        <form onSubmit={handleAddTask} className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="task title..." className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          <div className="flex gap-2 flex-wrap">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm flex-1 min-w-0">
              <option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm flex-1 min-w-0" />
            <button type="submit" className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px] whitespace-nowrap">&gt; ADD</button>
          </div>
          <TerminalMessage message={termMsg} />
        </form>
      </TerminalCard>

      <div className="flex gap-2 flex-wrap">
        {["ALL","ACTIVE","COMPLETED","HIGH PRIORITY"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-2 rounded-sm transition-all min-h-[44px] ${filter===f?"bg-purple-700 text-white":"bg-gray-800 text-gray-400 hover:text-purple-300 border border-gray-700"}`}>{f}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((task) => {
          const isOverdue = task.dueDate && task.dueDate < today && !task.completed;
          if (editingId === task.id) return (
            <TerminalCard key={task.id} title="> edit_task.exe">
              <div className="space-y-2">
                <input value={editData.title||""} onChange={(e) => setEditData({...editData,title:e.target.value})} className="w-full bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
                <div className="flex gap-2 flex-wrap">
                  <select value={editData.priority||"medium"} onChange={(e) => setEditData({...editData,priority:e.target.value})} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none px-3 py-2 text-sm rounded-sm">
                    <option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option>
                  </select>
                  <input type="date" value={editData.dueDate||""} onChange={(e) => setEditData({...editData,dueDate:e.target.value})} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none px-3 py-2 text-sm rounded-sm flex-1" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleEditSave} className="bg-transparent border border-green-600 text-green-400 hover:bg-green-900 text-xs px-3 py-2 rounded-sm min-h-[44px]">&gt; SAVE</button>
                  <button onClick={() => setEditingId(null)} className="bg-transparent border border-gray-600 text-gray-400 text-xs px-3 py-2 rounded-sm min-h-[44px]">&gt; CANCEL</button>
                </div>
              </div>
            </TerminalCard>
          );
          return (
            <div key={task.id} className={`bg-gray-900 border rounded-sm p-3 flex items-start gap-3 ${isOverdue?"border-red-600":"border-purple-800"}`}>
              <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task)} className="accent-pink-500 mt-1 w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className={task.completed ? "text-gray-600 line-through text-sm" : "text-gray-200 text-sm break-words"}>{task.title}</span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs ${pColor[task.priority]||"text-gray-400"}`}>[{task.priority?.toUpperCase()}]</span>
                  {task.dueDate && <span className="text-gray-500 text-xs">due: {task.dueDate}</span>}
                  {isOverdue && <span className="text-red-400 text-xs font-bold">[OVERDUE]</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditingId(task.id); setEditData({title:task.title,priority:task.priority,dueDate:task.dueDate||""}); }} className="text-purple-400 text-xs hover:text-pink-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">✎</button>
                <button onClick={() => setDeleteTarget(task)} className="bg-transparent border border-red-700 text-red-500 hover:bg-red-900 text-xs px-2 py-1 rounded-sm min-h-[44px]">✕</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-gray-600 text-sm">// No tasks in this filter.</p>}
      </div>
    </div>
  );
}

// ============================================================
// MODULE 4 — GOALS
// ============================================================
function GoalsModule({ uid, goals }) {
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [milestoneInput, setMilestoneInput] = useState("");
  const [localMilestones, setLocalMilestones] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [termMsg, showTermMsg]          = useTerminalMessage();

  const handleAddMilestone = () => { if (!milestoneInput.trim()) return; setLocalMilestones([...localMilestones,{text:milestoneInput.trim(),done:false}]); setMilestoneInput(""); };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await addDoc(collection(db,`users/${uid}/goals`), { title:title.trim(), description:description.trim(), achieved:false, progress:0, milestones:localMilestones, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
      setTitle(""); setDescription(""); setLocalMilestones([]);
      showTermMsg("> [SUCCESS] Goal created.");
    } catch { showTermMsg("> [ERROR] Failed to create goal."); }
  };

  const handleToggleMilestone = async (goal, i) => {
    const updated = goal.milestones.map((m,j) => j===i?{...m,done:!m.done}:m);
    const done = updated.filter((m) => m.done).length;
    const progress = updated.length ? Math.round((done/updated.length)*100) : 0;
    try { await updateDoc(doc(db,`users/${uid}/goals/${goal.id}`), { milestones:updated, progress, achieved:progress===100, updatedAt:serverTimestamp() }); }
    catch { showTermMsg("> [ERROR] Failed to update milestone."); }
  };

  const handleDeleteGoal = async () => {
    try { await deleteDoc(doc(db,`users/${uid}/goals/${deleteTarget.id}`)); showTermMsg("> [SUCCESS] Goal deleted."); }
    catch { showTermMsg("> [ERROR] Failed to delete."); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteTarget} itemName={deleteTarget?.title||""} onConfirm={handleDeleteGoal} onCancel={() => setDeleteTarget(null)} />
      <TerminalCard title="> new_goal.exe">
        <form onSubmit={handleAddGoal} className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="goal title..." className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="describe your goal..." rows={2} className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm resize-none" />
          <div>
            <div className="text-purple-400 text-xs mb-2">&gt; MILESTONES:</div>
            <div className="flex gap-2">
              <input type="text" value={milestoneInput} onChange={(e) => setMilestoneInput(e.target.value)} onKeyDown={(e) => e.key==="Enter"&&(e.preventDefault(),handleAddMilestone())} placeholder="add milestone..." className="flex-1 bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
              <button type="button" onClick={handleAddMilestone} className="bg-gray-700 hover:bg-gray-600 text-purple-400 text-xs px-3 py-2 rounded-sm min-h-[44px]">+ ADD</button>
            </div>
            {localMilestones.length > 0 && (
              <div className="mt-2 space-y-1">
                {localMilestones.map((m,i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-purple-400">◆</span><span className="flex-1 text-gray-300">{m.text}</span>
                    <button type="button" onClick={() => setLocalMilestones(localMilestones.filter((_,j)=>j!==i))} className="text-red-500 text-xs p-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px]">&gt; CREATE GOAL</button>
          <TerminalMessage message={termMsg} />
        </form>
      </TerminalCard>

      <div className="space-y-4">
        {goals.map((goal) => (
          <TerminalCard key={goal.id} title={`> goal_${goal.id.slice(0,6)}.sys`} className={goal.achieved?"border-green-600":""}>
            <div className="flex justify-between items-start mb-2 gap-2">
              <div className="min-w-0">
                <span className="text-pink-400 font-bold block truncate">{goal.title}</span>
                {goal.achieved && <span className="text-green-400 text-xs">[ACHIEVED ✓]</span>}
              </div>
              <button onClick={() => setDeleteTarget(goal)} className="bg-transparent border border-red-700 text-red-500 hover:bg-red-900 text-xs px-2 py-1 rounded-sm flex-shrink-0 min-h-[44px]">✕</button>
            </div>
            {goal.description && <p className="text-gray-400 text-sm mb-3">{goal.description}</p>}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-400">PROGRESS</span>
                <span className="text-pink-400">{goal.progress||0}%</span>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-sm">
                <div style={{width:`${goal.progress||0}%`}} className="bg-purple-500 h-2 rounded-sm transition-all" />
              </div>
            </div>
            {goal.milestones?.length > 0 && (
              <div className="space-y-1.5">
                {goal.milestones.map((m,i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={m.done} onChange={() => handleToggleMilestone(goal,i)} className="accent-pink-500 w-4 h-4 flex-shrink-0" />
                    <span className={`text-sm ${m.done?"text-gray-600 line-through":"text-gray-300"}`}>{m.text}</span>
                  </label>
                ))}
              </div>
            )}
          </TerminalCard>
        ))}
        {goals.length === 0 && <p className="text-gray-600 text-sm">// No goals yet. Dream big!</p>}
      </div>
    </div>
  );
}

// ============================================================
// MODULE 5 — HABITS (with per-habit streak)
// ============================================================
function HabitsModule({ uid, habits, habitCompletions }) {
  const [name, setName]                 = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [termMsg, showTermMsg]          = useTerminalMessage();
  const today = todayStr();

  const last7Days = Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(0,10); });

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(collection(db,`users/${uid}/habits`), { name:name.trim(), createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
      setName("");
      showTermMsg("> [SUCCESS] Habit added.");
    } catch { showTermMsg("> [ERROR] Failed to add habit."); }
  };

  const handleMarkToday = async (habitId) => {
    try {
      await setDoc(doc(db,`users/${uid}/habits/${habitId}/completions/${today}`), { completedAt:serverTimestamp() });
      showTermMsg("> [SUCCESS] Habit marked complete.");
    } catch { showTermMsg("> [ERROR] Failed to mark habit."); }
  };

  const handleDeleteHabit = async () => {
    try {
      // Note: habit completion subcollections require Cloud Functions for full cleanup in production
      await deleteDoc(doc(db,`users/${uid}/habits/${deleteTarget.id}`));
      showTermMsg("> [SUCCESS] Habit deleted.");
    } catch { showTermMsg("> [ERROR] Failed to delete habit."); }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteTarget} itemName={deleteTarget?.name||""} onConfirm={handleDeleteHabit} onCancel={() => setDeleteTarget(null)} />

      <TerminalCard title="> new_habit.exe">
        <form onSubmit={handleAddHabit} className="flex gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="habit name..." className="flex-1 bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm min-w-0" />
          <button type="submit" className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px] whitespace-nowrap">&gt; ADD</button>
        </form>
        <TerminalMessage message={termMsg} />
      </TerminalCard>

      <div className="space-y-3">
        {habits.map((habit) => {
          const completions = habitCompletions[habit.id] || [];
          const doneToday = completions.includes(today);
          const streak = calcHabitStreak(completions);
          return (
            <TerminalCard key={habit.id} title={`> ${habit.name.toLowerCase().replace(/ /g,"_")}.habit`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <span className="text-pink-400 font-bold block truncate">{habit.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-orange-400 text-xs">🔥 {streak} day streak</span>
                    <span className="text-gray-600 text-xs">· {completions.length} total</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doneToday ? (
                    <span className="text-green-400 text-xs font-bold bg-green-900/30 border border-green-700 px-2 py-1 rounded-sm">[DONE ✓]</span>
                  ) : (
                    <button onClick={() => handleMarkToday(habit.id)} className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded-sm min-h-[44px]">&gt; MARK TODAY</button>
                  )}
                  <button onClick={() => setDeleteTarget(habit)} className="bg-transparent border border-red-700 text-red-500 hover:bg-red-900 text-xs px-2 py-1 rounded-sm min-h-[44px]">✕</button>
                </div>
              </div>
              <div className="flex gap-1">
                {last7Days.map((day) => (
                  <div key={day} title={day} className={`flex-1 h-6 rounded-sm transition-all ${completions.includes(day) ? "bg-pink-500" : "bg-gray-800"}`} />
                ))}
              </div>
              <div className="flex mt-1">
                {last7Days.map((day) => <span key={day} className="flex-1 text-center text-gray-700 text-xs">{day.slice(8)}</span>)}
              </div>
            </TerminalCard>
          );
        })}
        {habits.length === 0 && <p className="text-gray-600 text-sm">// No habits yet. Start building good ones!</p>}
      </div>
    </div>
  );
}

// ============================================================
// MODULE 6 — MONEY TRACKER
// ============================================================
function MoneyModule({ uid, moneyEntries }) {
  const [title, setTitle]             = useState("");
  const [amount, setAmount]           = useState("");
  const [type, setType]               = useState("expense");
  const [category, setCategory]       = useState("OTHER");
  const [date, setDate]               = useState(todayStr());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [termMsg, showTermMsg]        = useTerminalMessage();

  const categories = ["SALARY","FREELANCE","FOOD","TRANSPORT","HEALTH","ENTERTAINMENT","UTILITIES","OTHER"];

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    try {
      await addDoc(collection(db,`users/${uid}/money`), { title:title.trim(), amount:parseFloat(amount), type, category, date, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
      setTitle(""); setAmount(""); setType("expense"); setCategory("OTHER"); setDate(todayStr());
      showTermMsg("> [SUCCESS] Entry added.");
    } catch { showTermMsg("> [ERROR] Failed to add entry."); }
  };

  const handleDeleteEntry = async () => {
    try { await deleteDoc(doc(db,`users/${uid}/money/${deleteTarget.id}`)); showTermMsg("> [SUCCESS] Entry deleted."); }
    catch { showTermMsg("> [ERROR] Failed to delete."); }
    setDeleteTarget(null);
  };

  const filtered  = moneyEntries.filter((e) => e.date?.slice(0,7) === selectedMonth);
  const income    = filtered.filter((e) => e.type==="income").reduce((a,e) => a+e.amount, 0);
  const expenses  = filtered.filter((e) => e.type==="expense").reduce((a,e) => a+e.amount, 0);
  const net       = income - expenses;
  const catBreak  = categories.reduce((acc,cat) => { const t=filtered.filter((e) => e.category===cat&&e.type==="expense").reduce((a,e)=>a+e.amount,0); if(t>0) acc[cat]=t; return acc; }, {});
  const maxCat    = Math.max(...Object.values(catBreak),1);

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteTarget} itemName={deleteTarget?.title||""} onConfirm={handleDeleteEntry} onCancel={() => setDeleteTarget(null)} />

      <TerminalCard title="> new_entry.exe">
        <form onSubmit={handleAddEntry} className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="description..." className="w-full bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" className="bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm">
              <option value="income">INCOME</option><option value="expense">EXPENSE</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          </div>
          <button type="submit" className="w-full bg-purple-700 hover:bg-purple-600 text-white text-sm py-2 rounded-sm min-h-[44px]">&gt; ADD ENTRY</button>
          <TerminalMessage message={termMsg} />
        </form>
      </TerminalCard>

      <TerminalCard title="> financial_summary.sys">
        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm mb-4 w-full sm:w-auto" />
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded-sm p-2 text-center"><div className="text-green-400 font-bold">+{income.toFixed(0)}</div><div className="text-gray-600 text-xs">INCOME</div></div>
          <div className="bg-gray-800/50 rounded-sm p-2 text-center"><div className="text-red-400 font-bold">-{expenses.toFixed(0)}</div><div className="text-gray-600 text-xs">EXPENSES</div></div>
          <div className="bg-gray-800/50 rounded-sm p-2 text-center"><div className={`font-bold ${net>=0?"text-pink-400":"text-red-400"}`}>{net>=0?"+":""}{net.toFixed(0)}</div><div className="text-gray-600 text-xs">NET</div></div>
        </div>
      </TerminalCard>

      {Object.keys(catBreak).length > 0 && (
        <TerminalCard title="> category_breakdown.exe">
          <div className="space-y-2">
            {Object.entries(catBreak).map(([cat,amt]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-purple-400 text-xs w-24 flex-shrink-0">[{cat}]</span>
                <div className="flex-1 bg-gray-800 h-2.5 rounded-sm"><div style={{width:`${(amt/maxCat)*100}%`}} className="bg-purple-600 h-2.5 rounded-sm" /></div>
                <span className="text-red-400 text-xs w-14 text-right flex-shrink-0">{amt.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </TerminalCard>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div key={entry.id} className={`bg-gray-900 border border-purple-800 rounded-sm p-3 flex items-center gap-3 border-l-4 ${entry.type==="income"?"border-l-green-500":"border-l-red-500"}`}>
            <div className="flex-1 min-w-0">
              <div className="text-gray-200 text-sm truncate">{entry.title}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-purple-400 text-xs">[{entry.category}]</span>
                <span className="text-gray-600 text-xs">{entry.date}</span>
              </div>
            </div>
            <span className={`font-bold text-sm flex-shrink-0 ${entry.type==="income"?"text-green-400":"text-red-400"}`}>{entry.type==="income"?"+":"-"}{entry.amount?.toFixed(2)}</span>
            <button onClick={() => setDeleteTarget(entry)} className="bg-transparent border border-red-700 text-red-500 hover:bg-red-900 text-xs px-2 py-1 rounded-sm flex-shrink-0 min-h-[44px]">✕</button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-gray-600 text-sm">// No entries for this month.</p>}
      </div>
    </div>
  );
}

// ============================================================
// MODULE 7 — POMODORO TIMER (timer state is LIFTED to parent)
// ============================================================
function PomodoroModule({ uid, pomodoroSessions, settings, sessionTitle, setSessionTitle, sessionType, setSessionType, duration, setDuration, timeLeft, setTimeLeft, isRunning, setIsRunning, completeFnRef }) {
  const [termMsg, showTermMsg] = useTerminalMessage();
  const today = todayStr();

  // Register the completion callback with the parent
  useEffect(() => {
    completeFnRef.current = async () => {
      showTermMsg("> SESSION COMPLETE. +1 FOCUS BLOCK.");
      try {
        await addDoc(collection(db,`users/${uid}/pomodoro`), {
          title: sessionTitle || "Untitled Session",
          duration, type: sessionType,
          completedAt: serverTimestamp(), createdAt: serverTimestamp(),
        });
      } catch (err) { console.error("SavePomodoro:", err); }
      // Auto-switch
      const nextType = sessionType === "work" ? "break" : "work";
      const nextDur  = nextType === "work" ? (settings.defaultPomodoroDuration || 25) : 5;
      setSessionType(nextType);
      setDuration(nextDur);
      setTimeLeft(nextDur * 60);
    };
  }, [sessionTitle, sessionType, duration, uid, settings]);

  const handleStart = () => { if (timeLeft > 0) setIsRunning(true); };
  const handlePause = () => setIsRunning(false);
  const handleReset = () => { setIsRunning(false); setTimeLeft(duration * 60); };

  const handleDeleteSession = async (id) => {
    try { await deleteDoc(doc(db,`users/${uid}/pomodoro/${id}`)); }
    catch { showTermMsg("> [ERROR] Failed to delete session."); }
  };

  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");
  const progress = ((duration*60 - timeLeft) / (duration*60)) * 100;

  const todaySessions = pomodoroSessions.filter((s) => s.completedAt?.toDate?.()?.toISOString().slice(0,10)===today && s.type==="work");
  const last7Days = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
  const sessionsByDay = last7Days.map((day) => pomodoroSessions.filter((s) => s.completedAt?.toDate?.()?.toISOString().slice(0,10)===day&&s.type==="work").length);
  const maxDay = Math.max(...sessionsByDay,1);

  const weekSessions = pomodoroSessions.filter((s) => { const d=s.completedAt?.toDate?.(); if(!d) return false; const w=new Date(); w.setDate(w.getDate()-7); return d>w&&s.type==="work"; }).length;
  const weeklyGoal = settings.weeklyPomodoroGoal || 10;

  return (
    <div className="space-y-4">
      <TerminalCard title="> pomodoro_timer.exe">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <input type="text" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="session title..." className="flex-1 bg-gray-800 border border-purple-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm min-w-0" />
            <input type="number" value={duration} onChange={(e) => { const v=parseInt(e.target.value)||25; setDuration(v); if(!isRunning) setTimeLeft(v*60); }} className="w-20 bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" min="1" />
            <button onClick={() => { setSessionType(sessionType==="work"?"break":"work"); if(!isRunning){const nd=sessionType==="work"?5:settings.defaultPomodoroDuration||25; setDuration(nd); setTimeLeft(nd*60);} }}
              className={`px-3 py-2 text-xs rounded-sm border min-h-[44px] ${sessionType==="work"?"border-pink-500 text-pink-400 bg-pink-500/10":"border-green-500 text-green-400 bg-green-500/10"}`}>
              {sessionType.toUpperCase()}
            </button>
          </div>

          <div className="text-center py-4">
            <div className={`text-5xl sm:text-7xl font-mono mb-4 transition-colors ${isRunning ? "text-pink-400" : "text-purple-400"}`}>{mm}:{ss}</div>
            <div className="w-full bg-gray-800 h-2 rounded-sm mb-4">
              <div style={{width:`${progress}%`}} className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-sm transition-all" />
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <button onClick={handleStart} disabled={isRunning} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-sm min-h-[44px]">&gt; START</button>
              <button onClick={handlePause} disabled={!isRunning} className="bg-transparent border border-yellow-600 text-yellow-400 hover:bg-yellow-900 disabled:opacity-40 text-sm px-5 py-2 rounded-sm min-h-[44px]">&gt; PAUSE</button>
              <button onClick={handleReset} className="bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-800 text-sm px-5 py-2 rounded-sm min-h-[44px]">&gt; RESET</button>
            </div>
            <TerminalMessage message={termMsg} />
          </div>
        </div>
      </TerminalCard>

      <TerminalCard title="> pomodoro_stats.sys">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center bg-gray-800/50 rounded-sm py-2"><div className="text-pink-400 text-xl font-bold">{todaySessions.length}</div><div className="text-gray-600 text-xs">TODAY</div></div>
          <div className="text-center bg-gray-800/50 rounded-sm py-2"><div className="text-purple-400 text-xl font-bold">{todaySessions.reduce((a,s)=>a+(s.duration||0),0)}</div><div className="text-gray-600 text-xs">MIN TODAY</div></div>
          <div className="text-center bg-gray-800/50 rounded-sm py-2"><div className="text-pink-400 text-xl font-bold">{weekSessions}</div><div className="text-gray-600 text-xs">THIS WEEK</div></div>
          <div className="text-center bg-gray-800/50 rounded-sm py-2"><div className="text-purple-400 text-xl font-bold">{weeklyGoal}</div><div className="text-gray-600 text-xs">WEEKLY GOAL</div></div>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-purple-400">WEEKLY PROGRESS</span>
            <span className="text-pink-400">{weekSessions}/{weeklyGoal}</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-sm">
            <div style={{width:`${Math.min(100,(weekSessions/weeklyGoal)*100)}%`}} className="bg-pink-500 h-2 rounded-sm transition-all" />
          </div>
        </div>
        <div className="flex items-end gap-1 h-14">
          {sessionsByDay.map((count,i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div style={{height:count?`${(count/maxDay)*44}px`:"3px"}} className="w-full bg-purple-500 rounded-sm" />
              <span className="text-gray-700 text-xs">{last7Days[i].slice(8)}</span>
            </div>
          ))}
        </div>
      </TerminalCard>

      <TerminalCard title="> session_history.log">
        <div className="space-y-1">
          {pomodoroSessions.slice(0,20).map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800 gap-2">
              <div className="min-w-0">
                <span className="text-gray-300 text-sm truncate block">{s.title}</span>
                <span className={`text-xs ${s.type==="work"?"text-pink-400":"text-green-400"}`}>[{s.type?.toUpperCase()}] {s.duration}min</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-gray-600 text-xs hidden sm:block">{s.completedAt?formatDate(s.completedAt):""}</span>
                <button onClick={() => handleDeleteSession(s.id)} className="border border-red-700 text-red-500 hover:bg-red-900 text-xs px-2 py-1 rounded-sm min-h-[44px]">✕</button>
              </div>
            </div>
          ))}
          {pomodoroSessions.length === 0 && <p className="text-gray-600 text-sm">// No sessions yet.</p>}
        </div>
      </TerminalCard>
    </div>
  );
}

// ============================================================
// MODULE 8 — CALENDAR
// ============================================================
function CalendarModule({ logs, tasks, pomodoroSessions, habits, habitCompletions }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = todayStr();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const firstDay     = new Date(year,month,1).getDay();
  const daysInMonth  = new Date(year,month+1,0).getDate();
  const getDayStr    = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const getDayData = (dayStr) => ({
    logs:      logs.filter((l) => l.createdAt?.toDate?.()?.toISOString().slice(0,10)===dayStr),
    tasks:     tasks.filter((t) => t.completed && t.updatedAt?.toDate?.()?.toISOString().slice(0,10)===dayStr),
    pomodoros: pomodoroSessions.filter((s) => s.completedAt?.toDate?.()?.toISOString().slice(0,10)===dayStr&&s.type==="work"),
    habits:    habits.filter((h) => habitCompletions[h.id]?.includes(dayStr)),
  });

  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  const selData = selectedDay ? getDayData(selectedDay) : null;

  return (
    <div className="space-y-4">
      <TerminalCard title="> calendar.exe">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentDate(new Date(year,month-1,1))} className="text-purple-400 hover:text-pink-400 text-sm p-2 min-h-[44px]">&lt; PREV</button>
          <span className="text-pink-400 font-bold text-sm">{monthNames[month].toUpperCase()} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year,month+1,1))} className="text-purple-400 hover:text-pink-400 text-sm p-2 min-h-[44px]">NEXT &gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="text-center text-gray-600 text-xs py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day,i) => {
            if (!day) return <div key={i} />;
            const dayStr = getDayStr(day);
            const data = getDayData(dayStr);
            const hasAct = data.logs.length>0||data.tasks.length>0||data.pomodoros.length>0||data.habits.length>0;
            const isToday = dayStr === today;
            const isSel   = dayStr === selectedDay;
            return (
              <button key={i} onClick={() => setSelectedDay(isSel?null:dayStr)}
                className={`relative flex flex-col items-center py-1 rounded-sm transition-all min-h-[44px] ${isSel?"bg-purple-900":hasAct?"bg-gray-800 hover:bg-gray-700":""} ${isToday?"border border-pink-500":"border border-transparent hover:border-purple-700"}`}>
                <span className={`text-xs ${isToday?"text-pink-400 font-bold":"text-gray-400"}`}>{day}</span>
                <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                  {data.logs.length>0     && <div className="w-1 h-1 rounded-full bg-purple-400" />}
                  {data.tasks.length>0    && <div className="w-1 h-1 rounded-full bg-pink-400" />}
                  {data.pomodoros.length>0 && <div className="w-1 h-1 rounded-full bg-cyan-400" />}
                  {data.habits.length>0   && <div className="w-1 h-1 rounded-full bg-green-400" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {[["bg-purple-400","LOGS"],["bg-pink-400","TASKS"],["bg-cyan-400","POMODORO"],["bg-green-400","HABITS"]].map(([c,l]) => (
            <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full ${c}`} />{l}
            </span>
          ))}
        </div>
      </TerminalCard>

      {selectedDay && selData && (
        <TerminalCard title={`> day_${selectedDay}.log`}>
          <div className="text-pink-400 font-bold mb-3">{selectedDay}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { color:"text-purple-400", label:"LOGS",       items:selData.logs,      render:(l)=>l.title },
              { color:"text-pink-400",   label:"TASKS DONE", items:selData.tasks,     render:(t)=>t.title },
              { color:"text-cyan-400",   label:"POMODOROS",  items:selData.pomodoros, render:(s)=>`${s.title} (${s.duration}min)` },
              { color:"text-green-400",  label:"HABITS",     items:selData.habits,    render:(h)=>h.name  },
            ].map(({ color,label,items,render }) => (
              <div key={label}>
                <div className={`${color} text-xs mb-1`}>&gt; {label} ({items.length})</div>
                {items.length===0 ? <div className="text-gray-700 text-xs">none</div> : items.map((item) => <div key={item.id} className="text-gray-300 text-sm py-0.5 truncate">{render(item)}</div>)}
              </div>
            ))}
          </div>
        </TerminalCard>
      )}
    </div>
  );
}

// ============================================================
// MODULE 9 — SETTINGS
// ============================================================
function SettingsModule({ uid, settings, setSettings, savedQuotes, currentUser, logs, tasks, goals, habits, moneyEntries, pomodoroSessions, theme, setTheme }) {
  const [displayName, setDisplayName]   = useState(settings.displayName);
  const [defaultPom, setDefaultPom]     = useState(settings.defaultPomodoroDuration);
  const [weeklyGoal, setWeeklyGoal]     = useState(settings.weeklyPomodoroGoal);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState(null);
  const [notifStatus, setNotifStatus]   = useState(localStorage.getItem("notifStatus")||"off");
  const [termMsg, showTermMsg]          = useTerminalMessage();

  const handleSaveSettings = async () => {
    try {
      await updateDoc(doc(db,`users/${uid}`), { displayName, defaultPomodoroDuration:parseInt(defaultPom), weeklyPomodoroGoal:parseInt(weeklyGoal), updatedAt:serverTimestamp() });
      setSettings((p) => ({...p, displayName, defaultPomodoroDuration:parseInt(defaultPom), weeklyPomodoroGoal:parseInt(weeklyGoal)}));
      showTermMsg("> [SUCCESS] Settings saved.");
    } catch { showTermMsg("> [ERROR] Failed to save settings."); }
  };

  const handleEnableNotifications = async () => {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      localStorage.setItem("notifStatus","granted"); setNotifStatus("granted");
      const now=new Date(); const target=new Date(now.getFullYear(),now.getMonth(),now.getDate(),20,0,0);
      if (target>now) setTimeout(() => { if (logs.filter((l)=>l.createdAt?.toDate?.()?.toISOString().slice(0,10)===todayStr()).length===0) new Notification("NoZero Reminder",{body:"You haven't logged anything today. Keep your streak alive!"}); }, target-now);
      showTermMsg("> [SUCCESS] Notifications enabled.");
    } else { showTermMsg("> [ERROR] Notification permission denied."); }
  };

  const handleExportData = async () => {
    try {
      const blob = new Blob([JSON.stringify({ exportedAt:new Date().toISOString(), uid, logs, tasks, goals, habits, moneyEntries, pomodoroSessions }, null, 2)], {type:"application/json"});
      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="nozero_export.json"; a.click();
      showTermMsg("> [SUCCESS] Data exported.");
    } catch { showTermMsg("> [ERROR] Export failed."); }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirm !== "DELETE") { showTermMsg("> [ERROR] You must type DELETE to confirm."); return; }
    try {
      for (const sub of ["logs","tasks","goals","habits","money","pomodoro","quotes"]) {
        const snap = await getDocs(collection(db,`users/${uid}/${sub}`));
        const batch = writeBatch(db); snap.docs.forEach((d)=>batch.delete(d.ref)); await batch.commit();
      }
      setDeleteConfirm("");
      showTermMsg("> [SUCCESS] All data deleted. Note: habit completions may need Cloud Functions for full cleanup.");
    } catch { showTermMsg("> [ERROR] Failed to delete all data."); }
  };

  const handleDeleteQuote = async () => {
    try { await deleteDoc(doc(db,`users/${uid}/quotes/${deleteQuoteTarget.id}`)); }
    catch { showTermMsg("> [ERROR] Failed to delete quote."); }
    setDeleteQuoteTarget(null);
  };

  return (
    <div className="space-y-4">
      <DeleteConfirmModal isOpen={!!deleteQuoteTarget} itemName={`"${deleteQuoteTarget?.text?.slice(0,30)}..."`} onConfirm={handleDeleteQuote} onCancel={()=>setDeleteQuoteTarget(null)} />

      <TerminalCard title="> settings.cfg">
        <div className="space-y-4">
          <div>
            <label className="text-purple-400 text-xs block mb-1">&gt; DISPLAY NAME</label>
            <input type="text" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full sm:max-w-sm bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-purple-400 text-xs block mb-1">&gt; DEFAULT POMODORO (min)</label>
              <input type="number" value={defaultPom} onChange={(e)=>setDefaultPom(e.target.value)} className="w-full bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" min="1" />
            </div>
            <div>
              <label className="text-purple-400 text-xs block mb-1">&gt; WEEKLY GOAL</label>
              <input type="number" value={weeklyGoal} onChange={(e)=>setWeeklyGoal(e.target.value)} className="w-full bg-gray-800 border border-purple-700 text-gray-200 focus:outline-none focus:border-pink-500 px-3 py-2 text-sm rounded-sm" min="1" />
            </div>
          </div>
          <div>
            <label className="text-purple-400 text-xs block mb-2">&gt; THEME</label>
            <div className="flex gap-2">
              {[["dark","DARK"],["darker","DARKER"]].map(([val,label]) => (
                <button key={val} onClick={()=>setTheme(val)} className={`px-4 py-2 text-sm rounded-sm border transition-all min-h-[44px] ${theme===val?"bg-purple-700 border-purple-600 text-white":"bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-700"}`}>{label}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSaveSettings} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-5 py-2 rounded-sm min-h-[44px]">&gt; SAVE SETTINGS</button>
          <TerminalMessage message={termMsg} />
        </div>
      </TerminalCard>

      <TerminalCard title="> notifications.sys">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleEnableNotifications} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px]">&gt; ENABLE REMINDERS</button>
          {notifStatus==="granted" && <span className="text-green-400 text-xs">[ACTIVE ✓]</span>}
        </div>
      </TerminalCard>

      <TerminalCard title="> export.exe">
        <button onClick={handleExportData} className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-sm min-h-[44px]">&gt; EXPORT ALL DATA</button>
      </TerminalCard>

      <TerminalCard title="> danger_zone.exe" className="border-red-700">
        <div className="space-y-3">
          <p className="text-red-400 text-sm">&gt; [WARNING] This action is irreversible.</p>
          <p className="text-gray-600 text-xs">Note: habit completion subcollections require Cloud Functions for full deletion.</p>
          <input type="text" value={deleteConfirm} onChange={(e)=>setDeleteConfirm(e.target.value)} placeholder='type "DELETE" to confirm...' className="w-full sm:max-w-sm bg-gray-800 border border-red-700 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500 px-3 py-2 text-sm rounded-sm" />
          <button onClick={handleDeleteAllData} className="bg-transparent border border-red-600 text-red-400 hover:bg-red-950 text-sm px-4 py-2 rounded-sm min-h-[44px]">&gt; DELETE ALL MY DATA</button>
        </div>
      </TerminalCard>

      {savedQuotes.length > 0 && (
        <TerminalCard title="> favourite_quotes.txt">
          <div className="space-y-3">
            {savedQuotes.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-2 border-b border-gray-800 pb-2">
                <div className="min-w-0">
                  <p className="text-gray-300 text-sm italic truncate">"{q.text}"</p>
                  <p className="text-purple-400 text-xs">— {q.author}</p>
                </div>
                <button onClick={()=>setDeleteQuoteTarget(q)} className="border border-red-700 text-red-500 hover:bg-red-950 text-xs px-2 py-1 rounded-sm flex-shrink-0 min-h-[44px]">✕</button>
              </div>
            ))}
          </div>
        </TerminalCard>
      )}
    </div>
  );
}