async function loadCourses() {
  const response = await fetch("/api/courses");
  const courses = await response.json();

  const grid = document.getElementById("course-grid");
  grid.innerHTML = "";

  courses.forEach((course) => {
    const card = document.createElement("div");
    card.className = "group relative bg-cardbg rounded-2xl p-6 border border-gray-800 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(225,29,72,0.15)] hover:-translate-y-1 cursor-pointer flex flex-col h-full";
    card.innerHTML = `
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div class="flex-grow">
        <div class="w-12 h-12 bg-gray-800/80 rounded-lg flex items-center justify-center mb-6 text-2xl text-primary group-hover:scale-110 transition-transform duration-300">
          <i class="fas fa-book-open"></i>
        </div>
        <h3 class="text-xl font-bold text-white mb-2 leading-tight">${course.name}</h3>
        <p class="text-gray-400 text-sm mb-6 flex items-center"><i class="fas fa-tag mr-2 opacity-50"></i>${course.slug}</p>
      </div>
      
      <div class="mt-auto pt-6 border-t border-gray-800 flex items-center justify-between text-sm font-medium text-gray-300">
        <span class="group-hover:text-primary transition-colors">İçeriklere Git</span>
        <i class="fas fa-arrow-right text-gray-600 group-hover:text-primary transform group-hover:translate-x-1 transition-all"></i>
      </div>
    `;
    
    // Add click event listener to the whole card
    card.addEventListener('click', () => {
      location.href = `/static/course.html?id=${course.id}`;
    });
    
    grid.appendChild(card);
  });

  // Populate Modal
  const modalList = document.getElementById("modal-exam-list");
  if (modalList) {
    modalList.innerHTML = "";
    if (courses.length === 0) {
      modalList.innerHTML = `<div class="text-center text-gray-500 text-sm py-8">Henüz ders bulunmamaktadır.</div>`;
    } else {
      courses.forEach((course) => {
        const item = document.createElement("div");
        item.className = "bg-black/30 p-4 rounded-xl border border-gray-800/50 hover:border-primary/30 transition-colors";
        
        const vize = course.vize_date || "Belirlenmedi";
        const final = course.final_date || "Belirlenmedi";
        
        item.innerHTML = `
          <h4 class="text-white font-semibold mb-3 flex items-center"><i class="fas fa-book text-gray-500 mr-2"></i>${course.name}</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-cardbg/80 rounded-lg p-3 border border-gray-800">
              <p class="text-gray-400 text-xs mb-1 uppercase tracking-wider"><i class="fas fa-clock text-primary mr-1.5"></i>Vize</p>
              <p class="text-sm font-medium ${vize === 'Belirlenmedi' ? 'text-gray-500' : 'text-gray-200'}">${vize}</p>
            </div>
            <div class="bg-cardbg/80 rounded-lg p-3 border border-gray-800">
              <p class="text-gray-400 text-xs mb-1 uppercase tracking-wider"><i class="fas fa-flag-checkered text-secondary mr-1.5"></i>Final</p>
              <p class="text-sm font-medium ${final === 'Belirlenmedi' ? 'text-gray-500' : 'text-gray-200'}">${final}</p>
            </div>
          </div>
        `;
        modalList.appendChild(item);
      });
    }
  }
}

// Modal Toggle Logic
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("exam-modal");
  const modalContent = document.getElementById("exam-modal-content");
  const openBtn = document.getElementById("exam-schedule-btn");
  const closeBtn = document.getElementById("close-modal-btn");

  if (openBtn && modal) {
    const openModal = () => {
      modal.classList.remove("opacity-0", "pointer-events-none");
      modalContent.classList.remove("scale-95");
      modalContent.classList.add("scale-100");
    };

    const closeModal = () => {
      modal.classList.add("opacity-0", "pointer-events-none");
      modalContent.classList.remove("scale-100");
      modalContent.classList.add("scale-95");
    };

    openBtn.addEventListener("click", openModal);
    
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("opacity-0")) {
        closeModal();
      }
    });
  }
});

loadCourses();
