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
      document.getElementById("course-name").textContent = course.name;
      const examDatesEl = document.getElementById("exam-dates");
      examDatesEl.innerHTML = "";
      
      const vizeSpan = document.createElement("span");
      vizeSpan.className = "mr-6 inline-flex border-r border-gray-700 pr-6";
      vizeSpan.innerHTML = '<i class="fas fa-calendar-alt text-primary mr-2"></i>Vize: <span class="text-gray-200 ml-1 font-semibold"></span>';
      vizeSpan.querySelector("span").textContent = course.vize_date || "Belirlenmedi";
      examDatesEl.appendChild(vizeSpan);
      
      const finalSpan = document.createElement("span");
      finalSpan.className = "inline-flex";
      finalSpan.innerHTML = '<i class="fas fa-calendar-check text-secondary mr-2"></i>Final: <span class="text-gray-200 ml-1 font-semibold"></span>';
      finalSpan.querySelector("span").textContent = course.final_date || "Belirlenmedi";
      examDatesEl.appendChild(finalSpan);
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
        let icon = "fas fa-file-alt";
        let iconColor = "text-primary";
        
        if (note.note_type === "pdf") { icon = "fas fa-file-pdf"; iconColor = "text-red-400"; }
        else if (note.note_type === "image") { icon = "fas fa-file-image"; iconColor = "text-green-400"; }
        else if (note.note_type === "markdown" || note.note_type === "text") { icon = "fas fa-file-code"; iconColor = "text-yellow-400"; }
        else if (note.note_type === "link") { icon = "fas fa-link"; iconColor = "text-blue-400"; }

        // Secure header building without innerHTML for note.title
        const createHeader = (isAccordion = false) => {
          const wrapper = document.createElement("div");
          wrapper.className = `px-5 py-3 ${isAccordion ? '' : 'bg-cardhover/50'} border-b border-gray-800 flex items-center justify-between gap-4`;
          
          const h3 = document.createElement("h3");
          h3.className = "text-base font-semibold text-white flex items-center gap-3";
          h3.innerHTML = `<i class="${icon} ${iconColor} text-lg w-5 text-center"></i>`;
          h3.appendChild(document.createTextNode(" " + note.title));
          wrapper.appendChild(h3);
          
          if (!isAccordion && note.note_type !== 'markdown' && note.note_type !== 'text') {
             const badgeSpan = document.createElement("span");
             badgeSpan.className = "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700";
             badgeSpan.textContent = note.note_type;
             wrapper.appendChild(badgeSpan);
          } else if (isAccordion) {
             const chevron = document.createElement("i");
             chevron.className = "fas fa-chevron-down text-gray-500 transition-transform group-open:rotate-180";
             wrapper.appendChild(chevron);
          }
          return wrapper;
        };

        if (note.note_type === "pdf" || note.note_type === "image") {
          hasDocs = true;
          const li = document.createElement("div");
          li.className = "bg-cardbg rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors shadow-sm mb-4";
          li.appendChild(createHeader(false));
          
          const contentDiv = document.createElement("div");
          if (note.note_type === "pdf") {
            contentDiv.className = "px-5 py-4 flex flex-col gap-3 bg-black/5";
            const a = document.createElement("a");
            a.href = `/uploads/${course.slug}/${note.file_path}`;
            a.target = "_blank";
            a.className = "w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background font-semibold rounded-lg transition-all duration-300 text-sm";
            a.innerHTML = '<i class="fas fa-external-link-alt"></i> Aç / İndir';
            contentDiv.appendChild(a);
          } else {
            contentDiv.className = "p-4 flex justify-center bg-black/20";
            const img = document.createElement("img");
            img.src = `/uploads/${course.slug}/${note.file_path}`;
            img.alt = note.title;
            img.className = "max-w-full rounded-md border border-gray-700";
            contentDiv.appendChild(img);
          }
          li.appendChild(contentDiv);
          pdfList.appendChild(li);
        } else if (note.note_type === "text" || note.note_type === "markdown") {
          hasNotes = true;
          const details = document.createElement("details");
          details.className = "group bg-cardbg rounded-xl border border-gray-800 mb-4 overflow-hidden [&_summary::-webkit-details-marker]:hidden";
          
          const summary = document.createElement("summary");
          summary.className = "cursor-pointer list-none select-none transition-colors hover:bg-cardhover/20";
          summary.appendChild(createHeader(true));
          details.appendChild(summary);
          
          const contentDiv = document.createElement("div");
          contentDiv.className = "p-4 md:p-6 text-gray-300 leading-relaxed bg-black/10 border-t border-gray-800";
          const proseDiv = document.createElement("div");
          proseDiv.className = "prose prose-invert prose-rose max-w-none prose-img:rounded-lg prose-img:border prose-img:border-gray-700 prose-img:shadow-md prose-headings:border-b prose-headings:border-gray-800 prose-headings:pb-1 prose-headings:mb-2 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-p:leading-snug";
          proseDiv.innerHTML = note.content;
          contentDiv.appendChild(proseDiv);
          details.appendChild(contentDiv);
          mdList.appendChild(details);
        } else if (note.note_type === "link") {
          hasLinks = true;
          const li = document.createElement("div");
          li.className = "bg-cardbg rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors shadow-sm mb-4";
          li.appendChild(createHeader(false));
          
          const contentDiv = document.createElement("div");
          contentDiv.className = "px-5 py-4 bg-black/5";
          const a = document.createElement("a");
          let href = note.content.trim();
          if(href.toLowerCase().startsWith("javascript:")) { href = "#"; }
          a.href = href;
          a.target = "_blank";
          a.className = "break-all text-sm text-blue-400 hover:text-blue-300 hover:underline inline-flex items-start gap-2";
          
          const iconLink = document.createElement("i");
          iconLink.className = "fas fa-globe mt-1 shrink-0";
          a.appendChild(iconLink);
          a.appendChild(document.createTextNode(" " + note.content.trim()));
          
          contentDiv.appendChild(a);
          li.appendChild(contentDiv);
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
      
      // Hide all columns on all breakpoints and just show the selected one
      const cols = ["col-docs", "col-notes", "col-links"];
      cols.forEach(c => {
        const el = document.getElementById(c);
        if (el) {
          el.classList.remove("block");
          el.classList.add("hidden"); 
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
