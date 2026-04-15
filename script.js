import { auth, db } from './api.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, orderBy, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentChatId = null;
let pendingAttachment = null;

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
    attachmentPreview: document.getElementById('attachmentPreview')
};

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    const loginBtnHeader = document.getElementById('loginBtnHeader');
    const profileSection = document.getElementById('profileSection');

    if (!user) {
        currentUser = null;
        if (loginBtnHeader) loginBtnHeader.style.display = 'block';
        profileSection.innerHTML = '';
        dom.historyList.innerHTML = '';
    } else {
        currentUser = user;
        if (loginBtnHeader) loginBtnHeader.style.display = 'none';
        profileSection.innerHTML = `
            <div id="profileTrigger" class="flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer hover:bg-gray-200/50 transition-all">
                <img id="profileImg" src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="Profile" class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm object-cover">
                <div class="flex-1 min-w-0">
                    <p id="profileName" class="text-xs font-bold truncate">${user.displayName || 'User'}</p>
                    <p id="profileEmail" class="text-xs text-gray-500 truncate">${user.email || ''}</p>
                </div>
                <i class="fa-solid fa-ellipsis-vertical text-gray-300 text-xs"></i>
            </div>
            <div id="profilePopup" class="glass p-2 space-y-1">
                <a href="javascript:void(0)" onclick="window.navigateToPage('privacy.html')" class="block p-3 text-sm hover:bg-gray-100 rounded-xl transition-all">سياسة الخصوصية</a>
                <a href="javascript:void(0)" onclick="window.navigateToPage('terms.html')" class="block p-3 text-sm hover:bg-gray-100 rounded-xl transition-all">اتفاقية المستخدم</a>
                <button id="logoutBtn" class="w-full text-right p-3 text-sm hover:bg-gray-100 rounded-xl transition-all">تسجيل الخروج</button>
                <button id="deleteAccountBtn" class="w-full text-right p-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">حذف الحساب</button>
            </div>
        `;
        setupProfileListeners();
        await loadChatHistory();
    }
});

const setupProfileListeners = () => {
    const trigger = document.getElementById('profileTrigger');
    const popup = document.getElementById('profilePopup');
    if (trigger) trigger.onclick = (e) => { e.stopPropagation(); popup.style.display = popup.style.display === 'block' ? 'none' : 'block'; };
    document.getElementById('logoutBtn').onclick = () => dom.logoutConfirm.style.display = 'flex';
    document.getElementById('deleteAccountBtn').onclick = () => window.navigateToPage('delete-account.html');
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
};

dom.confirmNo.onclick = () => dom.logoutConfirm.style.display = 'none';
dom.confirmYes.onclick = async () => { await signOut(auth); window.navigateToPage('index.html'); };

dom.newChatBtn.onclick = () => {
    dom.messageBox.innerHTML = '';
    dom.emptyView.style.display = 'flex';
    dom.chatInput.value = '';
    currentChatId = null;
    window.removeAttachment();
    if(window.innerWidth < 768) toggleSidebar(false);
};

// Chat History
const loadChatHistory = async () => {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'chats'), where('userId', '==', currentUser.uid), orderBy('isPinned', 'desc'), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        dom.historyList.innerHTML = '';
        snap.forEach((docSnap) => {
            const chat = docSnap.data();
            const chatId = docSnap.id;
            const item = document.createElement('div');
            item.className = `group flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-all cursor-pointer text-sm text-gray-700 ${chat.isPinned ? 'bg-gray-50 border-r-4 border-black' : ''}`;
            
            let preview = chat.title || 'محادثة جديدة';
            if (chat.messages && chat.messages.length > 0) {
                const first = chat.messages[0].text || "";
                preview = first.split(' ').slice(0, 3).join(' ') + (first.split(' ').length > 3 ? '...' : '');
            }

            item.innerHTML = `
                <div class="flex-1 min-w-0" onclick="window.loadChat('${chatId}')">
                    <p class="truncate font-medium">${preview}</p>
                </div>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <i class="fa-solid fa-thumbtack text-[10px] ${chat.isPinned ? 'text-black opacity-100' : 'text-gray-300'}" onclick="event.stopPropagation(); window.togglePin('${chatId}', ${chat.isPinned})"></i>
                    <i class="fa-solid fa-pen text-[10px] text-gray-300 hover:text-blue-500" onclick="event.stopPropagation(); window.editChatTitle('${chatId}', '${preview.replace(/'/g, "\\'")}')"></i>
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
        const snap = await getDocs(query(collection(db, 'chats'), where('__name__', '==', chatId)));
        if (!snap.empty) {
            const chat = snap.docs[0].data();
            chat.messages.forEach(msg => {
                appendMessage(msg.sender, msg.text, msg.attachment);
            });
        }
    } catch (e) { console.error(e); }
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
    if(window.innerWidth < 768) toggleSidebar(false);
};

const appendMessage = (sender, text, attachment) => {
    const div = document.createElement('div');
    div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} animate-msg mb-6`;
    
    let content = text;
    if (attachment) {
        if (attachment.type === 'image') content = `<img src="${attachment.data}" class="image-preview"><p class="mt-2">${text}</p>`;
        else content = `<div class="flex items-center gap-2"><i class="fa-solid fa-file"></i> ${attachment.name}</div><p class="mt-2">${text}</p>`;
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

window.editChatTitle = async (chatId, current) => {
    const title = prompt("الاسم الجديد:", current);
    if (title) { await updateDoc(doc(db, 'chats', chatId), { title: title.trim(), updatedAt: new Date() }); await loadChatHistory(); }
};

window.deleteChat = async (chatId) => {
    if (confirm("حذف المحادثة؟")) { await deleteDoc(doc(db, 'chats', chatId)); if (currentChatId === chatId) dom.newChatBtn.click(); await loadChatHistory(); }
};

window.togglePin = async (chatId, status) => { await updateDoc(doc(db, 'chats', chatId), { isPinned: !status, updatedAt: new Date() }); await loadChatHistory(); };

// Send Message
window.handleSend = async () => {
    const val = dom.chatInput.value.trim();
    if (!val && !pendingAttachment) return;
    if (!currentUser) { window.navigateToPage('login.html'); return; }

    dom.emptyView.style.display = 'none';
    appendMessage('user', val, pendingAttachment);
    
    const currentText = val;
    const currentAttach = pendingAttachment;
    dom.chatInput.value = '';
    window.removeAttachment();

    const typing = document.createElement('div');
    typing.className = 'flex items-start gap-3 animate-msg mb-6';
    typing.innerHTML = `<img src="https://i.postimg.cc/TYd6FZy0/grok-image-x6em5fj-edit-96291120058942.png" class="w-6 h-6 mt-1"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    dom.messageBox.appendChild(typing);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;

    setTimeout(async () => {
        const aiRes = "هذا رد تجريبي من Afnan ai.";
        typing.remove();
        appendMessage('bot', aiRes);

        try {
            const msgUser = { sender: 'user', text: currentText, attachment: currentAttach, timestamp: new Date() };
            const msgBot = { sender: 'bot', text: aiRes, timestamp: new Date() };
            if (!currentChatId) {
                const ref = await addDoc(collection(db, 'chats'), { userId: currentUser.uid, title: currentText.split(' ').slice(0, 3).join(' '), messages: [msgUser, msgBot], createdAt: new Date(), updatedAt: new Date(), isPinned: false });
                currentChatId = ref.id;
            } else {
                await updateDoc(doc(db, 'chats', currentChatId), { messages: arrayUnion(msgUser, msgBot), updatedAt: new Date() });
            }
            await loadChatHistory();
        } catch (e) { console.error(e); }
    }, 1000);
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
