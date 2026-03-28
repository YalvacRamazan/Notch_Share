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

    const pdflist = document.getElementById("pdf-list");
    pdflist.innerHTML = "";

    if (notes.length === 0) {
      pdflist.innerHTML = `
        <div class="text-center py-16 px-4 bg-cardbg rounded-2xl border border-gray-800">
          <div class="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-gray-500">
            <i class="far fa-folder-open"></i>
          </div>
          <p class="text-gray-400 font-medium text-lg">Henüz bu derse ait not eklenmedi.</p>
          <p class="text-gray-600 text-sm mt-2">İleride eklenecektir, lütfen tekrar kontrol edin.</p>
        </div>
      `;
    }

    notes.forEach((note) => {
      const li = document.createElement("li");
      li.className = "bg-cardbg rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors shadow-sm";

      let contentHtml = "";
      
      let icon = "fas fa-file-alt";
      let iconColor = "text-primary";
      
      if (note.note_type === "pdf") { icon = "fas fa-file-pdf"; iconColor = "text-red-400"; }
      else if (note.note_type === "image") { icon = "fas fa-file-image"; iconColor = "text-green-400"; }
      else if (note.note_type === "markdown" || note.note_type === "text") { icon = "fas fa-file-code"; iconColor = "text-yellow-400"; }

      const headerHtml = `
        <div class="px-6 py-4 bg-cardhover/50 border-b border-gray-800 flex items-center justify-between gap-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-3">
            <i class="${icon} ${iconColor} text-xl w-6 text-center"></i>
            ${note.title}
          </h3>
          <span class="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700">
            ${note.note_type}
          </span>
        </div>
      `;

      if (note.note_type === "pdf") {
        contentHtml = `
        ${headerHtml}
        <div class="px-6 py-6 flex justify-between items-center bg-black/5">
          <span class="text-gray-400 text-sm"><i class="fas fa-info-circle mr-2"></i>PDF Belgesi</span>
          <a href="/uploads/${course.slug}/${note.file_path}" target="_blank" class="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background font-semibold rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(225,29,72,0.1)] hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <i class="fas fa-external-link-alt"></i> Aç / İndir
          </a>
        </div>
        `;
      } else if (note.note_type === "image") {
        contentHtml = `
        ${headerHtml}
        <div class="p-6 flex justify-center bg-black/20">
          <img src="/uploads/${course.slug}/${note.file_path}" alt="${note.title}" class="max-w-full rounded-lg border border-gray-700 shadow-md">
        </div>
        `;
      } else if (note.note_type === "text" || note.note_type === "markdown") {
        contentHtml = `
        ${headerHtml}
        <div class="p-6 text-gray-300 leading-relaxed bg-black/10">
          <div class="prose prose-invert prose-rose max-w-none">
            ${note.content}
          </div>
        </div>
        `;
      }
      
      li.innerHTML = contentHtml;
      pdflist.appendChild(li);
    });
  } catch (error) {
    console.error("Hata:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadCourseDetail);
