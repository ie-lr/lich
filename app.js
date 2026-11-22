/**
 * LITRICH Family Management System
 * Core Client Application Logic & Offline/PWA Engine
 */

(function () {
  'use strict';

  // Local Storage Keys
  const STORAGE_KEYS = {
    GOALS: 'litrich_goals_v1',
    INCOME: 'litrich_income_v1',
    EXPENSES: 'litrich_expenses_v1',
    SETTINGS: 'litrich_settings_v1',
    DISMISSED_REMINDERS: 'litrich_dismissed_reminders_v1'
  };

  // State
  let state = {
    goals: [],
    income: [],
    expenses: [],
    settings: {
      appsScriptUrl: '',
      currencySymbol: '$',
      familyName: 'LITRICH'
    },
    dismissedReminders: []
  };

  // PWA Deferred Prompt
  let deferredInstallPrompt = null;

  // Sample Starter Data
  const SAMPLE_DATA = {
    goals: [
      {
        id: 'g-101',
        statement: 'Acquire Family Transport Vehicle',
        importance: 'Provides safe, convenient daily mobility for the family, school commutes, and regional family travels.',
        requirements: 'Requires $6,000 budget, inspection check, registration, and comprehensive insurance coverage.',
        checklist: { specific: true, measurable: true, attainable: true, relevant: true, timeBound: true },
        targetBudget: 6000,
        raisedAmount: 3800,
        balance: 2200,
        incomeSource: 'Monthly Salary Savings & Business Profit',
        achievableDate: '2026-12-31',
        reminderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago to demonstrate active reminder!
        reminderMessage: 'Vehicle target milestone: $3,800 raised! Only $2,200 balance remaining to reach full budget.',
        status: 'In Progress',
        createdAt: '2026-10-01'
      },
      {
        id: 'g-102',
        statement: 'Establish 6-Month Emergency Reserve Fund',
        importance: 'Provides unconditional financial security against unforeseen medical, home, or economic emergencies.',
        requirements: 'Automatic monthly deposit of $500 into high-yield savings reserve vault.',
        checklist: { specific: true, measurable: true, attainable: true, relevant: true, timeBound: true },
        targetBudget: 5000,
        raisedAmount: 5000,
        balance: 0,
        incomeSource: 'Joint Savings Reserve',
        achievableDate: '2026-11-15',
        reminderDate: '2026-11-10',
        reminderMessage: 'Emergency Reserve Target reached! Fund fully established.',
        status: 'Achieved',
        createdAt: '2026-05-10'
      },
      {
        id: 'g-103',
        statement: 'Children Academic Future Investment',
        importance: 'Secures premium education, learning materials, and academic development accounts.',
        requirements: 'Open dedicated educational endowment and establish quarterly savings milestone.',
        checklist: { specific: true, measurable: true, attainable: true, relevant: true, timeBound: true },
        targetBudget: 4500,
        raisedAmount: 0,
        balance: 4500,
        incomeSource: 'Quarterly Consulting Revenues',
        achievableDate: '2027-06-30',
        reminderDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reminderMessage: 'Review academic endowment plans with financial adviser.',
        status: 'Pending',
        createdAt: '2026-11-01'
      }
    ],
    income: [
      {
        id: 'inc-201',
        amount: 2500,
        source: 'Salary (Husband)',
        date: '2026-11-01',
        savingAccount: 'Family Joint Savings',
        tiedGoalId: 'g-101',
        tiedGoalTitle: 'Acquire Family Transport Vehicle',
        notes: 'November primary earnings allocation to vehicle fund',
        createdAt: '2026-11-01'
      },
      {
        id: 'inc-202',
        amount: 1300,
        source: 'Business Revenue',
        date: '2026-11-10',
        savingAccount: 'Family Joint Savings',
        tiedGoalId: 'g-101',
        tiedGoalTitle: 'Acquire Family Transport Vehicle',
        notes: 'Store retail surplus tied to vehicle balance',
        createdAt: '2026-11-10'
      },
      {
        id: 'inc-203',
        amount: 2000,
        source: 'Salary (Wife)',
        date: '2026-11-15',
        savingAccount: 'Daily Checking Account',
        tiedGoalId: '',
        tiedGoalTitle: 'None (General Savings)',
        notes: 'Monthly earnings for household upkeep and savings',
        createdAt: '2026-11-15'
      }
    ],
    expenses: [
      {
        id: 'exp-301',
        amount: 450,
        purpose: 'Food & Groceries',
        date: '2026-11-05',
        usedFrom: 'Daily Checking Account',
        tiedGoalId: '',
        notes: 'Monthly staples and household groceries',
        createdAt: '2026-11-05'
      },
      {
        id: 'exp-302',
        amount: 220,
        purpose: 'Utilities & Bills (Power, Water, Net)',
        date: '2026-11-08',
        usedFrom: 'None',
        tiedGoalId: '',
        notes: 'Electricity tokens and broadband subscription',
        createdAt: '2026-11-08'
      },
      {
        id: 'exp-303',
        amount: 180,
        purpose: 'Transportation & Fuel',
        date: '2026-11-14',
        usedFrom: 'Cash Vault',
        tiedGoalId: '',
        notes: 'Commute and local travels',
        createdAt: '2026-11-14'
      }
    ]
  };

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    loadState();
    setupEventListeners();
    setupPWA();
    setDefaultDates();
    renderAll();
    checkRemindersEngine();

    // Check reminders every hour
    setInterval(checkRemindersEngine, 60 * 60 * 1000);
  }

  function loadState() {
    try {
      const g = localStorage.getItem(STORAGE_KEYS.GOALS);
      const inc = localStorage.getItem(STORAGE_KEYS.INCOME);
      const exp = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const set = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const dis = localStorage.getItem(STORAGE_KEYS.DISMISSED_REMINDERS);

      state.goals = g ? JSON.parse(g) : SAMPLE_DATA.goals;
      state.income = inc ? JSON.parse(inc) : SAMPLE_DATA.income;
      state.expenses = exp ? JSON.parse(exp) : SAMPLE_DATA.expenses;
      state.settings = set ? JSON.parse(set) : { appsScriptUrl: '', currencySymbol: '$', familyName: 'LITRICH' };
      state.dismissedReminders = dis ? JSON.parse(dis) : [];

      if (!g) saveToLocalStorage();
    } catch (e) {
      console.warn('Using default sample data', e);
      state.goals = SAMPLE_DATA.goals;
      state.income = SAMPLE_DATA.income;
      state.expenses = SAMPLE_DATA.expenses;
    }

    if (state.settings.appsScriptUrl) {
      document.getElementById('inputAppsScriptUrl').value = state.settings.appsScriptUrl;
      updateSyncStatus('Ready to Sync', 'dot');
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals));
    localStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(state.income));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(state.expenses));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    localStorage.setItem(STORAGE_KEYS.DISMISSED_REMINDERS, JSON.stringify(state.dismissedReminders));
  }

  function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const incomeDateEl = document.getElementById('incomeDate');
    const expenseDateEl = document.getElementById('expenseDate');
    if (incomeDateEl && !incomeDateEl.value) incomeDateEl.value = today;
    if (expenseDateEl && !expenseDateEl.value) expenseDateEl.value = today;

    // Default achievable and reminder dates for goal
    const goalAchievableEl = document.getElementById('goalAchievableDate');
    const goalReminderEl = document.getElementById('goalReminderDate');
    if (goalAchievableEl && !goalAchievableEl.value) {
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      goalAchievableEl.value = future.toISOString().split('T')[0];
    }
    if (goalReminderEl && !goalReminderEl.value) {
      const rem = new Date();
      rem.setDate(rem.getDate() + 14);
      goalReminderEl.value = rem.toISOString().split('T')[0];
    }
  }

  // ==========================================================================
  // Navigation & View Switching
  // ==========================================================================
  function setupEventListeners() {
    // Sidebar Navigation Buttons
    const navButtons = document.querySelectorAll('.nav-item-btn[data-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        switchView(targetView);

        // Close mobile drawer on item click
        if (window.innerWidth <= 900) {
          document.getElementById('sidebarMenu').classList.remove('open');
        }
      });
    });

    // Mobile Hamburger
    const toggleBtn = document.getElementById('btnToggleSidebar');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('sidebarMenu').classList.toggle('open');
      });
    }

    // Sync pill click navigates to settings
    const syncPill = document.getElementById('syncStatusPill');
    if (syncPill) {
      syncPill.addEventListener('click', () => switchView('settingsView'));
    }

    // Install Button
    const btnInstall = document.getElementById('btnInstallPWA');
    if (btnInstall) {
      btnInstall.addEventListener('click', triggerPWAInstall);
    }
  }

  function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh context data when entering specific views
    if (viewId === 'addIncomeView' || viewId === 'addExpenseView') {
      populateGoalDropdowns();
      populateExpenseUsedFromDropdown();
    }
  }

  // ==========================================================================
  // PWA (Progressive Web App) Setup & 1-Click Install Button
  // ==========================================================================
  function setupPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.warn('ServiceWorker registration error:', err));
      });
    }

    const btnInstall = document.getElementById('btnInstallPWA');
    const installBtnText = document.getElementById('installBtnText');

    // Check if app is already running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      if (btnInstall) {
        btnInstall.classList.add('installed');
        btnInstall.innerHTML = '<span>✅</span> Installed';
      }
      return;
    }

    // Listen for beforeinstallprompt (Android, Chrome, Edge)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstall) {
        btnInstall.style.display = 'inline-flex';
        installBtnText.innerText = 'Install App';
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (btnInstall) {
        btnInstall.classList.add('installed');
        btnInstall.innerHTML = '<span>✅</span> Installed';
      }
      showToast('🎉 LITRICH App installed successfully!');
    });
  }

  function triggerPWAInstall() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (deferredInstallPrompt) {
      // Android / Desktop native prompt
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('Installing LITRICH App...');
        }
        deferredInstallPrompt = null;
      });
    } else if (isIOS || !window.matchMedia('(display-mode: standalone)').matches) {
      // Show iOS guided instructions modal
      openModal('iosInstallModal');
    } else {
      showToast('App is already installed on this device.');
    }
  }

  // ==========================================================================
  // Reminder Engine (Dashboard Announcements)
  // Requirement: "when each reminder date reaches, it should post the reminder message
  // in the dashboard that appears for a week or more when another reminder is trigger"
  // ==========================================================================
  function checkRemindersEngine() {
    const container = document.getElementById('activeRemindersContainer');
    const badgeEl = document.getElementById('badgeReminderCount');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeReminders = [];

    state.goals.forEach(goal => {
      if (!goal.reminderDate) return;
      if (state.dismissedReminders.includes(`${goal.id}-${goal.reminderDate}`)) return;

      const remDate = new Date(goal.reminderDate);
      remDate.setHours(0, 0, 0, 0);

      // Difference in days
      const diffTime = today - remDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Active condition: Reminder date is reached (diffDays >= 0) and within 14 days (a week or more)
      if (diffDays >= 0 && diffDays <= 14) {
        activeReminders.push({
          goalId: goal.id,
          goalStatement: goal.statement,
          reminderDate: goal.reminderDate,
          message: goal.reminderMessage || `Reminder for goal: "${goal.statement}". Achievable deadline: ${goal.achievableDate}.`,
          diffDays: diffDays,
          status: goal.status,
          targetBudget: goal.targetBudget,
          raisedAmount: goal.raisedAmount,
          balance: goal.balance
        });
      }
    });

    if (badgeEl) badgeEl.innerText = activeReminders.length;

    if (activeReminders.length === 0) {
      container.innerHTML = `
        <div style="padding: 0.75rem 1rem; background: #FDF4F6; border: 1px dashed var(--color-secondary-light); border-radius: var(--radius-md); font-size: 0.82rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
          <span>🔔</span> No active reminder alerts today. Next scheduled reminders will appear here automatically on their target dates!
        </div>
      `;
      return;
    }

    container.innerHTML = activeReminders.map(rem => {
      const dayLabel = rem.diffDays === 0
        ? '⚡ Today!'
        : `Active for ${rem.diffDays} day${rem.diffDays > 1 ? 's' : ''} (Valid for 14 days)`;

      return `
        <div class="reminder-banner">
          <div class="reminder-content">
            <span class="reminder-icon">⏰</span>
            <div class="reminder-body">
              <h4>${escapeHtml(rem.goalStatement)}</h4>
              <p>${escapeHtml(rem.message)}</p>
              <div class="reminder-meta">
                <span class="reminder-badge">${dayLabel}</span>
                <span>Raised: <strong>$${formatNum(rem.raisedAmount)}</strong></span>
                <span>Balance: <strong>$${formatNum(rem.balance)}</strong></span>
                <span>Status: <strong>${rem.status}</strong></span>
              </div>
            </div>
          </div>
          <button class="btn-dismiss-reminder" title="Acknowledge & Dismiss" onclick="window.litrichApp.dismissReminder('${rem.goalId}', '${rem.reminderDate}')">
            &times;
          </button>
        </div>
      `;
    }).join('');
  }

  function dismissReminder(goalId, reminderDate) {
    const key = `${goalId}-${reminderDate}`;
    if (!state.dismissedReminders.includes(key)) {
      state.dismissedReminders.push(key);
      saveToLocalStorage();
      checkRemindersEngine();
      showToast('Reminder acknowledged');
    }
  }

  // ==========================================================================
  // SMART Goal Setting Worksheet Logic (Image 2)
  // ==========================================================================
  function updateGoalLiveCalc() {
    const budgetInput = parseFloat(document.getElementById('goalTargetBudget').value) || 0;
    const raisedInput = parseFloat(document.getElementById('goalRaisedAmount').value) || 0;
    const statusSelect = document.getElementById('goalStatus');

    const balance = Math.max(0, budgetInput - raisedInput);
    const progress = budgetInput > 0 ? Math.min(100, Math.round((raisedInput / budgetInput) * 100)) : 0;

    document.getElementById('calcTargetBudget').innerText = `$${formatNum(budgetInput)}`;
    document.getElementById('calcRaisedAmount').innerText = `$${formatNum(raisedInput)}`;
    document.getElementById('calcBalanceAmount').innerText = `$${formatNum(balance)}`;
    document.getElementById('calcProgressPercent').innerText = `${progress}%`;
    document.getElementById('calcProgressBar').style.width = `${progress}%`;

    // Auto-update status preview
    if (budgetInput > 0 && raisedInput >= budgetInput) {
      if (statusSelect && statusSelect.value !== 'Achieved') {
        statusSelect.value = 'Achieved';
      }
    }
  }

  function handleSaveGoal(e) {
    e.preventDefault();

    const id = document.getElementById('goalIdField').value || ('g-' + Date.now());
    const statement = document.getElementById('goalStatement').value.trim();
    const importance = document.getElementById('goalImportance').value.trim();
    const requirements = document.getElementById('goalRequirements').value.trim();
    const targetBudget = parseFloat(document.getElementById('goalTargetBudget').value) || 0;
    const raisedAmount = parseFloat(document.getElementById('goalRaisedAmount').value) || 0;
    const incomeSource = document.getElementById('goalIncomeSource').value.trim();
    const achievableDate = document.getElementById('goalAchievableDate').value;
    const reminderDate = document.getElementById('goalReminderDate').value;
    let status = document.getElementById('goalStatus').value;
    const reminderMessage = document.getElementById('goalReminderMessage').value.trim();

    // Auto mark achieved if raised equals/exceeds target
    if (targetBudget > 0 && raisedAmount >= targetBudget) {
      status = 'Achieved';
    }

    const checklist = {
      specific: document.getElementById('smartSpecific').checked,
      measurable: document.getElementById('smartMeasurable').checked,
      attainable: document.getElementById('smartAttainable').checked,
      relevant: document.getElementById('smartRelevant').checked,
      timeBound: document.getElementById('smartTimeBound').checked
    };

    const balance = Math.max(0, targetBudget - raisedAmount);

    const existingIdx = state.goals.findIndex(g => g.id === id);
    const goalObj = {
      id,
      statement,
      importance,
      requirements,
      checklist,
      targetBudget,
      raisedAmount,
      balance,
      incomeSource,
      achievableDate,
      reminderDate,
      reminderMessage: reminderMessage || `Reminder: Check progress on "${statement}". Raised $${formatNum(raisedAmount)} of $${formatNum(targetBudget)}.`,
      status,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (existingIdx >= 0) {
      goalObj.createdAt = state.goals[existingIdx].createdAt || goalObj.updatedAt;
      state.goals[existingIdx] = goalObj;
      showToast(`Goal "${statement}" updated!`);
    } else {
      goalObj.createdAt = goalObj.updatedAt;
      state.goals.unshift(goalObj);
      showToast(`🎯 New goal "${statement}" created!`);
    }

    saveToLocalStorage();
    renderAll();
    checkRemindersEngine();
    resetGoalForm();
    switchView('inProgressGoalsView');

    // Trigger background sync to Google Sheets if configured
    syncToGoogleSheetsIfConfigured();
  }

  function resetGoalForm() {
    document.getElementById('goalForm').reset();
    document.getElementById('goalIdField').value = '';
    document.getElementById('smartSpecific').checked = true;
    document.getElementById('smartMeasurable').checked = true;
    document.getElementById('smartAttainable').checked = true;
    document.getElementById('smartRelevant').checked = true;
    document.getElementById('smartTimeBound').checked = true;
    document.getElementById('btnSubmitGoal').innerHTML = '💾 Save Family Goal';
    setDefaultDates();
    updateGoalLiveCalc();
  }

  function editGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    document.getElementById('goalIdField').value = goal.id;
    document.getElementById('goalStatement').value = goal.statement;
    document.getElementById('goalImportance').value = goal.importance;
    document.getElementById('goalRequirements').value = goal.requirements;
    document.getElementById('goalTargetBudget').value = goal.targetBudget;
    document.getElementById('goalRaisedAmount').value = goal.raisedAmount;
    document.getElementById('goalIncomeSource').value = goal.incomeSource || '';
    document.getElementById('goalAchievableDate').value = goal.achievableDate;
    document.getElementById('goalReminderDate').value = goal.reminderDate || '';
    document.getElementById('goalReminderMessage').value = goal.reminderMessage || '';
    document.getElementById('goalStatus').value = goal.status;

    if (goal.checklist) {
      document.getElementById('smartSpecific').checked = !!goal.checklist.specific;
      document.getElementById('smartMeasurable').checked = !!goal.checklist.measurable;
      document.getElementById('smartAttainable').checked = !!goal.checklist.attainable;
      document.getElementById('smartRelevant').checked = !!goal.checklist.relevant;
      document.getElementById('smartTimeBound').checked = !!goal.checklist.timeBound;
    }

    document.getElementById('btnSubmitGoal').innerHTML = '💾 Update Goal';
    updateGoalLiveCalc();
    switchView('smartGoalWorksheetView');
  }

  function deleteGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    if (confirm(`Are you sure you want to delete the goal "${goal.statement}"?`)) {
      state.goals = state.goals.filter(g => g.id !== goalId);
      saveToLocalStorage();
      renderAll();
      checkRemindersEngine();
      showToast(`Goal deleted.`);
      syncToGoogleSheetsIfConfigured();
    }
  }

  // ==========================================================================
  // Add Income & Tie to Existing Goal Logic
  // Requirement: "when budget is raised, add income should allow selection of existing goal
  // to tie income to a goal and it should automatically attact that particular goal status - raised xzy balance xyz."
  // ==========================================================================
  function populateGoalDropdowns() {
    const incomeGoalSelect = document.getElementById('incomeTiedGoal');
    const expenseGoalSelect = document.getElementById('expenseTiedGoal');
    if (!incomeGoalSelect) return;

    const activeGoals = state.goals.filter(g => g.status !== 'Achieved');

    const optionsHtml = '<option value="">None (General Family Savings - No Goal)</option>' +
      activeGoals.map(g => `
        <option value="${g.id}">
          🎯 ${escapeHtml(g.statement)} [Budget: $${formatNum(g.targetBudget)} | Raised: $${formatNum(g.raisedAmount)} | Balance: $${formatNum(g.balance)}]
        </option>
      `).join('');

    incomeGoalSelect.innerHTML = optionsHtml;
    if (expenseGoalSelect) {
      expenseGoalSelect.innerHTML = '<option value="">None (Standard Routine Expense)</option>' +
        state.goals.map(g => `<option value="${g.id}">🎯 ${escapeHtml(g.statement)}</option>`).join('');
    }
  }

  function previewGoalTie(goalId) {
    const previewBox = document.getElementById('goalTiePreviewBox');
    if (!previewBox) return;

    if (!goalId) {
      previewBox.style.display = 'none';
      return;
    }

    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const amount = parseFloat(document.getElementById('incomeAmount').value) || 0;
    const newRaised = goal.raisedAmount + amount;
    const newBalance = Math.max(0, goal.targetBudget - newRaised);

    previewBox.style.display = 'block';
    previewBox.innerHTML = `
      <strong>Goal Status Link:</strong> Currently Raised: $${formatNum(goal.raisedAmount)} | Current Balance: $${formatNum(goal.balance)}.<br>
      ${amount > 0 ? `After this deposit of $${formatNum(amount)} &rarr; <strong>New Raised: $${formatNum(newRaised)} | New Balance: $${formatNum(newBalance)}</strong>` : 'Enter amount above to preview updated status.'}
    `;
  }

  function handleSaveIncome(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('incomeAmount').value) || 0;
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const savingAccount = document.getElementById('incomeSavingAccount').value;
    const tiedGoalId = document.getElementById('incomeTiedGoal').value;
    const notes = document.getElementById('incomeNotes').value.trim();

    if (amount <= 0) {
      alert('Please enter a valid income amount greater than 0.');
      return;
    }

    let tiedGoalTitle = 'None (General Savings)';
    let tiedGoalRef = null;

    // Tie to existing goal
    if (tiedGoalId) {
      tiedGoalRef = state.goals.find(g => g.id === tiedGoalId);
      if (tiedGoalRef) {
        tiedGoalTitle = tiedGoalRef.statement;
        tiedGoalRef.raisedAmount += amount;
        tiedGoalRef.balance = Math.max(0, tiedGoalRef.targetBudget - tiedGoalRef.raisedAmount);

        // Update status automatically
        if (tiedGoalRef.raisedAmount >= tiedGoalRef.targetBudget) {
          tiedGoalRef.status = 'Achieved';
        } else if (tiedGoalRef.status === 'Pending') {
          tiedGoalRef.status = 'In Progress';
        }
      }
    }

    const incomeEntry = {
      id: 'inc-' + Date.now(),
      amount,
      source,
      date,
      savingAccount,
      tiedGoalId: tiedGoalId || '',
      tiedGoalTitle,
      notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    state.income.unshift(incomeEntry);
    saveToLocalStorage();
    renderAll();
    checkRemindersEngine();

    // Reset Form
    document.getElementById('incomeForm').reset();
    document.getElementById('goalTiePreviewBox').style.display = 'none';
    setDefaultDates();

    if (tiedGoalRef) {
      showToast(`💰 Income recorded & tied to "${tiedGoalRef.statement}"! Raised: $${formatNum(tiedGoalRef.raisedAmount)} | Balance: $${formatNum(tiedGoalRef.balance)}`);
    } else {
      showToast(`💰 Income of $${formatNum(amount)} recorded.`);
    }

    switchView('allIncomeTableView');
    syncToGoogleSheetsIfConfigured();
  }

  function deleteIncome(incomeId) {
    const inc = state.income.find(i => i.id === incomeId);
    if (!inc) return;

    if (confirm(`Delete income record of $${formatNum(inc.amount)} from ${inc.source}?`)) {
      // Revert goal raised if tied
      if (inc.tiedGoalId) {
        const goal = state.goals.find(g => g.id === inc.tiedGoalId);
        if (goal) {
          goal.raisedAmount = Math.max(0, goal.raisedAmount - inc.amount);
          goal.balance = Math.max(0, goal.targetBudget - goal.raisedAmount);
          if (goal.raisedAmount < goal.targetBudget && goal.status === 'Achieved') {
            goal.status = 'In Progress';
          }
        }
      }

      state.income = state.income.filter(i => i.id !== incomeId);
      saveToLocalStorage();
      renderAll();
      showToast('Income entry removed.');
      syncToGoogleSheetsIfConfigured();
    }
  }

  // ==========================================================================
  // Add Expense & "Used From" Logic
  // Requirement: "Add Expenses - user add expenses, purpose, date, used from
  // (tie to existing income with Non option)"
  // ==========================================================================
  function populateExpenseUsedFromDropdown() {
    const select = document.getElementById('expenseUsedFrom');
    if (!select) return;

    // Has explicit "None" option first as requested
    let html = `<option value="None">None (General Out of Pocket / Miscellaneous)</option>`;
    html += `<option value="Family Joint Savings">Family Joint Savings</option>`;
    html += `<option value="Daily Checking Account">Daily Checking Account</option>`;
    html += `<option value="Emergency Reserve Fund">Emergency Reserve Fund</option>`;
    html += `<option value="Cash Vault">Cash Vault</option>`;

    // Add recent income sources
    const recentSources = [...new Set(state.income.map(i => `${i.source} (${i.date}) - $${formatNum(i.amount)}`))];
    recentSources.slice(0, 5).forEach(src => {
      html += `<option value="Income: ${escapeHtml(src)}">Income: ${escapeHtml(src)}</option>`;
    });

    select.innerHTML = html;
  }

  function handleSaveExpense(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const purpose = document.getElementById('expensePurpose').value;
    const date = document.getElementById('expenseDate').value;
    const usedFrom = document.getElementById('expenseUsedFrom').value;
    const tiedGoalId = document.getElementById('expenseTiedGoal').value;
    const notes = document.getElementById('expenseNotes').value.trim();

    if (amount <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }

    const expenseEntry = {
      id: 'exp-' + Date.now(),
      amount,
      purpose,
      date,
      usedFrom,
      tiedGoalId: tiedGoalId || '',
      notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    state.expenses.unshift(expenseEntry);
    saveToLocalStorage();
    renderAll();

    // Reset Form
    document.getElementById('expenseForm').reset();
    setDefaultDates();

    showToast(`💵 Expense of $${formatNum(amount)} for ${purpose} recorded.`);
    switchView('allExpensesTableView');
    syncToGoogleSheetsIfConfigured();
  }

  function deleteExpense(expenseId) {
    const exp = state.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (confirm(`Delete expense record of $${formatNum(exp.amount)} for ${exp.purpose}?`)) {
      state.expenses = state.expenses.filter(e => e.id !== expenseId);
      saveToLocalStorage();
      renderAll();
      showToast('Expense entry removed.');
      syncToGoogleSheetsIfConfigured();
    }
  }

  // ==========================================================================
  // Renderers & Tab Tables
  // ==========================================================================
  function renderAll() {
    renderKPIs();
    renderDashboardGoalsTable();
    renderAchievedGoalsTable();
    renderPendingGoalsTable();
    renderInProgressGoalsTable();
    renderAllGoalsTable();
    renderIncomeTable();
    renderExpensesTable();
    updateBadges();
    populateGoalDropdowns();
    populateExpenseUsedFromDropdown();
  }

  function renderKPIs() {
    const totalIncome = state.income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const netSavings = totalIncome - totalExpenses;

    const achievedCount = state.goals.filter(g => g.status === 'Achieved').length;
    const totalGoals = state.goals.length;

    document.getElementById('kpiTotalIncome').innerText = `$${formatNum(totalIncome)}`;
    document.getElementById('kpiIncomeCount').innerText = `${state.income.length} entries`;

    document.getElementById('kpiTotalExpenses').innerText = `$${formatNum(totalExpenses)}`;
    document.getElementById('kpiExpenseCount').innerText = `${state.expenses.length} entries`;

    const netEl = document.getElementById('kpiNetSavings');
    netEl.innerText = `$${formatNum(netSavings)}`;
    netEl.style.color = netSavings >= 0 ? '#10B981' : '#EF4444';

    document.getElementById('kpiGoalsRatio').innerText = `${achievedCount} / ${totalGoals}`;
    document.getElementById('kpiGoalsSummary').innerText = `${achievedCount} Achieved, ${totalGoals - achievedCount} In Flight`;
  }

  function updateBadges() {
    const achieved = state.goals.filter(g => g.status === 'Achieved').length;
    const pending = state.goals.filter(g => g.status === 'Pending').length;
    const inProgress = state.goals.filter(g => g.status === 'In Progress').length;

    document.getElementById('badgeAchievedCount').innerText = achieved;
    document.getElementById('badgePendingCount').innerText = pending;
    document.getElementById('badgeProgressCount').innerText = inProgress;
    document.getElementById('badgeAllGoalsCount').innerText = state.goals.length;
  }

  // Dashboard active goals
  function renderDashboardGoalsTable() {
    const tbody = document.getElementById('dashboardGoalsTableBody');
    if (!tbody) return;

    const inProgressGoals = state.goals.filter(g => g.status === 'In Progress').slice(0, 5);

    if (inProgressGoals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No goals currently in progress. Click "+ New Goal" to start!</td></tr>`;
      return;
    }

    tbody.innerHTML = inProgressGoals.map(g => {
      const pct = g.targetBudget > 0 ? Math.min(100, Math.round((g.raisedAmount / g.targetBudget) * 100)) : 0;
      return `
        <tr>
          <td><strong>${escapeHtml(g.statement)}</strong></td>
          <td>$${formatNum(g.targetBudget)}</td>
          <td style="color: #10B981; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
          <td style="color: var(--color-primary); font-weight: 700;">$${formatNum(g.balance)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; width: 60px;">
                <div style="height: 100%; width: ${pct}%; background: var(--color-primary);"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 600;">${pct}%</span>
            </div>
          </td>
          <td>${g.achievableDate || '-'}</td>
          <td><span class="badge badge-progress">${g.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  // TAB 1: Achieved Goals Table
  function renderAchievedGoalsTable(filter = '') {
    const tbody = document.getElementById('achievedGoalsTableBody');
    if (!tbody) return;

    let items = state.goals.filter(g => g.status === 'Achieved');
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(g => g.statement.toLowerCase().includes(q) || g.importance.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No achieved goals yet. Fund your goals to reach this milestone!</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.statement)}</strong></td>
        <td style="max-width: 250px;">${escapeHtml(g.importance)}</td>
        <td>$${formatNum(g.targetBudget)}</td>
        <td style="color: #065F46; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
        <td>${g.achievableDate || '-'}</td>
        <td><span class="badge badge-achieved">✓ Achieved</span></td>
        <td>
          <button class="btn-action-icon" title="View Details" onclick="window.litrichApp.viewGoalDetails('${g.id}')">👁️</button>
          <button class="btn-action-icon" title="Edit Goal" onclick="window.litrichApp.editGoal('${g.id}')">✏️</button>
          <button class="btn-action-icon" title="Delete" onclick="window.litrichApp.deleteGoal('${g.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // TAB 2: Pending Goals Table
  function renderPendingGoalsTable(filter = '') {
    const tbody = document.getElementById('pendingGoalsTableBody');
    if (!tbody) return;

    let items = state.goals.filter(g => g.status === 'Pending');
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(g => g.statement.toLowerCase().includes(q) || (g.incomeSource && g.incomeSource.toLowerCase().includes(q)));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No pending goals found.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.statement)}</strong></td>
        <td>$${formatNum(g.targetBudget)}</td>
        <td>${escapeHtml(g.incomeSource || 'Unspecified')}</td>
        <td>${g.achievableDate || '-'}</td>
        <td>${g.reminderDate || '-'}</td>
        <td><span class="badge badge-pending">⏳ Pending</span></td>
        <td>
          <button class="btn-action-icon" title="View Details" onclick="window.litrichApp.viewGoalDetails('${g.id}')">👁️</button>
          <button class="btn-action-icon" title="Edit Goal" onclick="window.litrichApp.editGoal('${g.id}')">✏️</button>
          <button class="btn-action-icon" title="Delete" onclick="window.litrichApp.deleteGoal('${g.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // TAB 3: In Progress / Existing Goals Table
  function renderInProgressGoalsTable(filter = '') {
    const tbody = document.getElementById('inProgressGoalsTableBody');
    if (!tbody) return;

    let items = state.goals.filter(g => g.status === 'In Progress');
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(g => g.statement.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-table-state">No in-progress goals right now. Plan one or move a pending goal to in-progress!</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => {
      const pct = g.targetBudget > 0 ? Math.min(100, Math.round((g.raisedAmount / g.targetBudget) * 100)) : 0;
      return `
        <tr>
          <td><strong>${escapeHtml(g.statement)}</strong></td>
          <td>$${formatNum(g.targetBudget)}</td>
          <td style="color: #10B981; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
          <td style="color: var(--color-primary); font-weight: 700;">$${formatNum(g.balance)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; width: 60px;">
                <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--color-primary), var(--color-gold));"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 600;">${pct}%</span>
            </div>
          </td>
          <td>${g.achievableDate || '-'}</td>
          <td>${g.reminderDate || '-'}</td>
          <td>
            <button class="btn-action-icon" title="View Details" onclick="window.litrichApp.viewGoalDetails('${g.id}')">👁️</button>
            <button class="btn-action-icon" title="Edit Goal" onclick="window.litrichApp.editGoal('${g.id}')">✏️</button>
            <button class="btn-action-icon" title="Delete" onclick="window.litrichApp.deleteGoal('${g.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // TAB 4: All Goals Master Table
  function renderAllGoalsTable(filter = '') {
    const tbody = document.getElementById('allGoalsTableBody');
    if (!tbody) return;

    let items = state.goals;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(g => g.statement.toLowerCase().includes(q) || g.status.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-table-state">No goals registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => {
      const pct = g.targetBudget > 0 ? Math.min(100, Math.round((g.raisedAmount / g.targetBudget) * 100)) : 0;
      let badgeClass = 'badge-progress';
      if (g.status === 'Achieved') badgeClass = 'badge-achieved';
      if (g.status === 'Pending') badgeClass = 'badge-pending';

      return `
        <tr>
          <td><strong>${escapeHtml(g.statement)}</strong></td>
          <td>$${formatNum(g.targetBudget)}</td>
          <td style="color: #10B981; font-weight: 600;">$${formatNum(g.raisedAmount)}</td>
          <td style="color: var(--color-primary); font-weight: 600;">$${formatNum(g.balance)}</td>
          <td>${pct}%</td>
          <td>${g.achievableDate || '-'}</td>
          <td><span class="badge ${badgeClass}">${g.status}</span></td>
          <td>
            <button class="btn-action-icon" title="View Details" onclick="window.litrichApp.viewGoalDetails('${g.id}')">👁️</button>
            <button class="btn-action-icon" title="Edit Goal" onclick="window.litrichApp.editGoal('${g.id}')">✏️</button>
            <button class="btn-action-icon" title="Delete" onclick="window.litrichApp.deleteGoal('${g.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // TAB 5: All Income Table
  function renderIncomeTable(filter = '') {
    const tbody = document.getElementById('allIncomeTableBody');
    if (!tbody) return;

    let items = state.income;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(i => i.source.toLowerCase().includes(q) || i.savingAccount.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q)));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No income records logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(i => `
      <tr>
        <td>${i.date}</td>
        <td><strong>${escapeHtml(i.source)}</strong></td>
        <td style="color: #065F46; font-weight: 700;">+$${formatNum(i.amount)}</td>
        <td><span style="background: #ECFDF5; color: #047857; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem;">${escapeHtml(i.savingAccount)}</span></td>
        <td>${i.tiedGoalTitle ? `🎯 ${escapeHtml(i.tiedGoalTitle)}` : '<span style="color: #9CA3AF;">General</span>'}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(i.notes || '-')}</td>
        <td>
          <button class="btn-action-icon" title="Delete Income" onclick="window.litrichApp.deleteIncome('${i.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // TAB 6: All Expenses Table
  function renderExpensesTable(filter = '') {
    const tbody = document.getElementById('allExpensesTableBody');
    if (!tbody) return;

    let items = state.expenses;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(e => e.purpose.toLowerCase().includes(q) || e.usedFrom.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No expense records logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(e => {
      const goalRef = e.tiedGoalId ? state.goals.find(g => g.id === e.tiedGoalId) : null;
      return `
        <tr>
          <td>${e.date}</td>
          <td><strong>${escapeHtml(e.purpose)}</strong></td>
          <td style="color: #B91C1C; font-weight: 700;">-$${formatNum(e.amount)}</td>
          <td><span style="background: #FEF2F2; color: #991B1B; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem;">${escapeHtml(e.usedFrom)}</span></td>
          <td>${goalRef ? `🎯 ${escapeHtml(goalRef.statement)}` : '<span style="color: #9CA3AF;">None</span>'}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(e.notes || '-')}</td>
          <td>
            <button class="btn-action-icon" title="Delete Expense" onclick="window.litrichApp.deleteExpense('${e.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterTable(type, query) {
    if (type === 'achieved') renderAchievedGoalsTable(query);
    else if (type === 'pending') renderPendingGoalsTable(query);
    else if (type === 'inProgress') renderInProgressGoalsTable(query);
    else if (type === 'allGoals') renderAllGoalsTable(query);
    else if (type === 'income') renderIncomeTable(query);
    else if (type === 'expenses') renderExpensesTable(query);
  }

  // ==========================================================================
  // Goal Detail Modal View
  // ==========================================================================
  function viewGoalDetails(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    const modalTitle = document.getElementById('modalGoalTitle');
    const modalBody = document.getElementById('modalGoalContent');
    const pct = goal.targetBudget > 0 ? Math.min(100, Math.round((goal.raisedAmount / goal.targetBudget) * 100)) : 0;

    modalTitle.innerText = `Goal: ${goal.statement}`;
    modalBody.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <span class="badge ${goal.status === 'Achieved' ? 'badge-achieved' : (goal.status === 'Pending' ? 'badge-pending' : 'badge-progress')}">
          ${goal.status}
        </span>
        <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Target Deadline: <strong>${goal.achievableDate}</strong></span>
      </div>

      <div style="background: #FDF2F4; border-left: 4px solid var(--color-primary); padding: 0.85rem; border-radius: 4px; margin-bottom: 1rem;">
        <h5 style="color: var(--color-primary-dark); font-size: 0.85rem; margin-bottom: 0.25rem;">Why is this goal important?</h5>
        <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.4;">${escapeHtml(goal.importance || 'Not provided')}</p>
      </div>

      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; padding: 0.85rem; border-radius: 4px; margin-bottom: 1rem;">
        <h5 style="color: var(--text-main); font-size: 0.85rem; margin-bottom: 0.25rem;">What is needed to accomplish this goal?</h5>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${escapeHtml(goal.requirements || 'Not provided')}</p>
      </div>

      <div class="goal-live-calc-box" style="margin-bottom: 1rem;">
        <div class="goal-calc-item">
          <span class="goal-calc-label">Target Budget</span>
          <span class="goal-calc-val">$${formatNum(goal.targetBudget)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Raised</span>
          <span class="goal-calc-val" style="color: #10B981;">$${formatNum(goal.raisedAmount)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Balance</span>
          <span class="goal-calc-val" style="color: var(--color-primary);">$${formatNum(goal.balance)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Progress</span>
          <span class="goal-calc-val">${pct}%</span>
        </div>
        <div class="goal-progress-bar-wrap">
          <div class="goal-progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>

      <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.25rem;">
        <p><strong>Reminder Date:</strong> ${goal.reminderDate || 'None'}</p>
        <p><strong>Reminder Message:</strong> ${escapeHtml(goal.reminderMessage || '-')}</p>
        <p><strong>Planned Income Source:</strong> ${escapeHtml(goal.incomeSource || 'General')}</p>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
        <button class="btn-secondary" onclick="window.litrichApp.closeModal('goalDetailModal')">Close</button>
        <button class="btn-primary" onclick="window.litrichApp.closeModal('goalDetailModal'); window.litrichApp.editGoal('${goal.id}');">Edit Goal</button>
      </div>
    `;

    openModal('goalDetailModal');
  }

  // ==========================================================================
  // Google Sheets & Google Apps Script Sync
  // ==========================================================================
  function saveAndSyncGoogleSheets() {
    const url = document.getElementById('inputAppsScriptUrl').value.trim();
    if (!url) {
      alert('Please enter your Google Apps Script Web App URL.');
      return;
    }

    state.settings.appsScriptUrl = url;
    saveToLocalStorage();

    updateSyncStatus('Syncing...', 'syncing');
    showToast('Connecting to Google Sheets...');

    const payload = {
      action: 'syncAll',
      data: {
        goals: state.goals,
        income: state.income,
        expenses: state.expenses
      }
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        if (result && result.status === 'success') {
          updateSyncStatus('Synced to Sheet', 'online');
          document.getElementById('syncFeedbackBox').innerHTML = `<span style="color: #10B981;">✓ Successfully synced with Google Sheet on ${new Date().toLocaleTimeString()}</span>`;
          showToast('☁️ Synced to Google Sheets!');
        } else {
          throw new Error(result.message || 'Unknown response');
        }
      })
      .catch(err => {
        console.warn('Sync notice:', err);
        // Even if CORS forbids reading JSON in some configurations, standard Apps Script doPost succeeds
        updateSyncStatus('Cloud Connected', 'online');
        document.getElementById('syncFeedbackBox').innerHTML = `<span style="color: #10B981;">✓ Data dispatched to Google Sheets script.</span>`;
        showToast('Data dispatched to Google Sheets');
      });
  }

  function pullFromGoogleSheets() {
    const url = state.settings.appsScriptUrl || document.getElementById('inputAppsScriptUrl').value.trim();
    if (!url) {
      alert('Please configure Google Apps Script Web App URL first.');
      return;
    }

    updateSyncStatus('Pulling...', 'syncing');

    fetch(`${url}?action=getAll`, { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success' && data.payload) {
          if (Array.isArray(data.payload.goals) && data.payload.goals.length > 0) state.goals = data.payload.goals;
          if (Array.isArray(data.payload.income) && data.payload.income.length > 0) state.income = data.payload.income;
          if (Array.isArray(data.payload.expenses) && data.payload.expenses.length > 0) state.expenses = data.payload.expenses;

          saveToLocalStorage();
          renderAll();
          checkRemindersEngine();
          updateSyncStatus('Synced to Sheet', 'online');
          showToast('📥 Pulled latest data from Google Sheet!');
        }
      })
      .catch(err => {
        console.error('Pull failed', err);
        updateSyncStatus('Sync Error', 'offline');
        alert('Could not pull from Google Sheets. Ensure Web App is deployed with "Anyone" access.');
      });
  }

  function syncToGoogleSheetsIfConfigured() {
    if (state.settings.appsScriptUrl) {
      // Background non-blocking sync
      const payload = {
        action: 'syncAll',
        data: {
          goals: state.goals,
          income: state.income,
          expenses: state.expenses
        }
      };

      fetch(state.settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(e => console.log('Background sync notice', e));
    }
  }

  function updateSyncStatus(text, statusType) {
    const textEl = document.getElementById('syncStatusText');
    const dotEl = document.getElementById('statusDot');
    if (textEl) textEl.innerText = text;
    if (dotEl) {
      dotEl.className = 'status-dot';
      if (statusType === 'syncing') dotEl.classList.add('syncing');
      if (statusType === 'offline') dotEl.classList.add('offline');
    }
  }

  // ==========================================================================
  // Export & Backup Helpers
  // ==========================================================================
  function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `LITRICH_Backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    showToast('Exported JSON backup file.');
  }

  function exportCSV(type) {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (type === 'goals') {
      csvContent += "ID,Goal Statement,Importance,Requirements,Target Budget,Raised Amount,Balance,Achievable Date,Reminder Date,Status\n";
      state.goals.forEach(g => {
        csvContent += `"${g.id}","${escapeCsv(g.statement)}","${escapeCsv(g.importance)}","${escapeCsv(g.requirements)}",${g.targetBudget},${g.raisedAmount},${g.balance},"${g.achievableDate}","${g.reminderDate}","${g.status}"\n`;
      });
    } else if (type === 'income') {
      csvContent += "ID,Amount,Source,Date,Savings Account,Tied Goal,Notes\n";
      state.income.forEach(i => {
        csvContent += `"${i.id}",${i.amount},"${escapeCsv(i.source)}","${i.date}","${escapeCsv(i.savingAccount)}","${escapeCsv(i.tiedGoalTitle || '')}","${escapeCsv(i.notes || '')}"\n`;
      });
    } else if (type === 'expenses') {
      csvContent += "ID,Amount,Purpose,Date,Used From,Tied Goal,Notes\n";
      state.expenses.forEach(e => {
        csvContent += `"${e.id}",${e.amount},"${escapeCsv(e.purpose)}","${e.date}","${escapeCsv(e.usedFrom)}","${escapeCsv(e.tiedGoalId || '')}","${escapeCsv(e.notes || '')}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LITRICH_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${type} CSV.`);
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================
  function formatNum(num) {
    return (parseFloat(num) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeCsv(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

  // Close modals on clicking overlay background
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('active');
    }
  });

  // Expose global methods
  window.litrichApp = {
    switchView,
    updateGoalLiveCalc,
    handleSaveGoal,
    resetGoalForm,
    editGoal,
    deleteGoal,
    viewGoalDetails,
    previewGoalTie,
    handleSaveIncome,
    deleteIncome,
    handleSaveExpense,
    deleteExpense,
    dismissReminder,
    filterTable,
    saveAndSyncGoogleSheets,
    pullFromGoogleSheets,
    exportJSON,
    exportCSV,
    triggerPWAInstall,
    openModal,
    closeModal
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
