async function loadCourses() {
  const response = await fetch("/api/courses");
  const courses = await response.json();

  const grid = document.getElementById("course-grid");
  grid.innerHTML = "";

  courses.forEach((course) => {
    const card = document.createElement("div");
    card.className = "group relative bg-cardbg rounded-2xl p-6 border border-gray-800 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,209,255,0.15)] hover:-translate-y-1 cursor-pointer flex flex-col h-full";
    card.innerHTML = `
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div class="flex-grow">
        <div class="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-6 text-2xl text-primary group-hover:scale-110 transition-transform duration-300">
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
    
    // Make entire card clickable for better UX
    card.addEventListener('click', () => {
      location.href = `/static/course.html?id=${course.id}`;
    });
    
    grid.appendChild(card);
  });
}

loadCourses();
