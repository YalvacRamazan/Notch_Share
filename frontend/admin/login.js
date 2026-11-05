async function handleLogin(event) {
  event.preventDefault();
  const errorEl = document.getElementById("login-error");
  const button = event.target.querySelector("button[type=submit]");
  errorEl.hidden = true;

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (!username || !password) {
    errorEl.textContent = "Kullanıcı adı ve parola gerekli.";
    errorEl.hidden = false;
    return;
  }

  button.disabled = true;
  try {
    const response = await fetch("/admin/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      window.location.href = "/admin/panel";
      return;
    }
    const data = await response.json().catch(() => ({}));
    errorEl.textContent = data.detail || "Giriş başarısız. Bilgilerinizi kontrol edin.";
    errorEl.hidden = false;
  } catch {
    errorEl.textContent = "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.";
    errorEl.hidden = false;
  } finally {
    button.disabled = false;
  }
}

document.getElementById("login-form").addEventListener("submit", handleLogin);
