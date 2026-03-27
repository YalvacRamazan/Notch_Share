async function loadCourses() {
  const response = await fetch("/api/courses");
  const courses = await response.json();

  const grid = document.getElementById("course-grid");
  grid.innerHTML = "";

  courses.forEach((course) => {
    const card = document.createElement("div");
    card.className = "course-card";
    card.innerHTML = `
    <h3>${course.name}</h3>
    <p>Slug: ${course.slug}</p>
    <button onclick="location.href='/static/course.html?id=${course.id}'">Notlara Git</button>`;
    grid.appendChild(card);
  });
}

loadCourses();
