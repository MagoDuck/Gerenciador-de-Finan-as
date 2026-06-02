const STORAGE_KEY = "meu-gerenciador-transacoes-v1";
const CATEGORIES_KEY = "meu-gerenciador-categorias-v1";

/** @type {{id:string, desc:string, amount:number, type:'in'|'out', categoryId:string, createdAt:number}[]} */
let transactions = [];

/** @type {{id:string, name:string, color:string, icon:string}[]} */
let categories = [];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const $ = (sel) => document.querySelector(sel);

const els = {
  totalIn: $("#totalIn"),
  totalOut: $("#totalOut"),
  balance: $("#balance"),
  txForm: $("#txForm"),
  desc: $("#desc"),
  amount: $("#amount"),
  category: $("#category"),
  formError: $("#formError"),
  txList: $("#txList"),
  emptyState: $("#emptyState"),
  clearBtn: $("#clearBtn"),
  installBtn: $("#installBtn"),
  addCategoryBtn: $("#addCategoryBtn"),
  categoriesContainer: $("#categoriesContainer"),
  filterCategory: $("#filterCategory"),
  categoryModal: $("#categoryModal"),
  modalTitle: $("#modalTitle"),
  categoryName: $("#categoryName"),
  categoryColor: $("#categoryColor"),
  categoryIcon: $("#categoryIcon"),
  saveCategoryBtn: $("#saveCategoryBtn"),
  cancelCategoryBtn: $("#cancelCategoryBtn"),
};

let editingCategoryId = null;
let currentConfirmCallback = null;
let currentPromptCallback = null;

// ========== NOVO SISTEMA DE NOTIFICAÇÕES ==========

function showNotification(message, type = 'info', duration = 3000) {
  // Remover notificação existente se houver
  const existingNotification = document.querySelector('.custom-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `custom-notification notification-${type}`;
  
  // Escolher ícone baseado no tipo
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';
  if (type === 'confirm') icon = '❓';
  
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <p>${message}</p>
    </div>
    <button class="notification-close">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  // Animação de entrada
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Fechar ao clicar no X
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto-fechar após duração (exceto para confirmações)
  if (type !== 'confirm') {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }
  
  return notification;
}

function showConfirm(message, onConfirm, onCancel = null) {
  // Remover qualquer confirm anterior
  const existingConfirm = document.querySelector('.custom-confirm');
  if (existingConfirm) {
    existingConfirm.remove();
  }
  
  const confirmBox = document.createElement('div');
  confirmBox.className = 'custom-confirm';
  confirmBox.innerHTML = `
    <div class="confirm-overlay"></div>
    <div class="confirm-box">
      <div class="confirm-icon">❓</div>
      <div class="confirm-message">${message}</div>
      <div class="confirm-buttons">
        <button class="confirm-btn confirm-cancel">Cancelar</button>
        <button class="confirm-btn confirm-ok">Confirmar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmBox);
  
  // Animação de entrada
  setTimeout(() => {
    confirmBox.classList.add('show');
  }, 10);
  
  const handleConfirm = () => {
    confirmBox.classList.remove('show');
    setTimeout(() => confirmBox.remove(), 300);
    if (onConfirm) onConfirm();
  };
  
  const handleCancel = () => {
    confirmBox.classList.remove('show');
    setTimeout(() => confirmBox.remove(), 300);
    if (onCancel) onCancel();
  };
  
  confirmBox.querySelector('.confirm-ok').addEventListener('click', handleConfirm);
  confirmBox.querySelector('.confirm-cancel').addEventListener('click', handleCancel);
  
  // Clicar no overlay também cancela
  confirmBox.querySelector('.confirm-overlay').addEventListener('click', handleCancel);
}

function showPrompt(message, onConfirm, onCancel = null, defaultValue = '') {
  // Remover qualquer prompt anterior
  const existingPrompt = document.querySelector('.custom-prompt');
  if (existingPrompt) {
    existingPrompt.remove();
  }
  
  const promptBox = document.createElement('div');
  promptBox.className = 'custom-prompt';
  promptBox.innerHTML = `
    <div class="prompt-overlay"></div>
    <div class="prompt-box">
      <div class="prompt-icon">✏️</div>
      <div class="prompt-message">${message}</div>
      <input type="text" class="prompt-input" value="${defaultValue}" placeholder="Digite aqui..." />
      <div class="prompt-buttons">
        <button class="prompt-btn prompt-cancel">Cancelar</button>
        <button class="prompt-btn prompt-ok">Confirmar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(promptBox);
  
  // Animação de entrada
  setTimeout(() => {
    promptBox.classList.add('show');
  }, 10);
  
  const input = promptBox.querySelector('.prompt-input');
  input.focus();
  input.select();
  
  const handleConfirm = () => {
    const value = input.value.trim();
    promptBox.classList.remove('show');
    setTimeout(() => promptBox.remove(), 300);
    if (onConfirm) onConfirm(value);
  };
  
  const handleCancel = () => {
    promptBox.classList.remove('show');
    setTimeout(() => promptBox.remove(), 300);
    if (onCancel) onCancel();
  };
  
  promptBox.querySelector('.prompt-ok').addEventListener('click', handleConfirm);
  promptBox.querySelector('.prompt-cancel').addEventListener('click', handleCancel);
  promptBox.querySelector('.prompt-overlay').addEventListener('click', handleCancel);
  
  // Permitir Enter no input
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  });
}

// ========== FUNÇÕES ORIGINAIS MODIFICADAS ==========

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(36).substring(2, 9);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(transactions)) transactions = [];
  } catch (e) {
    console.error("Erro ao carregar transações:", e);
    transactions = [];
  }
  
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    categories = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(categories)) categories = [];
  } catch (e) {
    console.error("Erro ao carregar categorias:", e);
    categories = [];
  }
  
  // Adicionar categoria padrão se não houver nenhuma
  if (categories.length === 0) {
    categories = [
      { id: uid(), name: "Alimentação", color: "#10b981", icon: "🍔" },
      { id: uid(), name: "Transporte", color: "#f59e0b", icon: "🚗" },
      { id: uid(), name: "Lazer", color: "#8b5cf6", icon: "🎮" },
      { id: uid(), name: "Moradia", color: "#ef4444", icon: "🏠" },
      { id: uid(), name: "Saúde", color: "#3b82f6", icon: "🏥" },
    ];
    saveCategories();
    showNotification("Categorias padrão adicionadas!", "success");
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function computeTotals(filterCategoryId = null) {
  let totalIn = 0;
  let totalOut = 0;

  for (const tx of transactions) {
    if (filterCategoryId && tx.categoryId !== filterCategoryId) continue;
    
    if (tx.type === "in") totalIn += tx.amount;
    else totalOut += tx.amount;
  }

  const balance = totalIn - totalOut;
  return { totalIn, totalOut, balance };
}

function setBalanceColor(value) {
  els.balance.classList.remove("is-positive", "is-negative", "is-zero");
  if (value > 0) els.balance.classList.add("is-positive");
  else if (value < 0) els.balance.classList.add("is-negative");
  else els.balance.classList.add("is-zero");
}

function renderHeader() {
  const currentFilter = els.filterCategory.value;
  const filterCategoryId = currentFilter || null;
  const { totalIn, totalOut, balance } = computeTotals(filterCategoryId);
  els.totalIn.textContent = money.format(totalIn);
  els.totalOut.textContent = money.format(totalOut);
  els.balance.textContent = money.format(balance);
  setBalanceColor(balance);
}

function getCategoryById(id) {
  return categories.find(c => c.id === id);
}

function renderList() {
  const currentFilter = els.filterCategory.value;
  let filtered = [...transactions];
  
  if (currentFilter) {
    filtered = filtered.filter(tx => tx.categoryId === currentFilter);
  }
  
  const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

  els.txList.innerHTML = "";

  if (sorted.length === 0) {
    els.emptyState.hidden = false;
    els.clearBtn.hidden = true;
    return;
  }

  els.emptyState.hidden = true;
  els.clearBtn.hidden = false;

  for (const tx of sorted) {
    const li = document.createElement("li");
    li.className = "tx";
    li.dataset.id = tx.id;

    const main = document.createElement("div");
    main.className = "tx-main";

    const desc = document.createElement("div");
    desc.className = "tx-desc";
    desc.textContent = tx.desc;

    const meta = document.createElement("div");
    meta.className = "tx-meta";
    const when = new Date(tx.createdAt).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    meta.textContent = when + " • " + (tx.type === "in" ? "Entrada" : "Saída");
    
    // Adicionar categoria se existir
    if (tx.categoryId) {
      const category = getCategoryById(tx.categoryId);
      if (category) {
        const categorySpan = document.createElement("div");
        categorySpan.className = "tx-category";
        categorySpan.style.backgroundColor = category.color + "20";
        categorySpan.style.color = category.color;
        categorySpan.innerHTML = `${category.icon} ${category.name}`;
        main.appendChild(categorySpan);
      }
    }

    const amount = document.createElement("div");
    amount.className = "tx-amount " + tx.type;
    amount.textContent = (tx.type === "out" ? "− " : "+ ") + money.format(tx.amount);

    const actions = document.createElement("div");
    actions.className = "tx-actions";
    const del = document.createElement("button");
    del.className = "tx-del";
    del.type = "button";
    del.setAttribute("aria-label", `Excluir "${tx.desc}"`);
    del.textContent = "Excluir";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTransaction(tx.id);
    });
    actions.appendChild(del);

    main.append(desc, meta);
    li.append(main, amount, actions);
    els.txList.appendChild(li);
  }
}

function renderCategories() {
  // Atualizar select do formulário
  const categorySelect = els.category;
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Sem categoria</option>';
    
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = `${cat.icon} ${cat.name}`;
      categorySelect.appendChild(option);
    });
  }
  
  // Atualizar filtro
  const filterSelect = els.filterCategory;
  if (filterSelect) {
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todas categorias</option>';
    
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = `${cat.icon} ${cat.name}`;
      filterSelect.appendChild(option);
    });
    
    if (currentFilter && categories.some(c => c.id === currentFilter)) {
      filterSelect.value = currentFilter;
    }
  }
  
  // Renderizar chips de categorias
  const container = els.categoriesContainer;
  if (container) {
    container.innerHTML = "";
    
    categories.forEach(cat => {
      const chip = document.createElement("div");
      chip.className = "category-chip";
      chip.style.backgroundColor = cat.color + "20";
      chip.style.borderColor = cat.color;
      chip.style.color = cat.color;
      chip.innerHTML = `
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
        <button class="category-chip-edit" data-id="${cat.id}" title="Editar">✏️</button>
        <button class="category-chip-delete" data-id="${cat.id}" title="Excluir">🗑️</button>
      `;
      container.appendChild(chip);
    });
    
    // Adicionar event listeners para editar/excluir categorias
    document.querySelectorAll(".category-chip-edit").forEach(btn => {
      btn.removeEventListener("click", handleEditCategory);
      btn.addEventListener("click", handleEditCategory);
    });
    
    document.querySelectorAll(".category-chip-delete").forEach(btn => {
      btn.removeEventListener("click", handleDeleteCategory);
      btn.addEventListener("click", handleDeleteCategory);
    });
  }
}

function handleEditCategory(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  openCategoryModal(id);
}

function handleDeleteCategory(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  deleteCategory(id);
}

function renderAll() {
  renderCategories();
  renderHeader();
  renderList();
}

function showFormError(msg) {
  if (els.formError) {
    els.formError.textContent = msg || "";
    if (msg) {
      showNotification(msg, "error", 3000);
    }
  }
}

function addTransaction({ desc, amount, type, categoryId }) {
  const newTransaction = {
    id: uid(),
    desc: desc,
    amount: amount,
    type: type,
    categoryId: categoryId || null,
    createdAt: Date.now(),
  };
  transactions.push(newTransaction);
  saveTransactions();
  renderAll();
  showNotification(`Transação adicionada: ${desc} - ${money.format(amount)}`, "success");
}

function removeTransaction(id) {
  const transaction = transactions.find(t => t.id === id);
  const before = transactions.length;
  transactions = transactions.filter((t) => t.id !== id);
  if (transactions.length === before) return;
  saveTransactions();
  renderAll();
  if (transaction) {
    showNotification(`Transação removida: ${transaction.desc}`, "warning", 2000);
  }
}

function clearAll() {
  showConfirm("Tem certeza que deseja apagar todo o histórico?", () => {
    transactions = [];
    saveTransactions();
    renderAll();
    showNotification("Todo o histórico foi apagado!", "warning", 3000);
  });
}

function parseAmount(value) {
  const normalized = String(value).replace(",", ".").trim();
  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

function addCategory(name, color, icon) {
  const newCategory = {
    id: uid(),
    name: name.trim(),
    color: color,
    icon: icon || "📌"
  };
  categories.push(newCategory);
  saveCategories();
  renderAll();
  showNotification(`Categoria "${name}" adicionada!`, "success");
}

function updateCategory(id, name, color, icon) {
  const index = categories.findIndex(c => c.id === id);
  if (index !== -1) {
    const oldName = categories[index].name;
    categories[index] = {
      ...categories[index],
      name: name.trim(),
      color: color,
      icon: icon || "📌"
    };
    saveCategories();
    renderAll();
    showNotification(`Categoria "${oldName}" alterada para "${name}"`, "success");
  }
}

function deleteCategory(id) {
  const category = categories.find(c => c.id === id);
  if (!category) return;
  
  // Verificar se existem transações com esta categoria
  const hasTransactions = transactions.some(tx => tx.categoryId === id);
  
  let message = `Deseja excluir a categoria "${category.name}"?`;
  if (hasTransactions) {
    message = `Existem transações usando a categoria "${category.name}". Deseja excluir a categoria e remover a categoria das transações?`;
  }
  
  showConfirm(message, () => {
    // Remover a categoria das transações
    transactions = transactions.map(tx => {
      if (tx.categoryId === id) {
        return { ...tx, categoryId: null };
      }
      return tx;
    });
    saveTransactions();
    
    categories = categories.filter(c => c.id !== id);
    saveCategories();
    
    // Se o filtro atual era esta categoria, resetar filtro
    if (els.filterCategory && els.filterCategory.value === id) {
      els.filterCategory.value = "";
    }
    
    renderAll();
    showNotification(`Categoria "${category.name}" excluída!`, "warning", 3000);
  });
}

function openCategoryModal(id = null) {
  editingCategoryId = id;
  const modal = els.categoryModal;
  const title = els.modalTitle;
  
  if (id) {
    const category = categories.find(c => c.id === id);
    if (category) {
      if (title) title.textContent = "Editar Categoria";
      if (els.categoryName) els.categoryName.value = category.name;
      if (els.categoryColor) els.categoryColor.value = category.color;
      if (els.categoryIcon) els.categoryIcon.value = category.icon;
    }
  } else {
    if (title) title.textContent = "Nova Categoria";
    if (els.categoryName) els.categoryName.value = "";
    if (els.categoryColor) els.categoryColor.value = "#6366f1";
    if (els.categoryIcon) els.categoryIcon.value = "📌";
  }
  
  if (modal) modal.style.display = "flex";
}

function closeCategoryModal() {
  if (els.categoryModal) els.categoryModal.style.display = "none";
  editingCategoryId = null;
  if (els.categoryName) els.categoryName.value = "";
}

function saveCategoryModal() {
  const name = els.categoryName ? els.categoryName.value.trim() : "";
  const color = els.categoryColor ? els.categoryColor.value : "#6366f1";
  const icon = (els.categoryIcon ? els.categoryIcon.value.trim() : "📌") || "📌";
  
  if (!name) {
    showNotification("Por favor, informe o nome da categoria.", "error");
    return;
  }
  
  if (editingCategoryId) {
    updateCategory(editingCategoryId, name, color, icon);
  } else {
    addCategory(name, color, icon);
  }
  
  closeCategoryModal();
}

function initForm() {
  if (els.txForm) {
    els.txForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showFormError("");

      const desc = els.desc ? els.desc.value.trim() : "";
      const amount = parseAmount(els.amount ? els.amount.value : "");
      const type = document.querySelector('input[name="type"]:checked')?.value;
      const categoryId = els.category ? els.category.value : null;

      if (!desc) return showFormError("Informe uma descrição.");
      if (desc.length > 60) return showFormError("Descrição muito longa.");
      if (amount === null || amount <= 0) return showFormError("Informe um valor válido.");
      if (type !== "in" && type !== "out") return showFormError("Selecione o tipo.");

      addTransaction({ desc, amount, type, categoryId });

      if (els.txForm) els.txForm.reset();
      const inRadio = document.querySelector('input[name="type"][value="in"]');
      if (inRadio) inRadio.checked = true;
      if (els.category) els.category.value = "";
      if (els.desc) els.desc.focus();
    });
  }

  if (els.clearBtn) {
    els.clearBtn.addEventListener("click", clearAll);
  }
  
  if (els.addCategoryBtn) {
    els.addCategoryBtn.addEventListener("click", () => openCategoryModal());
  }
  
  if (els.saveCategoryBtn) {
    els.saveCategoryBtn.addEventListener("click", saveCategoryModal);
  }
  
  if (els.cancelCategoryBtn) {
    els.cancelCategoryBtn.addEventListener("click", closeCategoryModal);
  }
  
  // Fechar modal ao clicar no X
  const modalClose = document.querySelector(".modal-close");
  if (modalClose) {
    modalClose.addEventListener("click", closeCategoryModal);
  }
  
  // Fechar modal ao clicar fora
  if (els.categoryModal) {
    els.categoryModal.addEventListener("click", (e) => {
      if (e.target === els.categoryModal) {
        closeCategoryModal();
      }
    });
  }
  
  // Filtrar ao mudar o select
  if (els.filterCategory) {
    els.filterCategory.addEventListener("change", () => {
      renderHeader();
      renderList();
    });
  }
}

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // silencioso
    });
  });
}

function initInstallPrompt() {
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (els.installBtn) els.installBtn.hidden = false;
  });

  if (els.installBtn) {
    els.installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
        if (els.installBtn) els.installBtn.hidden = true;
      }
    });
  }

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (els.installBtn) els.installBtn.hidden = true;
  });
}

function init() {
  loadData();
  renderAll();
  initForm();
  initServiceWorker();
  initInstallPrompt();
  if (els.desc) els.desc.focus();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}