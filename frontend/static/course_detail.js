const noteTypes = {
  pdf: { icon: "fa-file-pdf", label: "PDF" },
  image: { icon: "fa-file-image", label: "Görsel" },
  markdown: { icon: "fa-file-alt", label: "Not" },
  text: { icon: "fa-file-alt", label: "Not" },
  link: { icon: "fa-link", label: "Bağlantı" },
};
let notePanelSequence = 0;

function sanitizeNoteHtml(markup) {
  const allowedTags = new Set([
    "A", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "H1", "H2", "H3", "H4", "HR",
    "IMG", "LI", "OL", "P", "PRE", "SPAN", "STRONG", "SUB", "SUP", "TABLE",
    "TBODY", "TD", "TH", "THEAD", "TR", "UL",
  ]);
  const blockedTags = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG", "VIDEO"]);
  const parser = new DOMParser();
  const source = parser.parseFromString(String(markup || ""), "text/html");

  const copyNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    if (blockedTags.has(node.tagName)) return document.createDocumentFragment();
    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      node.childNodes.forEach((child) => fragment.appendChild(copyNode(child)));
      return fragment;
    }

    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === "A" || node.tagName === "IMG") {
      const rawUrl = node.getAttribute(node.tagName === "A" ? "href" : "src") || "";
      try {
        if (!rawUrl.startsWith("//")) {
          const url = new URL(rawUrl, window.location.origin);
          const allowedProtocol = url.protocol === "https:" || url.protocol === "http:" ||
            (node.tagName === "A" && url.protocol === "mailto:");
          if (allowedProtocol) element.setAttribute(node.tagName === "A" ? "href" : "src", url.href);
        }
      } catch {
        // Invalid URLs are omitted from the sanitized output.
      }
      ["alt", "title"].forEach((attribute) => {
        if (node.hasAttribute(attribute)) element.setAttribute(attribute, node.getAttribute(attribute));
      });
      if (node.tagName === "A" && element.hasAttribute("href")) {
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
      if (node.tagName === "IMG") element.loading = "lazy";
    }
    node.childNodes.forEach((child) => element.appendChild(copyNode(child)));
    return element;
  };

  const clean = document.createDocumentFragment();
  source.body.childNodes.forEach((node) => clean.appendChild(copyNode(node)));
  return clean;
}

function createEmptyMessage(message) {
  const element = document.createElement("p");
  element.className = "empty-message";
  element.textContent = message;
  return element;
}

function renderExamDates(course) {
  const container = document.getElementById("exam-dates");
  container.replaceChildren();

  [["Vize", course.vize_date], ["Final", course.final_date]].forEach(([label, date]) => {
    const chip = document.createElement("span");
    chip.className = "date-chip";
    const icon = document.createElement("i");
    icon.className = `fas ${label === "Vize" ? "fa-calendar-day" : "fa-calendar-check"}`;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.append(`${label}: `);
    const value = document.createElement("strong");
    value.textContent = date || "Belirlenmedi";
    text.appendChild(value);
    chip.append(icon, text);
    container.appendChild(chip);
  });
}

function createNoteHeader(note, expandable = false) {
  const header = document.createElement("div");
  header.className = "note-card-header";

  const title = document.createElement("h3");
  title.className = "note-heading";
  const icon = document.createElement("i");
  icon.className = `fas ${(noteTypes[note.note_type] || { icon: "fa-file-alt" }).icon}`;
  icon.setAttribute("aria-hidden", "true");
  title.append(icon, document.createTextNode(note.title));
  header.appendChild(title);

  if (expandable) {
    const chevron = document.createElement("i");
    chevron.className = "fas fa-chevron-down note-chevron";
    chevron.setAttribute("aria-hidden", "true");
    header.appendChild(chevron);
  } else if (note.note_type !== "markdown" && note.note_type !== "text") {
    const type = document.createElement("span");
    type.className = "note-type";
    type.textContent = (noteTypes[note.note_type] || { label: note.note_type }).label;
    header.appendChild(type);
  }
  return header;
}

function createNoteCard(note, course) {
  const card = document.createElement("article");
  card.className = "note-card";

  if (note.note_type === "markdown" || note.note_type === "text") {
    const toggle = document.createElement("button");
    toggle.className = "note-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    const panelId = `note-content-${++notePanelSequence}`;
    toggle.setAttribute("aria-controls", panelId);
    toggle.appendChild(createNoteHeader(note, true));

    const content = document.createElement("div");
    content.className = "note-content note-body";
    content.id = panelId;
    content.hidden = true;
    const prose = document.createElement("div");
    prose.className = "prose";
    prose.appendChild(sanitizeNoteHtml(note.content));
    content.appendChild(prose);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      content.hidden = expanded;
    });
    card.append(toggle, content);
    return card;
  }

  card.appendChild(createNoteHeader(note));
  const content = document.createElement("div");
  content.className = "note-content";

  if (note.note_type === "pdf" || note.note_type === "image") {
    const filePath = String(note.file_path || "").split("/").map(encodeURIComponent).join("/");
    const source = `/uploads/${encodeURIComponent(course.slug)}/${filePath}`;
    if (note.note_type === "pdf") {
      const link = document.createElement("a");
      link.className = "note-action";
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.innerHTML = '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Aç veya indir';
      content.appendChild(link);
    } else {
      const image = document.createElement("img");
      image.src = source;
      image.alt = note.title;
      image.loading = "lazy";
      content.appendChild(image);
    }
  } else if (note.note_type === "link") {
    let safeUrl = "#";
    try {
      const url = new URL(note.content.trim());
      if (url.protocol === "https:" || url.protocol === "http:") safeUrl = url.href;
    } catch {
      safeUrl = "#";
    }
    const link = document.createElement("a");
    link.className = "note-action";
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = '<i class="fas fa-globe" aria-hidden="true"></i>';
    link.appendChild(document.createTextNode(note.content.trim()));
    content.appendChild(link);
  }

  card.appendChild(content);
  return card;
}

function renderNotes(notes, course) {
  const buckets = {
    "col-notes": document.getElementById("markdown-list"),
    "col-docs": document.getElementById("pdf-list"),
    "col-links": document.getElementById("link-list"),
  };
  const entries = { "col-notes": [], "col-docs": [], "col-links": [] };

  notes.forEach((note) => {
    if (note.note_type === "markdown" || note.note_type === "text") entries["col-notes"].push(note);
    else if (note.note_type === "pdf" || note.note_type === "image") entries["col-docs"].push(note);
    else if (note.note_type === "link") entries["col-links"].push(note);
  });

  Object.entries(buckets).forEach(([panelId, list]) => {
    list.replaceChildren();
    if (entries[panelId].length === 0) {
      list.appendChild(createEmptyMessage("Bu bölümde henüz içerik yok."));
      return;
    }
    entries[panelId].forEach((note) => list.appendChild(createNoteCard(note, course)));
  });
}

async function loadCourseDetail() {
  const courseId = new URLSearchParams(window.location.search).get("id");
  const title = document.getElementById("course-name");
  if (!courseId) {
    title.textContent = "Ders bulunamadı";
    return;
  }

  try {
    const coursesResponse = await fetch("/api/courses");
    if (!coursesResponse.ok) throw new Error("Ders listesi alınamadı.");
    const courses = await coursesResponse.json();
    const course = courses.find((item) => String(item.id) === courseId);
    if (!course) {
      title.textContent = "Ders bulunamadı";
      return;
    }

    title.textContent = course.name;
    renderExamDates(course);

    const notesResponse = await fetch(`/api/courses/${encodeURIComponent(courseId)}/notes`);
    if (!notesResponse.ok) throw new Error("Ders içerikleri alınamadı.");
    renderNotes(await notesResponse.json(), course);
  } catch (error) {
    console.error("Ders detayları yüklenemedi:", error);
    title.textContent = "Ders içerikleri yüklenemedi";
    document.querySelectorAll(".note-list").forEach((list) => {
      list.replaceChildren(createEmptyMessage("Bağlantını kontrol edip sayfayı yeniden yükle."));
    });
  }
}

function initMaterialTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const activateTab = (activeTab, focus = false) => {
    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      const panel = document.getElementById(tab.dataset.target);
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      panel.hidden = !isActive;
    });
    if (focus) activeTab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMaterialTabs();
  loadCourseDetail();
});
