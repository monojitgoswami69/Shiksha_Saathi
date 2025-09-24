const toggleCheckbox = document.querySelector('.theme-switch__checkbox');
const body = document.body;

// Function to apply the theme
function applyTheme(theme) {
  if (theme === 'dark') {
    body.classList.add('dark-mode');
    toggleCheckbox.checked = true;
  } else {
    body.classList.remove('dark-mode');
    toggleCheckbox.checked = false;
  }
}

// Apply theme on initial load
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

// Add event listener for theme toggle
toggleCheckbox.addEventListener('change', () => {
  const newTheme = toggleCheckbox.checked ? 'dark' : 'light';
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
});

// Add login redirect
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (
      username === 'aot169' &&
      email === 'academy@aot.edu.in' &&
      password === '1234'
    ) {
      window.location.href = 'admin_dashboard.html';
    } else {
      alert('Invalid credentials. Please try again.');
    }
  });
}