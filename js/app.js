const STORAGE_KEY = "neas-library-books-v1";
let books = loadBooks();
let activeCategory = "all";
let currentCover = "";
const $ = (selector) => document.querySelector(selector);

function loadBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveBooks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }
  catch { showToast("Penyimpanan penuh. Coba gunakan gambar cover yang lebih kecil."); }
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function updateStats() {
  $("#totalBooks").textContent = books.length;
  $("#readBooks").textContent = books.filter(b => b.status === "Sudah Dibaca").length;
  $("#readingBooks").textContent = books.filter(b => b.status === "Sedang Dibaca").length;
  $("#unreadBooks").textContent = books.filter(b => b.status === "Belum Dibaca").length;
}
function renderBooks() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const status = $("#statusFilter").value;
  const sort = $("#sortFilter").value;
  let visible = books.filter(book => {
    const matchesText = [book.title, book.author, book.category].join(" ").toLowerCase().includes(query);
    return matchesText && (status === "all" || book.status === status) && (activeCategory === "all" || book.category === activeCategory);
  });
  if (sort === "title") visible.sort((a,b) => a.title.localeCompare(b.title, "id"));
  else if (sort === "author") visible.sort((a,b) => (a.author || "").localeCompare(b.author || "", "id"));
  else visible.sort((a,b) => b.createdAt - a.createdAt);

  $("#bookGrid").innerHTML = visible.map(book => `
    <article class="book-card">
      <div class="book-cover" data-detail="${book.id}" tabindex="0" role="button" aria-label="Lihat detail ${escapeHTML(book.title)}">
        ${book.cover ? `<img src="${book.cover}" alt="Cover ${escapeHTML(book.title)}">` : `<span class="cover-placeholder">${escapeHTML(book.title)}</span>`}
        <span class="book-status">${escapeHTML(book.status)}</span>
      </div>
      <div class="card-actions">
        <button type="button" data-edit="${book.id}" aria-label="Edit ${escapeHTML(book.title)}" title="Edit">✎</button>
        <button type="button" data-delete="${book.id}" aria-label="Hapus ${escapeHTML(book.title)}" title="Hapus">×</button>
      </div>
      <div class="book-info"><h3 data-detail="${book.id}">${escapeHTML(book.title)}</h3><p>${escapeHTML(book.author || "Penulis tidak dicantumkan")}</p><span class="book-category">${escapeHTML(book.category)}</span></div>
    </article>`).join("");
  $("#emptyState").classList.toggle("show", visible.length === 0);
  $("#bookGrid").style.display = visible.length ? "grid" : "none";
  updateStats();
}
function resetBookForm() {
  $("#bookForm").reset();
  $("#bookId").value = "";
  currentCover = "";
  $("#coverPreview").innerHTML = "<span>BOOK<br>COVER</span>";
  $("#dialogTitle").textContent = "Tambahkan buku";
}
function openAddDialog() {
  resetBookForm();
  $("#bookDialog").showModal();
}
function editBook(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;
  resetBookForm();
  $("#bookId").value = book.id;
  $("#bookTitle").value = book.title;
  $("#bookAuthor").value = book.author || "";
  $("#bookCategory").value = book.category;
  $("#bookStatus").value = book.status;
  $("#bookNotes").value = book.notes || "";
  currentCover = book.cover || "";
  if (currentCover) $("#coverPreview").innerHTML = `<img src="${currentCover}" alt="Preview cover">`;
  $("#dialogTitle").textContent = "Edit informasi buku";
  $("#bookDialog").showModal();
}
function showDetail(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;
  $("#detailContent").innerHTML = `<div class="detail-layout">
    ${book.cover ? `<img class="detail-cover" src="${book.cover}" alt="Cover ${escapeHTML(book.title)}">` : `<div class="detail-cover detail-placeholder">${escapeHTML(book.title)}</div>`}
    <div><span class="eyebrow">YOUR BOOK DETAILS</span><h2>${escapeHTML(book.title)}</h2><p class="detail-author">${escapeHTML(book.author || "Penulis tidak dicantumkan")}</p><span class="detail-tag">${escapeHTML(book.category)}</span><span class="detail-tag">${escapeHTML(book.status)}</span><p class="detail-notes">${escapeHTML(book.notes || "Belum ada catatan untuk buku ini.")}</p><div class="detail-buttons"><button class="button button-primary" data-detail-edit="${book.id}">Edit buku ✎</button><button class="button button-quiet" data-detail-delete="${book.id}">Hapus</button></div></div>
  </div>`;
  $("#detailDialog").showModal();
}
function deleteBook(id) {
  const book = books.find(item => item.id === id);
  if (!book || !confirm(`Hapus "${book.title}" dari koleksi?`)) return;
  books = books.filter(item => item.id !== id);
  saveBooks(); renderBooks(); $("#detailDialog").close();
  showToast("Buku berhasil dihapus dari koleksi.");
}

$("#openAddModal").addEventListener("click", openAddDialog);
$("#emptyAddButton").addEventListener("click", openAddDialog);
$("#closeModal").addEventListener("click", () => $("#bookDialog").close());
$("#cancelModal").addEventListener("click", () => $("#bookDialog").close());
$("#closeDetail").addEventListener("click", () => $("#detailDialog").close());
$("#searchInput").addEventListener("input", renderBooks);
$("#statusFilter").addEventListener("change", renderBooks);
$("#sortFilter").addEventListener("change", renderBooks);
$("#categoryChips").addEventListener("click", event => {
  const chip = event.target.closest("[data-category]");
  if (!chip) return;
  activeCategory = chip.dataset.category;
  document.querySelectorAll(".chip").forEach(item => item.classList.toggle("selected", item === chip));
  renderBooks();
});
$("#coverInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("Pilih file gambar untuk cover.");
  if (file.size > 3 * 1024 * 1024) return showToast("Ukuran cover maksimal 3 MB.");
  const reader = new FileReader();
  reader.onload = () => {
    currentCover = reader.result;
    $("#coverPreview").innerHTML = `<img src="${currentCover}" alt="Preview cover">`;
  };
  reader.readAsDataURL(file);
});
$("#bookForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#bookId").value;
  const existing = books.find(book => book.id === id);
  const book = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title: $("#bookTitle").value.trim(),
    author: $("#bookAuthor").value.trim(),
    category: $("#bookCategory").value,
    status: $("#bookStatus").value,
    notes: $("#bookNotes").value.trim(),
    cover: currentCover || "",
    createdAt: existing ? existing.createdAt : Date.now()
  };
  if (!book.title) return;
  if (existing) books = books.map(item => item.id === id ? book : item);
  else books.unshift(book);
  saveBooks(); renderBooks(); $("#bookDialog").close();
  showToast(existing ? "Perubahan buku berhasil disimpan." : "Buku berhasil ditambahkan!");
});
$("#bookGrid").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  const detail = event.target.closest("[data-detail]");
  if (edit) editBook(edit.dataset.edit);
  else if (remove) deleteBook(remove.dataset.delete);
  else if (detail) showDetail(detail.dataset.detail);
});
$("#bookGrid").addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-detail]")) {
    event.preventDefault(); showDetail(event.target.dataset.detail);
  }
});
$("#detailContent").addEventListener("click", event => {
  const edit = event.target.closest("[data-detail-edit]");
  const remove = event.target.closest("[data-detail-delete]");
  if (edit) { const id = edit.dataset.detailEdit; $("#detailDialog").close(); editBook(id); }
  if (remove) deleteBook(remove.dataset.detailDelete);
});
$("#contactForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`[Nea's Library] ${data.get("topic")}`);
  const body = encodeURIComponent(`Nama: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`);
  window.location.href = `mailto:aurelliajoneaa@gmail.com?subject=${subject}&body=${body}`;
});
$("#menuToggle").addEventListener("click", () => {
  const open = $("#mainNav").classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
});
$("#mainNav").addEventListener("click", event => {
  if (event.target.closest("a")) { $("#mainNav").classList.remove("open"); $("#menuToggle").setAttribute("aria-expanded", "false"); }
});
$("#year").textContent = new Date().getFullYear();
renderBooks();

/* Catatan pengembangan:
   Data versi ini tersimpan di localStorage browser/perangkat yang digunakan.
   Untuk akun banyak pengguna dan sinkronisasi antarperangkat, sambungkan ke backend
   (misalnya Supabase/Firebase) dan tambahkan autentikasi pengguna. */
