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
      document.getElementById("exam-dates").innerText =
        `Vize: ${course.vize_date || "Belirlenmedi"} | Final: ${course.final_date || "Belirlenmedi"}`;
    }

    const notesResponse = await fetch(`/api/courses/${courseId}/notes`);
    const notes = await notesResponse.json();

    const pdflist = document.getElementById("pdf-list");
    pdflist.innerHTML = "";

    if (notes.length === 0) {
      pdflist.innerHTML = "<li> Henüz bu derse ait not eklenmedi. </li>";
    }
    notes.forEach((note) => {
      const li = document.createElement("li");
      li.className = `note-item note-${note.note_type}`;

      let contentHtml = "";

      if (note.note_type === "pdf") {
        contentHtml = `
        <span> ${note.title}</span>
        <a href="/uploads/${notes.file_path}" target="_blank"
        class="download-btn"> Open / Download</a>
        `;
      } else if (note.note_type === "image") {
        contentHtml = `
        <div class="image-note">
          <p> ${note.title}</p>
          <img src="/uploads/${note.file_path}" alt="${note.title}"
          style="max-width:100%; border-radius:8px;">
          </div>
          `;
      } else if (note.note_type === "text") {
        contentHtml = `
        <div class="text-note">
          <p> <strong>${note.title}</strong></p>
          <div class="note-body">${note.content}</div>`;
      } else if (note.note_type === "markdown") {
        contentHtml = `
        <div class="text-note markdown-body">
        <p>  <strong>${note.title}</strong></p>
        <div class="note-body">${note.content}</div>
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
