/**
 * LITRICH Family Management System - Client Application
 * Mode: Direct Database Architecture (Google Sheets via Apps Script)
 * Zero LocalStorage Dependency - Google Sheets is the Single Source of Truth
 * Interface: Firestone Systems Layout, Clean White System, Zero Icons/Emojis
 */

(function () {
  'use strict';

  // State is held strictly in-memory during session and directly synchronized with the database
  let state = {
    goals: [],
    income: [],
    expenses: [],
    dismissedReminders: []
  };

  // PWA Deferred Install Prompt
  let deferredInstallPrompt = null;

  // Clear any legacy local storage data on startup
  try {
    localStorage.clear();
  } catch (e) {}

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    setupEventListeners();
    setupPWA();
    setDefaultDates();
    renderAll();

    // Immediately fetch real data from database
    fetchDatabase();

    // Check reminders periodically
    setInterval(checkRemindersEngine, 60 * 60 * 1000);
  }

  function getBackendUrl() {
    if (window.BACKEND_CONFIG && window.BACKEND_CONFIG.APPS_SCRIPT_URL) {
      return window.BACKEND_CONFIG.APPS_SCRIPT_URL.trim();
    }
    return '';
  }

  function isNativeGoogleAppsScript() {
    return typeof google !== 'undefined' && google.script && typeof google.script.run !== 'undefined';
  }

  // ==========================================================================
  // Direct Database Communication (Fetch & Dispatch Actions)
  // ==========================================================================
  function fetchDatabase() {
    updateSyncStatus('CONNECTING...', 'syncing');
    setLoadingState(true);

    // Native Google Apps Script execution
    if (isNativeGoogleAppsScript()) {
      google.script.run
        .withSuccessHandler(onDatabaseSuccess)
        .withFailureHandler(onDatabaseError)
        .apiGetAll();
      return;
    }

    // External HTTP Web App execution
    const url = getBackendUrl();
    if (!url) {
      updateSyncStatus('DATABASE NOT CONNECTED', 'offline');
      setLoadingState(false);
      updateFeedbackText('Backend endpoint not configured in config.js');
      return;
    }

    fetch(`${url}?action=getAll`, { method: 'GET' })
      .then(res => res.json())
      .then(data => onDatabaseSuccess(data))
      .catch(err => onDatabaseError(err));
  }

  function dispatchDatabaseAction(actionName, dataPayload, itemId) {
    updateSyncStatus('SAVING TO DATABASE...', 'syncing');

    // Native Apps Script
    if (isNativeGoogleAppsScript()) {
      if (actionName === 'saveGoal') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiSaveGoal(dataPayload);
      } else if (actionName === 'deleteGoal') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiDeleteGoal(itemId);
      } else if (actionName === 'saveIncome') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiSaveIncome(dataPayload);
      } else if (actionName === 'deleteIncome') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiDeleteIncome(itemId);
      } else if (actionName === 'saveExpense') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiSaveExpense(dataPayload);
      } else if (actionName === 'deleteExpense') {
        google.script.run.withSuccessHandler(onDatabaseSuccess).withFailureHandler(onDatabaseError).apiDeleteExpense(itemId);
      }
      return;
    }

    // HTTP Endpoint
    const url = getBackendUrl();
    if (!url) {
      alert('Database backend endpoint is not configured in config.js.');
      updateSyncStatus('DATABASE NOT CONNECTED', 'offline');
      return;
    }

    const requestBody = {
      action: actionName,
      data: dataPayload || null,
      id: itemId || null
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(requestBody)
    })
      .then(res => res.json())
      .then(resData => onDatabaseSuccess(resData))
      .catch(err => onDatabaseError(err));
  }

  function onDatabaseSuccess(result) {
    setLoadingState(false);
    if (result && result.status === 'success' && result.payload) {
      state.goals = Array.isArray(result.payload.goals) ? result.payload.goals : [];
      state.income = Array.isArray(result.payload.income) ? result.payload.income : [];
      state.expenses = Array.isArray(result.payload.expenses) ? result.payload.expenses : [];

      updateSyncStatus('DATABASE CONNECTED', 'online');
      updateFeedbackText(`Connected to Google Sheets database. Last updated: ${new Date().toLocaleTimeString()}`);
      renderAll();
      checkRemindersEngine();
    } else {
      updateSyncStatus('DATABASE READY', 'online');
      updateFeedbackText('Database responded.');
      renderAll();
    }
  }

  function onDatabaseError(error) {
    setLoadingState(false);
    console.error('Database connection error:', error);
    updateSyncStatus('DATABASE ERROR', 'offline');
    updateFeedbackText(`Database connection failed: ${error.message || error}`);
    showToast('Database connection error.');
  }

  function setLoadingState(isLoading) {
    const feedbackBox = document.getElementById('syncFeedbackBox');
    if (isLoading && feedbackBox) {
      feedbackBox.innerText = 'Communicating with Google Sheets database...';
    }
  }

  function updateFeedbackText(msg) {
    const feedbackBox = document.getElementById('syncFeedbackBox');
    if (feedbackBox) feedbackBox.innerText = msg;
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

  function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const incomeDateEl = document.getElementById('incomeDate');
    const expenseDateEl = document.getElementById('expenseDate');
    if (incomeDateEl && !incomeDateEl.value) incomeDateEl.value = today;
    if (expenseDateEl && !expenseDateEl.value) expenseDateEl.value = today;

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
    const navButtons = document.querySelectorAll('.nav-item-btn[data-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        switchView(targetView);

        if (window.innerWidth <= 900) {
          document.getElementById('sidebarMenu').classList.remove('open');
        }
      });
    });

    const toggleBtn = document.getElementById('btnToggleSidebar');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('sidebarMenu').classList.toggle('open');
      });
    }

    const syncPill = document.getElementById('syncStatusPill');
    if (syncPill) {
      syncPill.addEventListener('click', () => switchView('settingsView'));
    }

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

    if (viewId === 'addIncomeView' || viewId === 'addExpenseView') {
      populateGoalDropdowns();
      populateExpenseUsedFromDropdown();
    }
  }

  // ==========================================================================
  // PWA (Progressive Web App) Setup
  // ==========================================================================
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('ServiceWorker registered:', reg.scope))
          .catch(err => console.warn('ServiceWorker registration error:', err));
      });
    }

    const btnInstall = document.getElementById('btnInstallPWA');
    const installBtnText = document.getElementById('installBtnText');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      if (btnInstall) {
        btnInstall.classList.add('installed');
        btnInstall.innerText = 'INSTALLED';
      }
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstall) {
        btnInstall.style.display = 'inline-flex';
        installBtnText.innerText = 'INSTALL APP';
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (btnInstall) {
        btnInstall.classList.add('installed');
        btnInstall.innerText = 'INSTALLED';
      }
      showToast('LITRICH Application installed successfully.');
    });
  }

  function triggerPWAInstall() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('Installing application...');
        }
        deferredInstallPrompt = null;
      });
    } else if (isIOS || !window.matchMedia('(display-mode: standalone)').matches) {
      openModal('iosInstallModal');
    } else {
      showToast('Application is already installed on this device.');
    }
  }

  // ==========================================================================
  // Reminder Noticeboard Engine
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

      const diffTime = today - remDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Active when reminder date reaches (diffDays >= 0) and remains for 7-14 days
      if (diffDays >= 0 && diffDays <= 14) {
        activeReminders.push({
          goalId: goal.id,
          goalStatement: goal.statement,
          reminderDate: goal.reminderDate,
          message: goal.reminderMessage || `Milestone reminder for goal "${goal.statement}". Target deadline: ${goal.achievableDate}.`,
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
        <div style="padding: 0.75rem 1rem; background: #F9FAFB; border: 1px solid var(--sys-border); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-muted);">
          No active reminder notices at this time. Scheduled reminders will automatically display here on their specified dates.
        </div>
      `;
      return;
    }

    container.innerHTML = activeReminders.map(rem => {
      const dayLabel = rem.diffDays === 0
        ? 'DUE TODAY'
        : `ACTIVE (${rem.diffDays} DAY${rem.diffDays > 1 ? 'S' : ''})`;

      return `
        <div class="reminder-banner">
          <div class="reminder-body">
            <h4>${escapeHtml(rem.goalStatement)}</h4>
            <p>${escapeHtml(rem.message)}</p>
            <div class="reminder-meta">
              <span class="reminder-badge">${dayLabel}</span>
              <span>Target Budget: <strong>$${formatNum(rem.targetBudget)}</strong></span>
              <span>Raised Amount: <strong>$${formatNum(rem.raisedAmount)}</strong></span>
              <span>Balance Due: <strong>$${formatNum(rem.balance)}</strong></span>
              <span>Status: <strong>${rem.status}</strong></span>
            </div>
          </div>
          <button class="btn-dismiss-reminder" onclick="window.litrichApp.dismissReminder('${rem.goalId}', '${rem.reminderDate}')">
            DISMISS
          </button>
        </div>
      `;
    }).join('');
  }

  function dismissReminder(goalId, reminderDate) {
    const key = `${goalId}-${reminderDate}`;
    if (!state.dismissedReminders.includes(key)) {
      state.dismissedReminders.push(key);
      checkRemindersEngine();
      showToast('Notice acknowledged and dismissed.');
    }
  }

  // ==========================================================================
  // SMART Goal Setting Worksheet
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

    if (targetBudget > 0 && raisedAmount >= targetBudget) {
      status = 'Achieved';
    }

    const goalObj = {
      id,
      statement,
      importance,
      requirements,
      targetBudget,
      raisedAmount,
      balance: Math.max(0, targetBudget - raisedAmount),
      incomeSource,
      achievableDate,
      reminderDate,
      reminderMessage: reminderMessage || `Milestone reminder: Progress check on "${statement}". Raised $${formatNum(raisedAmount)} of $${formatNum(targetBudget)}.`,
      status
    };

    // Save directly to database
    dispatchDatabaseAction('saveGoal', goalObj);
    showToast(`Saving goal "${statement}" to database...`);

    resetGoalForm();
    switchView('inProgressGoalsView');
  }

  function resetGoalForm() {
    document.getElementById('goalForm').reset();
    document.getElementById('goalIdField').value = '';
    document.getElementById('btnSubmitGoal').innerText = 'SAVE GOAL';
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

    document.getElementById('btnSubmitGoal').innerText = 'UPDATE GOAL';
    updateGoalLiveCalc();
    switchView('smartGoalWorksheetView');
  }

  function deleteGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    if (confirm(`Confirm deletion of goal "${goal.statement}" from database?`)) {
      dispatchDatabaseAction('deleteGoal', null, goalId);
      showToast('Deleting goal record from database...');
    }
  }

  // ==========================================================================
  // Income Management & Goal Tying
  // ==========================================================================
  function populateGoalDropdowns() {
    const incomeGoalSelect = document.getElementById('incomeTiedGoal');
    const expenseGoalSelect = document.getElementById('expenseTiedGoal');
    if (!incomeGoalSelect) return;

    const activeGoals = state.goals.filter(g => g.status !== 'Achieved');

    const optionsHtml = '<option value="">None (General Savings - No Goal)</option>' +
      activeGoals.map(g => `
        <option value="${g.id}">
          ${escapeHtml(g.statement)} [Budget: $${formatNum(g.targetBudget)} | Raised: $${formatNum(g.raisedAmount)} | Balance: $${formatNum(g.balance)}]
        </option>
      `).join('');

    incomeGoalSelect.innerHTML = optionsHtml;
    if (expenseGoalSelect) {
      expenseGoalSelect.innerHTML = '<option value="">None (Standard Routine Expense)</option>' +
        state.goals.map(g => `<option value="${g.id}">${escapeHtml(g.statement)}</option>`).join('');
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
      Current Status: Raised $${formatNum(goal.raisedAmount)} | Balance $${formatNum(goal.balance)}.<br>
      ${amount > 0 ? `After deposit of $${formatNum(amount)} -> Updated Raised: $${formatNum(newRaised)} | Updated Balance: $${formatNum(newBalance)}` : 'Enter amount above to preview updated status.'}
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
      alert('Please enter an amount greater than 0.');
      return;
    }

    const incomeEntry = {
      id: 'inc-' + Date.now(),
      amount,
      source,
      date,
      savingAccount,
      tiedGoalId: tiedGoalId || '',
      notes
    };

    dispatchDatabaseAction('saveIncome', incomeEntry);
    showToast(`Recording income of $${formatNum(amount)} to database...`);

    document.getElementById('incomeForm').reset();
    document.getElementById('goalTiePreviewBox').style.display = 'none';
    setDefaultDates();
    switchView('allIncomeTableView');
  }

  function deleteIncome(incomeId) {
    const inc = state.income.find(i => i.id === incomeId);
    if (!inc) return;

    if (confirm(`Delete income record of $${formatNum(inc.amount)} from ${inc.source}?`)) {
      dispatchDatabaseAction('deleteIncome', null, incomeId);
      showToast('Deleting income record from database...');
    }
  }

  // ==========================================================================
  // Expense Management
  // ==========================================================================
  function populateExpenseUsedFromDropdown() {
    const select = document.getElementById('expenseUsedFrom');
    if (!select) return;

    let html = `<option value="None">None (General Out of Pocket / Miscellaneous)</option>`;
    html += `<option value="Family Joint Savings">Family Joint Savings</option>`;
    html += `<option value="Daily Checking Account">Daily Checking Account</option>`;
    html += `<option value="Emergency Reserve Fund">Emergency Reserve Fund</option>`;
    html += `<option value="Cash Reserve">Cash Reserve</option>`;

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
      alert('Please enter an amount greater than 0.');
      return;
    }

    const expenseEntry = {
      id: 'exp-' + Date.now(),
      amount,
      purpose,
      date,
      usedFrom,
      tiedGoalId: tiedGoalId || '',
      notes
    };

    dispatchDatabaseAction('saveExpense', expenseEntry);
    showToast(`Recording expense of $${formatNum(amount)} to database...`);

    document.getElementById('expenseForm').reset();
    setDefaultDates();
    switchView('allExpensesTableView');
  }

  function deleteExpense(expenseId) {
    const exp = state.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (confirm(`Delete expense record of $${formatNum(exp.amount)} for ${exp.purpose}?`)) {
      dispatchDatabaseAction('deleteExpense', null, expenseId);
      showToast('Deleting expense record from database...');
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
    document.getElementById('kpiIncomeCount').innerText = `${state.income.length} database entries`;

    document.getElementById('kpiTotalExpenses').innerText = `$${formatNum(totalExpenses)}`;
    document.getElementById('kpiExpenseCount').innerText = `${state.expenses.length} database entries`;

    const netEl = document.getElementById('kpiNetSavings');
    netEl.innerText = `$${formatNum(netSavings)}`;
    netEl.style.color = netSavings >= 0 ? '#059669' : '#DC2626';

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

  function renderDashboardGoalsTable() {
    const tbody = document.getElementById('dashboardGoalsTableBody');
    if (!tbody) return;

    const inProgressGoals = state.goals.filter(g => g.status === 'In Progress').slice(0, 5);

    if (inProgressGoals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No goals currently in progress in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = inProgressGoals.map(g => {
      const pct = g.targetBudget > 0 ? Math.min(100, Math.round((g.raisedAmount / g.targetBudget) * 100)) : 0;
      return `
        <tr>
          <td><strong>${escapeHtml(g.statement)}</strong></td>
          <td>$${formatNum(g.targetBudget)}</td>
          <td style="color: #059669; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
          <td style="font-weight: 700;">$${formatNum(g.balance)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 6px; background: #E5E7EB; border-radius: 2px; overflow: hidden; width: 60px;">
                <div style="height: 100%; width: ${pct}%; background: #1F2937;"></div>
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
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No achieved goals recorded in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.statement)}</strong></td>
        <td style="max-width: 250px;">${escapeHtml(g.importance)}</td>
        <td>$${formatNum(g.targetBudget)}</td>
        <td style="color: #065F46; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
        <td>${g.achievableDate || '-'}</td>
        <td><span class="badge badge-achieved">Achieved</span></td>
        <td>
          <button class="btn-table-action" onclick="window.litrichApp.viewGoalDetails('${g.id}')">View</button>
          <button class="btn-table-action" onclick="window.litrichApp.editGoal('${g.id}')">Edit</button>
          <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteGoal('${g.id}')">Delete</button>
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
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No pending goals in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => `
      <tr>
        <td><strong>${escapeHtml(g.statement)}</strong></td>
        <td>$${formatNum(g.targetBudget)}</td>
        <td>${escapeHtml(g.incomeSource || 'Unspecified')}</td>
        <td>${g.achievableDate || '-'}</td>
        <td>${g.reminderDate || '-'}</td>
        <td><span class="badge badge-pending">Pending</span></td>
        <td>
          <button class="btn-table-action" onclick="window.litrichApp.viewGoalDetails('${g.id}')">View</button>
          <button class="btn-table-action" onclick="window.litrichApp.editGoal('${g.id}')">Edit</button>
          <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteGoal('${g.id}')">Delete</button>
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
      tbody.innerHTML = `<tr><td colspan="8" class="empty-table-state">No active in-progress goals in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(g => {
      const pct = g.targetBudget > 0 ? Math.min(100, Math.round((g.raisedAmount / g.targetBudget) * 100)) : 0;
      return `
        <tr>
          <td><strong>${escapeHtml(g.statement)}</strong></td>
          <td>$${formatNum(g.targetBudget)}</td>
          <td style="color: #059669; font-weight: 700;">$${formatNum(g.raisedAmount)}</td>
          <td style="font-weight: 700;">$${formatNum(g.balance)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 6px; background: #E5E7EB; border-radius: 2px; overflow: hidden; width: 60px;">
                <div style="height: 100%; width: ${pct}%; background: #1F2937;"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 600;">${pct}%</span>
            </div>
          </td>
          <td>${g.achievableDate || '-'}</td>
          <td>${g.reminderDate || '-'}</td>
          <td>
            <button class="btn-table-action" onclick="window.litrichApp.viewGoalDetails('${g.id}')">View</button>
            <button class="btn-table-action" onclick="window.litrichApp.editGoal('${g.id}')">Edit</button>
            <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteGoal('${g.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // TAB 4: All Goals Master Directory
  function renderAllGoalsTable(filter = '') {
    const tbody = document.getElementById('allGoalsTableBody');
    if (!tbody) return;

    let items = state.goals;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(g => g.statement.toLowerCase().includes(q) || g.status.toLowerCase().includes(q));
    }

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-table-state">No goal records found in database.</td></tr>`;
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
          <td style="color: #059669; font-weight: 600;">$${formatNum(g.raisedAmount)}</td>
          <td style="font-weight: 600;">$${formatNum(g.balance)}</td>
          <td>${pct}%</td>
          <td>${g.achievableDate || '-'}</td>
          <td><span class="badge ${badgeClass}">${g.status}</span></td>
          <td>
            <button class="btn-table-action" onclick="window.litrichApp.viewGoalDetails('${g.id}')">View</button>
            <button class="btn-table-action" onclick="window.litrichApp.editGoal('${g.id}')">Edit</button>
            <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteGoal('${g.id}')">Delete</button>
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
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No income records found in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(i => `
      <tr>
        <td>${i.date}</td>
        <td><strong>${escapeHtml(i.source)}</strong></td>
        <td style="color: #065F46; font-weight: 700;">+$${formatNum(i.amount)}</td>
        <td><span style="background: #F3F4F6; color: #374151; padding: 2px 6px; border-radius: 2px; font-size: 0.75rem;">${escapeHtml(i.savingAccount)}</span></td>
        <td>${i.tiedGoalTitle ? `${escapeHtml(i.tiedGoalTitle)}` : '<span style="color: #9CA3AF;">General</span>'}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(i.notes || '-')}</td>
        <td>
          <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteIncome('${i.id}')">Delete</button>
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
      tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No expense records found in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(e => {
      const goalRef = e.tiedGoalId ? state.goals.find(g => g.id === e.tiedGoalId) : null;
      return `
        <tr>
          <td>${e.date}</td>
          <td><strong>${escapeHtml(e.purpose)}</strong></td>
          <td style="color: #DC2626; font-weight: 700;">-$${formatNum(e.amount)}</td>
          <td><span style="background: #F3F4F6; color: #374151; padding: 2px 6px; border-radius: 2px; font-size: 0.75rem;">${escapeHtml(e.usedFrom)}</span></td>
          <td>${goalRef ? `${escapeHtml(goalRef.statement)}` : '<span style="color: #9CA3AF;">None</span>'}</td>
          <td style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(e.notes || '-')}</td>
          <td>
            <button class="btn-table-action btn-table-action-danger" onclick="window.litrichApp.deleteExpense('${e.id}')">Delete</button>
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

      <div style="background: #F9FAFB; border-left: 3px solid #374151; padding: 0.75rem; border-radius: 2px; margin-bottom: 0.75rem;">
        <h5 style="color: #111827; font-size: 0.82rem; margin-bottom: 0.25rem; text-transform: uppercase;">Why is this goal important?</h5>
        <p style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">${escapeHtml(goal.importance || 'Not specified')}</p>
      </div>

      <div style="background: #F9FAFB; border: 1px solid var(--sys-border); padding: 0.75rem; border-radius: 2px; margin-bottom: 0.75rem;">
        <h5 style="color: #111827; font-size: 0.82rem; margin-bottom: 0.25rem; text-transform: uppercase;">What is needed to accomplish this goal?</h5>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${escapeHtml(goal.requirements || 'Not specified')}</p>
      </div>

      <div class="goal-live-calc-box" style="margin-bottom: 1rem;">
        <div class="goal-calc-item">
          <span class="goal-calc-label">Target Budget</span>
          <span class="goal-calc-val">$${formatNum(goal.targetBudget)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Raised</span>
          <span class="goal-calc-val" style="color: #059669;">$${formatNum(goal.raisedAmount)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Balance</span>
          <span class="goal-calc-val">$${formatNum(goal.balance)}</span>
        </div>
        <div class="goal-calc-item">
          <span class="goal-calc-label">Progress</span>
          <span class="goal-calc-val">${pct}%</span>
        </div>
        <div class="goal-progress-bar-wrap">
          <div class="goal-progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>

      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
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
  // Export & Utility Helpers
  // ==========================================================================
  function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `LITRICH_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    showToast('Exported database JSON.');
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
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }

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
    saveAndSyncGoogleSheets: fetchDatabase,
    pullFromGoogleSheets: fetchDatabase,
    exportJSON,
    exportCSV,
    triggerPWAInstall,
    openModal,
    closeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
