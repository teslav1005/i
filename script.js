import { auth, db } from './api.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, orderBy, deleteDoc, arrayUnion, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    attachmentPreview: document.getElementById('attachmentPreview'),
    imageViewer: document.getElementById('imageViewer'),
    viewerImg: document.getElementById('viewerImg'),
    deleteImageBtn: document.getElementById('deleteImageBtn')
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
            <div id="profilePopup" class="glass p-2 space-y-1" style="display:none; position:absolute; bottom:70px; left:10px; width:220px; z-index:200; border-radius:1.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
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
dom.overlay.onclick = () => {
    toggleSidebar(false);
    dom.attachMenu.classList.add('hidden');
};

// Robust Attachment Toggle Logic
const toggleAttachMenu = (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    dom.attachMenu.classList.toggle('hidden');
};

// Use both click and touchstart for maximum responsiveness
dom.attachBtn.addEventListener('click', toggleAttachMenu);
dom.attachBtn.addEventListener('touchstart', (e) => {
    toggleAttachMenu(e);
}, { passive: false });

const imageInput = document.getElementById('imageInput');
const fileInput = document.getElementById('fileInput');

document.getElementById('pickImage').onclick = (e) => { 
    e.stopPropagation(); 
    imageInput.click(); 
    dom.attachMenu.classList.add('hidden');
};

document.getElementById('pickFile').onclick = (e) => { 
    e.stopPropagation(); 
    fileInput.click(); 
    dom.attachMenu.classList.add('hidden');
};

const showAttachmentPreview = (file, isImage) => {
    dom.attachmentPreview.innerHTML = '';
    dom.attachmentPreview.classList.remove('hidden');
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingAttachment = { name: file.name, data: e.target.result, type: isImage ? 'image' : 'file' };
        const item = document.createElement('div');
        item.className = 'floating-preview';
        if (isImage) {
            item.innerHTML = `
                <img src="${e.target.result}" onclick="window.openImageViewer('${e.target.result}')">
                <div class="remove-btn" onclick="window.removeAttachment()"><i class="fa-solid fa-xmark"></i></div>
            `;
        } else {
            item.innerHTML = `
                <div class="file-preview-icon" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f9f9f9; border-radius:1.2rem; font-size:24px; color:#666;">
                    <i class="fa-solid fa-file"></i>
                    <div style="font-size:8px; padding:2px; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</div>
                </div>
                <div class="remove-btn" onclick="window.removeAttachment()"><i class="fa-solid fa-xmark"></i></div>
            `;
        }
        dom.attachmentPreview.appendChild(item);
    };
    reader.readAsDataURL(file);
};

window.removeAttachment = () => {
    pendingAttachment = null;
    dom.attachmentPreview.innerHTML = '';
    dom.attachmentPreview.classList.add('hidden');
    imageInput.value = '';
    fileInput.value = '';
    window.closeImageViewer();
};

// Image Viewer Functions
window.openImageViewer = (src) => {
    dom.viewerImg.src = src;
    dom.imageViewer.classList.remove('hidden');
    dom.imageViewer.classList.add('flex');
};

window.closeImageViewer = () => {
    dom.imageViewer.classList.add('hidden');
    dom.imageViewer.classList.remove('flex');
};

dom.deleteImageBtn.onclick = () => {
    window.removeAttachment();
};

imageInput.onchange = (e) => { if (e.target.files[0]) showAttachmentPreview(e.target.files[0], true); };
fileInput.onchange = (e) => { if (e.target.files[0]) showAttachmentPreview(e.target.files[0], false); };

// Global click handler to close menus
window.addEventListener('click', (e) => {
    const popup = document.getElementById('profilePopup');
    if (popup) popup.style.display = 'none';
    
    if (!dom.attachBtn.contains(e.target) && !dom.attachMenu.contains(e.target)) {
        dom.attachMenu.classList.add('hidden');
    }
});

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
        const q = query(collection(db, 'chats'), where('userId', '==', currentUser.uid), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        dom.historyList.innerHTML = '';
        snap.forEach((docSnap) => {
            const chat = docSnap.data();
            const chatId = docSnap.id;
            const item = document.createElement('div');
            item.className = `group flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-all cursor-pointer text-sm text-gray-700`;
            
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
        if (attachment.type === 'image') content = `<img src="${attachment.data}" class="image-preview" onclick="window.openImageViewer('${attachment.data}')"><p class="mt-2">${text}</p>`;
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
                </div>
            </div>
        `;
    }
    dom.messageBox.appendChild(div);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
};

window.deleteChat = async (chatId) => {
    if (confirm("حذف المحادثة؟")) { await deleteDoc(doc(db, 'chats', chatId)); if (currentChatId === chatId) dom.newChatBtn.click(); await loadChatHistory(); }
};

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

    try {
        const aiRes = "هذا رد تجريبي من النسخة الأصلية للفرونت اند.";
        typing.remove();
        appendMessage('bot', aiRes);

        const msgUser = { sender: 'user', text: currentText, attachment: currentAttach, timestamp: new Date() };
        const msgBot = { sender: 'bot', text: aiRes, timestamp: new Date() };

        if (!currentChatId) {
            const docRef = await addDoc(collection(db, 'chats'), {
                userId: currentUser.uid,
                title: currentText.substring(0, 30),
                messages: [msgUser, msgBot],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            currentChatId = docRef.id;
        } else {
            await updateDoc(doc(db, 'chats', currentChatId), {
                messages: arrayUnion(msgUser, msgBot),
                updatedAt: serverTimestamp()
            });
        }
        await loadChatHistory();
    } catch (e) {
        console.error(e);
        typing.remove();
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
