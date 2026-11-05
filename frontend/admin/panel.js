const state = {
  courses: [],
  currentCourseId: null,
};

const typeMeta = {
  markdown: { label: "Not", icon: "fa-file-alt" },
  text: { label: "Metin", icon: "fa-file-alt" },
  link: { label: "Bağlantı", icon: "fa-link" },
  pdf: { label: "PDF", icon: "fa-file-pdf" },
  image: { label: "Görsel", icon: "fa-file-image" },
};

const el = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const config = { ...options };
  if (options.body instanceof FormData) {
    config.body = options.body;
  } else if (options.body !== undefined) {
    config.headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    config.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, config);
  if (response.status === 401) {
    window.location.href = "/admin";
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : "İstek başarısız");
  }
  return response.json();
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function slugify(name) {
  const map = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };
  return name
    .toLowerCase()
    .replace(/[çğıöşü]/g, (ch) => map[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* --- Ders listesi --- */
function renderCourseList() {
  const list = el("course-list");
  list.replaceChildren();
  el("course-count").textContent = `${state.courses.length} ders`;

  state.courses.forEach((course) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("is-active", course.id === state.currentCourseId);
    const name = document.createElement("span");
    name.textContent = course.name;
    const count = document.createElement("span");
    count.className = "course-note-count";
    count.textContent = `${course.note_count} içerik`;
    button.append(name, count);
    button.addEventListener("click", () => selectCourse(course.id));
    item.appendChild(button);
    list.appendChild(item);
  });
}

async function loadCourses() {
  state.courses = await api("/admin/api/courses");
  renderCourseList();
}

/* --- Ders detayi --- */
async function selectCourse(courseId) {
  state.currentCourseId = courseId;
  renderCourseList();

  const course = state.courses.find((c) => c.id === courseId);
  el("detail-empty").hidden = true;
  el("detail-content").hidden = false;
  el("detail-title").textContent = course.name;
  el("detail-slug").textContent = `Slug: ${course.slug} · ID: ${course.id}`;
  el("exam-vize").value = course.vize_date || "";
  el("exam-final").value = course.final_date || "";

  await loadNotes();
}

async function loadNotes() {
  const notes = await api(`/admin/api/courses/${state.currentCourseId}/notes`);
  const list = el("note-list");
  list.replaceChildren();
  el("note-count").textContent = `${notes.length} içerik`;

  if (notes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Bu derste henüz içerik yok.";
    list.appendChild(empty);
    return;
  }

  notes.forEach((note) => list.appendChild(createNoteCard(note)));
}

function createNoteCard(note) {
  const meta = typeMeta[note.note_type] || { label: note.note_type, icon: "fa-file" };
  const card = document.createElement("article");
  card.className = "admin-note";

  const header = document.createElement("div");
  header.className = "admin-note-header";

  const title = document.createElement("h4");
  title.className = "admin-note-title";
  const icon = document.createElement("i");
  icon.className = `fas ${meta.icon}`;
  icon.setAttribute("aria-hidden", "true");
  title.append(icon, document.createTextNode(note.title));

  const metaWrap = document.createElement("div");
  metaWrap.className = "note-meta";
  const badge = document.createElement("span");
  badge.className = "note-type";
  badge.textContent = meta.label;
  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "button button-ghost button-small";
  editBtn.type = "button";
  editBtn.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i> Düzenle';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "button button-danger button-small";
  deleteBtn.type = "button";
  deleteBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i> Sil';
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`"${note.title}" içeriğini silmek istediğinize emin misiniz?`)) return;
    await api(`/admin/api/notes/${note.id}`, { method: "DELETE" });
    await Promise.all([loadNotes(), loadCourses()]);
  });

  actions.append(editBtn, deleteBtn);
  metaWrap.append(badge, actions);
  header.append(title, metaWrap);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "admin-note-body";
  body.hidden = true;

  const editableContent = ["text", "link", "markdown"].includes(note.note_type);
  const form = document.createElement("form");
  form.className = "stack-form";

  const titleField = document.createElement("label");
  titleField.className = "field";
  const titleSpan = document.createElement("span");
  titleSpan.textContent = "Başlık";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.maxLength = 200;
  titleInput.value = note.title;
  titleField.append(titleSpan, titleInput);
  form.appendChild(titleField);

  if (editableContent) {
    const contentField = document.createElement("label");
    contentField.className = "field";
    const contentSpan = document.createElement("span");
    contentSpan.textContent = note.note_type === "link" ? "Bağlantı adresi" : "İçerik";
    const contentInput = document.createElement("textarea");
    contentInput.rows = note.note_type === "link" ? 2 : 8;
    contentInput.value = note.content || "";
    contentField.append(contentSpan, contentInput);
    form.appendChild(contentField);

    const saveBtn = document.createElement("button");
    saveBtn.className = "button button-primary button-small";
    saveBtn.type = "submit";
    saveBtn.textContent = "Kaydet";
    form.appendChild(saveBtn);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = { title: titleInput.value };
      if (editableContent) payload.content = contentInput.value;
      await api(`/admin/api/notes/${note.id}`, { method: "PUT", body: payload });
      await Promise.all([loadNotes(), loadCourses()]);
    });
  } else {
    const info = document.createElement("p");
    info.className = "empty-note";
    info.textContent = `Dosya: ${note.file_path || "-"}`;
    form.appendChild(info);
  }

  body.appendChild(form);
  card.appendChild(body);

  editBtn.addEventListener("click", () => {
    body.hidden = !body.hidden;
  });

  return card;
}

/* --- Formlar --- */
function initNoteTypeSwitcher() {
  const typeSelect = el("note-type");
  const update = () => {
    document.querySelectorAll(".type-fields").forEach((block) => {
      const types = block.dataset.for.split(" ");
      block.hidden = !types.includes(typeSelect.value);
    });
  };
  typeSelect.addEventListener("change", update);
  update();
}

async function initNoteForm() {
  el("note-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorEl = el("note-form-error");
    errorEl.hidden = true;

    const type = el("note-type").value;
    const title = el("note-title").value.trim();
    const data = new FormData();
    data.append("title", title);
    data.append("note_type", type);

    try {
      if (type === "text") {
        data.append("content", el("note-text-content").value);
      } else if (type === "link") {
        data.append("content", el("note-link-url").value.trim());
      } else if (type === "markdown") {
        const filename = el("note-md-filename").value.trim() || `${slugify(title) || "not"}.md`;
        data.append("filename", filename);
        data.append("content", el("note-md-content").value);
      } else {
        const fileInput = document.querySelector('.type-fields:not([hidden]) input[type="file"]');
        if (!fileInput || !fileInput.files.length) throw new Error("Bir dosya seçin.");
        data.append("file", fileInput.files[0]);
      }

      await api(`/admin/api/courses/${state.currentCourseId}/notes`, { method: "POST", body: data });

      el("note-title").value = "";
      el("note-text-content").value = "";
      el("note-link-url").value = "";
      el("note-md-filename").value = "";
      el("note-md-content").value = "";
      const fileInput = document.querySelector('.type-fields:not([hidden]) input[type="file"]');
      if (fileInput) fileInput.value = "";

      await Promise.all([loadNotes(), loadCourses()]);
    } catch (error) {
      showError(errorEl, error.message);
    }
  });
}

function initCourseCreateForm() {
  const nameInput = el("new-course-name");
  const slugInput = el("new-course-slug");
  nameInput.addEventListener("input", () => {
    slugInput.placeholder = slugify(nameInput.value) || "orn: veri-yapilari";
  });

  el("course-create-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorEl = el("course-form-error");
    errorEl.hidden = true;
    try {
      const course = await api("/admin/api/courses", {
        method: "POST",
        body: { name: nameInput.value.trim(), slug: slugInput.value.trim() },
      });
      nameInput.value = "";
      slugInput.value = "";
      await loadCourses();
      await selectCourse(course.id);
    } catch (error) {
      showError(errorEl, error.message);
    }
  });
}

function initExamForm() {
  el("exam-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const statusEl = el("exam-form-status");
    statusEl.hidden = true;
    try {
      await api(`/admin/api/courses/${state.currentCourseId}`, {
        method: "PUT",
        body: { vize_date: el("exam-vize").value.trim(), final_date: el("exam-final").value.trim() },
      });
      await loadCourses();
      statusEl.textContent = "Sınav tarihleri kaydedildi.";
      statusEl.hidden = false;
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.hidden = false;
    }
  });
}

function initDeleteCourse() {
  el("delete-course-btn").addEventListener("click", async () => {
    const course = state.courses.find((c) => c.id === state.currentCourseId);
    if (!course || !confirm(`"${course.name}" dersi ve tüm içerikleri silinecek. Emin misiniz?`)) return;
    await api(`/admin/api/courses/${course.id}`, { method: "DELETE" });
    state.currentCourseId = null;
    el("detail-content").hidden = true;
    el("detail-empty").hidden = false;
    await loadCourses();
  });
}

function initLogout() {
  el("logout-btn").addEventListener("click", async () => {
    try {
      await api("/admin/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  });
}

async function init() {
  const me = await api("/admin/api/me");
  el("admin-user").innerHTML = "Giriş yapan: <strong></strong>";
  el("admin-user").querySelector("strong").textContent = me.username;

  initCourseCreateForm();
  initExamForm();
  initNoteTypeSwitcher();
  initNoteForm();
  initDeleteCourse();
  initLogout();
  await loadCourses();
}

init().catch((error) => {
  if (error.message !== "unauthorized") console.error(error);
});
