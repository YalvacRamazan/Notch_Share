function createExamDate(label, date) {
  const wrapper = document.createElement("div");
  wrapper.className = "exam-date";

  const title = document.createElement("span");
  title.className = "exam-date-label";
  title.textContent = label;

  const value = document.createElement("span");
  value.className = date ? "exam-date-value" : "exam-date-value is-unset";
  value.textContent = date || "Belirlenmedi";

  wrapper.append(title, value);
  return wrapper;
}

function renderCourses(courses) {
  const grid = document.getElementById("course-grid");
  const modalList = document.getElementById("modal-exam-list");
  grid.replaceChildren();
  modalList.replaceChildren();

  if (courses.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Henüz arşive ders eklenmemiş.";
    grid.appendChild(empty);
    modalList.appendChild(empty.cloneNode(true));
    return;
  }

  courses.forEach((course, index) => {
    const card = document.createElement("a");
    card.className = "course-card";
    card.href = `/static/course.html?id=${encodeURIComponent(course.id)}`;

    const number = document.createElement("span");
    number.className = "course-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const icon = document.createElement("span");
    icon.className = "course-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<i class="fas fa-book-open"></i>';

    const title = document.createElement("h3");
    title.className = "course-title";
    title.textContent = course.name;

    const slug = document.createElement("p");
    slug.className = "course-slug";
    slug.textContent = course.slug;

    const action = document.createElement("span");
    action.className = "course-action";
    action.innerHTML = 'İçerikleri görüntüle <i class="fas fa-arrow-right" aria-hidden="true"></i>';

    card.append(number, icon, title, slug, action);
    grid.appendChild(card);

    const exam = document.createElement("article");
    exam.className = "exam-item";
    const examTitle = document.createElement("h3");
    examTitle.className = "exam-course-name";
    examTitle.textContent = course.name;
    const dates = document.createElement("div");
    dates.className = "exam-dates-grid";
    dates.append(createExamDate("Vize", course.vize_date), createExamDate("Final", course.final_date));
    exam.append(examTitle, dates);
    modalList.appendChild(exam);
  });
}

async function loadCourses() {
  const grid = document.getElementById("course-grid");
  try {
    const response = await fetch("/api/courses");
    if (!response.ok) throw new Error("Ders listesi alınamadı.");
    const courses = await response.json();
    renderCourses(courses);
  } catch (error) {
    console.error("Dersler yüklenemedi:", error);
    grid.innerHTML = '<p class="empty-message">Dersler yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>';
    document.getElementById("modal-exam-list").innerHTML = '<p class="empty-message">Sınav takvimi alınamadı. Sayfayı yenileyip tekrar deneyin.</p>';
  }
}

function initExamModal() {
  const modal = document.getElementById("exam-modal");
  const openButton = document.getElementById("exam-schedule-btn");
  const closeButton = document.getElementById("close-modal-btn");

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.classList.add("is-closed");
    openButton.focus();
  };

  openButton.addEventListener("click", () => {
    modal.classList.remove("is-closed");
    modal.classList.add("is-open");
    closeButton.focus();
  });
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initExamModal();
  loadCourses();
});
