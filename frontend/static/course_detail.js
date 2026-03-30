async function loadCourseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get("id");

  if (!courseId) {
    alert("Ders ID bulunamadi!");
    return;
  }

  try {
    const response = await fetch(`/api/courses`);
    const courses = await response.json();
    const course = courses.find((c) => c.id == courseId);

    if (course) {
      document.getElementById("course-name").innerText = course.name;
      document.getElementById("exam-dates").innerHTML = 
        `<span class="mr-6 inline-flex border-r border-gray-700 pr-6"><i class="fas fa-calendar-alt text-primary mr-2"></i>Vize: <span class="text-gray-200 ml-1 font-semibold">${course.vize_date || "Belirlenmedi"}</span></span>
         <span class="inline-flex"><i class="fas fa-calendar-check text-secondary mr-2"></i>Final: <span class="text-gray-200 ml-1 font-semibold">${course.final_date || "Belirlenmedi"}</span></span>`;
    }

    const notesResponse = await fetch(`/api/courses/${courseId}/notes`);
    const notes = await notesResponse.json();

    const pdfList = document.getElementById("pdf-list");
    const mdList = document.getElementById("markdown-list");
    const linkList = document.getElementById("link-list");

    pdfList.innerHTML = "";
    mdList.innerHTML = "";
    linkList.innerHTML = "";

    if (notes.length === 0) {
      const emptyMsg = `
        <div class="text-center py-16 px-4 bg-cardbg rounded-2xl border border-gray-800">
          <div class="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-gray-500">
            <i class="far fa-folder-open"></i>
          </div>
          <p class="text-gray-400 font-medium text-lg">Henüz bu kategoriye not eklenmedi.</p>
        </div>`;
      pdfList.innerHTML = emptyMsg;
      mdList.innerHTML = emptyMsg;
      linkList.innerHTML = emptyMsg;
    } else {
      let hasDocs = false, hasNotes = false, hasLinks = false;
      
      notes.forEach((note) => {
        const li = document.createElement("div"); // Using div instead of li if appending to div for mdList, but ul for others. Let's make it div.
        li.className = "bg-cardbg rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors shadow-sm mb-4";

        let contentHtml = "";
        let icon = "fas fa-file-alt";
        let iconColor = "text-primary";
        
        if (note.note_type === "pdf") { icon = "fas fa-file-pdf"; iconColor = "text-red-400"; }
        else if (note.note_type === "image") { icon = "fas fa-file-image"; iconColor = "text-green-400"; }
        else if (note.note_type === "markdown" || note.note_type === "text") { icon = "fas fa-file-code"; iconColor = "text-yellow-400"; }
        else if (note.note_type === "link") { icon = "fas fa-link"; iconColor = "text-blue-400"; }

        const headerHtml = `
          <div class="px-5 py-3 ${note.note_type === 'markdown' || note.note_type === 'text' ? 'bg-cardhover/20' : 'bg-cardhover/50'} border-b border-gray-800 flex items-center justify-between gap-4">
            <h3 class="text-base font-semibold text-white flex items-center gap-3">
              <i class="${icon} ${iconColor} text-lg w-5 text-center"></i>
              ${note.title}
            </h3>
            ${(note.note_type !== 'markdown' && note.note_type !== 'text') ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700">${note.note_type}</span>` : ''}
          </div>
        `;

        if (note.note_type === "pdf") {
          hasDocs = true;
          contentHtml = `
          ${headerHtml}
          <div class="px-5 py-4 flex flex-col gap-3 bg-black/5">
            <a href="/uploads/${course.slug}/${note.file_path}" target="_blank" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background font-semibold rounded-lg transition-all duration-300 text-sm">
              <i class="fas fa-external-link-alt"></i> Aç / İndir
            </a>
          </div>
          `;
          li.innerHTML = contentHtml;
          pdfList.appendChild(li);
        } else if (note.note_type === "image") {
          hasDocs = true;
          contentHtml = `
          ${headerHtml}
          <div class="p-4 flex justify-center bg-black/20">
            <img src="/uploads/${course.slug}/${note.file_path}" alt="${note.title}" class="max-w-full rounded-md border border-gray-700">
          </div>
          `;
          li.innerHTML = contentHtml;
          pdfList.appendChild(li);
        } else if (note.note_type === "text" || note.note_type === "markdown") {
          hasNotes = true;
          contentHtml = `
          ${headerHtml}
          <div class="p-4 md:p-6 text-gray-300 leading-relaxed bg-black/10">
            <div class="prose prose-invert prose-rose max-w-none prose-img:rounded-lg prose-img:border prose-img:border-gray-700 prose-img:shadow-md prose-headings:border-b prose-headings:border-gray-800 prose-headings:pb-1 prose-headings:mb-2 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-p:leading-snug">
              ${note.content}
            </div>
          </div>
          `;
          li.innerHTML = contentHtml;
          mdList.appendChild(li);
        } else if (note.note_type === "link") {
          hasLinks = true;
          // Render link item
          contentHtml = `
          ${headerHtml}
          <div class="px-5 py-4 bg-black/5">
            <a href="${note.content.trim()}" target="_blank" class="break-all text-sm text-blue-400 hover:text-blue-300 hover:underline inline-flex items-start gap-2">
              <i class="fas fa-globe mt-1 shrink-0"></i> ${note.content.trim()}
            </a>
          </div>
          `;
          li.innerHTML = contentHtml;
          linkList.appendChild(li);
        }
      });
      
      const emptyMsg = `<div class="text-center text-sm text-gray-600 py-6 border border-dashed border-gray-800 rounded-lg">İçerik bulunamadı.</div>`;
      if (!hasDocs) pdfList.innerHTML = emptyMsg;
      if (!hasNotes) mdList.innerHTML = emptyMsg;
      if (!hasLinks) linkList.innerHTML = emptyMsg;
    }
  } catch (error) {
    console.error("Hata:", error);
  }
}

// Mobile Tab Switcher Logic
function initMobileTabs() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const dropdown = document.getElementById("mobile-dropdown");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const currentTabLabel = document.getElementById("mobile-current-tab");
  
  if (!menuBtn || !dropdown) return;
  
  menuBtn.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });
  
  // Close dropdown when outside click
  document.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
  
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetElement = document.getElementById(targetId);
      
      // Update active styling
      tabBtns.forEach(b => {
        b.classList.remove("bg-primary/10", "text-primary", "font-medium");
        b.classList.add("hover:bg-gray-800", "text-gray-300");
      });
      btn.classList.add("bg-primary/10", "text-primary", "font-medium");
      btn.classList.remove("hover:bg-gray-800", "text-gray-300");
      
      // Update label
      currentTabLabel.innerText = btn.innerText.trim();
      
      // Hide all columns on mobile
      const cols = ["col-docs", "col-notes", "col-links"];
      cols.forEach(c => {
        const el = document.getElementById(c);
        if (el) {
          el.classList.remove("block");
          el.classList.add("hidden", "lg:block"); // keep lg:block for desktop
        }
      });
      
      // Show selected column on mobile
      if (targetElement) {
        targetElement.classList.remove("hidden");
        targetElement.classList.add("block");
      }
      
      // Close dropdown
      dropdown.classList.add("hidden");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCourseDetail();
  initMobileTabs();
});
