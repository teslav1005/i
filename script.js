// تم حذف أي استيراد لـ Firebase من هنا
// الاعتماد بالكامل على الباك اند في am-brown.vercel.app

let currentUser = { uid: "anonymous" }; // يمكن استبداله بنظام جلسات بسيط لاحقاً
let currentChatId = null;
let currentModel = "mistral";
let selectedModel = "mistral";
let pendingAttachment = null;
let allModels = [];
const BACKEND_URL = "https://am-brown.vercel.app"; 

const dom = {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatWindow: document.getElementById('chatWindow'),
    messageBox: document.getElementById('messageBox'),
    emptyView: document.getElementById('emptyView'),
    logoutConfirm: document.getElementById('logoutConfirm'),
    confirmYes: document.getElementById('confirmYes'),
    confirmNo: document.getElementById('confirmNo'),
    attachBtn: document.getElementById('attachBtn'),
    attachMenu: document.getElementById('attachMenu'),
    newChatBtn: document.getElementById('newChatBtn'),
    historyList: document.getElementById('historyList'),
    attachmentPreview: document.getElementById('attachmentPreview'),
    modelModal: document.getElementById('modelModal'),
    modelsGrid: document.getElementById('modelsGrid'),
    modelBtn: document.getElementById('modelBtn')
};

// تحميل النماذج من الباك اند
const loadModels = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/models`);
        const data = await response.json();
        allModels = data.models || [];
        renderModels();
    } catch (e) {
        console.error("Error loading models:", e);
        allModels = [
            { id: "mistral", name: "Mistral", description: "Fast and efficient" },
            { id: "gemini-fast", name: "Gemini Fast", description: "Quick responses" },
            { id: "minimax", name: "Minimax", description: "High performance" },
            { id: "claude-fast", name: "Claude Fast", description: "Smart and concise" },
            { id: "kimi", name: "Kimi", description: "Long context support" },
            { id: "polly", name: "Polly", description: "Creative writing" },
            { id: "perplexity-reasoning", name: "Perplexity", description: "Deep reasoning" },
            { id: "deepseek", name: "DeepSeek", description: "Advanced coding" },
            { id: "grok", name: "Grok", description: "Real-time knowledge" }
        ];
        renderModels();
    }
};

const renderModels = () => {
    dom.modelsGrid.innerHTML = '';
    const modelIcons = {
        "mistral": "🚀",
        "gemini-fast": "✨",
        "minimax": "⚡",
        "claude-fast": "🧠",
        "kimi": "📚",
        "polly": "🎨",
        "perplexity-reasoning": "🔍",
        "deepseek": "💻",
        "grok": "🌐"
    };

    allModels.forEach(model => {
        const card = document.createElement('div');
        card.className = `model-card ${model.id === currentModel ? 'selected' : ''}`;
        card.onclick = () => selectModel(model.id);
        card.innerHTML = `
            <div class="model-card-icon">${modelIcons[model.id] || '🤖'}</div>
            <div class="model-card-info">
                <div class="model-card-name">${model.name}</div>
                <div class="model-card-desc">${model.description}</div>
            </div>
        `;
        dom.modelsGrid.appendChild(card);
    });
};

const selectModel = (modelId) => {
    currentModel = modelId;
    window.toast(`تم اختيار نموذج: ${allModels.find(m => m.id === currentModel)?.name || currentModel}`);
    renderModels();
    window.closeModelModal();
};

window.openModelModal = (e) => {
    if (e) e.stopPropagation();
    const isVisible = dom.modelModal.style.display === 'flex';
    dom.modelModal.style.display = isVisible ? 'none' : 'flex';
};

window.closeModelModal = () => {
    dom.modelModal.style.display = 'none';
};

// Sidebar Logic
const toggleSidebar = (val) => {
    const isVisible = val !== undefined ? val : dom.sidebar.classList.contains('-translate-x-full');
    dom.sidebar.classList.toggle('-translate-x-full', !isVisible);
    dom.overlay.classList.toggle('hidden', !isVisible);
    requestAnimationFrame(() => dom.overlay.style.opacity = isVisible ? '1' : '0');
};

document.getElementById('sidebarToggle').onclick = () => toggleSidebar();
dom.overlay.onclick = () => toggleSidebar(false);

// Attachment Logic
dom.attachBtn.onclick = (e) => {
    e.stopPropagation();
    dom.attachMenu.style.display = dom.attachMenu.style.display === 'block' ? 'none' : 'block';
};

const imageInput = document.getElementById('imageInput');
const fileInput = document.getElementById('fileInput');
document.getElementById('pickImage').onclick = () => imageInput.click();
document.getElementById('pickFile').onclick = () => fileInput.click();

const showAttachmentPreview = (file, isImage) => {
    dom.attachmentPreview.innerHTML = '';
    dom.attachmentPreview.style.display = 'block';
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingAttachment = { name: file.name, data: e.target.result, type: isImage ? 'image' : 'file' };
        const item = document.createElement('div');
        item.className = 'preview-item';
        if (isImage) {
            item.innerHTML = `<img src="${e.target.result}"><div class="remove-btn" onclick="window.removeAttachment()">&times;</div>`;
        } else {
            item.innerHTML = `<div class="file-preview-icon"><i class="fa-solid fa-file"></i><div class="file-preview-name">${file.name}</div></div><div class="remove-btn" onclick="window.removeAttachment()">&times;</div>`;
        }
        dom.attachmentPreview.appendChild(item);
    };
    reader.readAsDataURL(file);
    dom.attachMenu.style.display = 'none';
};

window.removeAttachment = () => {
    pendingAttachment = null;
    dom.attachmentPreview.innerHTML = '';
    dom.attachmentPreview.style.display = 'none';
    imageInput.value = '';
    fileInput.value = '';
};

imageInput.onchange = (e) => { if (e.target.files[0]) showAttachmentPreview(e.target.files[0], true); };
fileInput.onchange = (e) => { if (e.target.files[0]) showAttachmentPreview(e.target.files[0], false); };

window.onclick = () => {
    const popup = document.getElementById('profilePopup');
    if (popup) popup.style.display = 'none';
    dom.attachMenu.style.display = 'none';
    window.closeModelModal();
};

dom.newChatBtn.onclick = () => {
    dom.messageBox.innerHTML = '';
    dom.emptyView.style.display = 'flex';
    dom.chatInput.value = '';
    currentChatId = null;
    window.removeAttachment();
    if(window.innerWidth < 768) toggleSidebar(false);
};

// Chat History عبر الباك اند
const loadChatHistory = async () => {
    if (!currentUser) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/chats/${currentUser.uid}`);
        const data = await response.json();
        dom.historyList.innerHTML = '';
        (data.chats || []).forEach((chat) => {
            const chatId = chat.id;
            const item = document.createElement('div');
            item.className = `group flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-all cursor-pointer text-sm text-gray-700 ${chat.isPinned ? 'bg-gray-50 border-r-4 border-black' : ''}`;
            
            let preview = chat.title || 'محادثة جديدة';
            item.innerHTML = `
                <div class="flex-1 min-w-0" onclick="window.loadChat('${chatId}')">
                    <p class="truncate font-medium">${preview}</p>
                </div>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <i class="fa-solid fa-trash text-[10px] text-gray-300 hover:text-red-500" onclick="event.stopPropagation(); window.deleteChat('${chatId}')"></i>
                </div>
            `;
            dom.historyList.appendChild(item);
        });
    } catch (e) { console.error(e); }
};

window.loadChat = async (chatId) => {
    currentChatId = chatId;
    dom.messageBox.innerHTML = '';
    dom.emptyView.style.display = 'none';
    try {
        const response = await fetch(`${BACKEND_URL}/api/chat/${chatId}`);
        const data = await response.json();
        if (data.messages) {
            data.messages.forEach(msg => {
                appendMessage(msg.sender, msg.text, msg.attachment);
            });
        }
    } catch (e) { console.error(e); }
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
    if(window.innerWidth < 768) toggleSidebar(false);
};

const appendMessage = (sender, text, attachment, sources = []) => {
    const div = document.createElement('div');
    div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} animate-msg mb-6`;
    
    let content = text;
    if (attachment) {
        if (attachment.type === 'image') content = `<img src="${attachment.data}" class="image-preview"><p class="mt-2">${text}</p>`;
        else content = `<div class="flex items-center gap-2"><i class="fa-solid fa-file"></i> ${attachment.name}</div><p class="mt-2">${text}</p>`;
    }

    if (sources && sources.length > 0) {
        content += `<div class="mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
            <p class="font-bold mb-1">المصادر:</p>
            <ul class="list-disc list-inside">
                ${sources.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </div>`;
    }

    if (sender === 'user') {
        div.innerHTML = `<div class="bg-[#F4F4F4] px-5 py-3.5 rounded-[1.8rem] rounded-tr-md max-w-[85%] text-gray-800 text-[15px]">${content}</div>`;
    } else {
        div.innerHTML = `
            <div class="flex items-start gap-3 max-w-[85%]">
                <img src="https://i.postimg.cc/TYd6FZy0/grok-image-x6em5fj-edit-96291120058942.png" class="w-6 h-6 mt-1 shrink-0">
                <div>
                    <div class="bg-white border border-gray-100 px-5 py-3.5 rounded-[1.8rem] rounded-tl-md text-gray-800 text-[15px]">${content}</div>
                    <div class="msg-actions">
                        <div class="action-btn" onclick="window.copyToClipboard('${text.replace(/'/g, "\\'")}')"><i class="fa-regular fa-copy"></i></div>
                        <div class="action-btn" onclick="window.toast('تم الإعجاب')"><i class="fa-regular fa-thumbs-up"></i></div>
                        <div class="action-btn" onclick="window.toast('لم يعجبني')"><i class="fa-regular fa-thumbs-down"></i></div>
                        <div class="action-btn" onclick="window.handleSend()"><i class="fa-solid fa-rotate-right"></i></div>
                        <div class="action-btn" onclick="window.toast('جاري المشاركة...')"><i class="fa-regular fa-share-from-square"></i></div>
                    </div>
                </div>
            </div>
        `;
    }
    dom.messageBox.appendChild(div);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => window.toast('تم النسخ إلى الحافظة'));
};

window.deleteChat = async (chatId) => {
    if (confirm("حذف المحادثة؟")) {
        if (currentChatId === chatId) dom.newChatBtn.click();
        await loadChatHistory();
    }
};

// Send Message
window.handleSend = async () => {
    const val = dom.chatInput.value.trim();
    if (!val && !pendingAttachment) return;

    dom.emptyView.style.display = 'none';
    appendMessage('user', val, pendingAttachment);
    
    const currentText = val;
    dom.chatInput.value = '';
    window.removeAttachment();

    const typing = document.createElement('div');
    typing.className = 'flex items-start gap-3 animate-msg mb-6';
    typing.innerHTML = `
        <img src="https://i.postimg.cc/TYd6FZy0/grok-image-x6em5fj-edit-96291120058942.png" class="w-6 h-6 mt-1">
        <div class="flex flex-col gap-2">
            <div class="bg-white border border-gray-100 px-5 py-3.5 rounded-[1.8rem] rounded-tl-md text-gray-400 text-[13px] flex items-center gap-2">
                <i class="fa-solid fa-magnifying-glass animate-pulse"></i>
                <span>جاري البحث والتحليل...</span>
            </div>
            <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
        </div>
    `;
    dom.messageBox.appendChild(typing);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;

    try {
        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: currentText,
                model: currentModel,
                userId: currentUser.uid,
                chatId: currentChatId,
                stream: false,
                use_search: true
            })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        typing.remove();
        appendMessage('bot', data.response, null, data.sources);

        if (!currentChatId && data.chatId) currentChatId = data.chatId;
        await loadChatHistory();
    } catch (e) {
        console.error("Error:", e);
        typing.remove();
        appendMessage('bot', 'حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    }
};

dom.sendBtn.onclick = window.handleSend;
dom.chatInput.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.handleSend(); } };

window.toast = (msg) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
};

// تحميل النماذج وتاريخ المحادثات عند بدء التطبيق
loadModels();
loadChatHistory();
dom.modelBtn.onclick = window.openModelModal;
