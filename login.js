// Demo users (a real application would check these on a server)
const USERS = [
  { email: 'admin@northwind.com', password: 'Admin@123', name: 'Admin User',        role: 'Administrator' },
  { email: 'buyer@northwind.com', password: 'Buyer@123', name: 'Procurement Buyer', role: 'Buyer' }
];
const SESSION_KEY = 'nw_user';
const $ = id => document.getElementById(id);

// Already signed in? Go straight to the store.
try {
  if (sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)) location.replace('store.html');
} catch (e) {}

// Show / hide password
$('toggle').onclick = () => {
  const show = $('pwd').type === 'password';
  $('pwd').type = show ? 'text' : 'password';
  $('toggle').textContent = show ? 'Hide' : 'Show';
  $('toggle').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};

$('forgot').onclick = e => {
  e.preventDefault();
  alert('Password reset is not available in this demo. Contact your administrator.');
};

function validate() {
  const email = $('email').value.trim(), pwd = $('pwd').value;
  let ok = true;
  ['emailErr', 'pwdErr'].forEach(i => $(i).textContent = '');
  ['email', 'pwd'].forEach(i => $(i).classList.remove('bad'));

  if (!email) {
    $('emailErr').textContent = 'Enter your work email.';
    $('email').classList.add('bad'); ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $('emailErr').textContent = 'Enter a valid email, for example name@company.com.';
    $('email').classList.add('bad'); ok = false;
  }
  if (!pwd) {
    $('pwdErr').textContent = 'Enter your password.';
    $('pwd').classList.add('bad'); ok = false;
  } else if (pwd.length < 6) {
    $('pwdErr').textContent = 'Password must be at least 6 characters.';
    $('pwd').classList.add('bad'); ok = false;
  }
  return ok;
}

$('form').addEventListener('submit', e => {
  e.preventDefault();
  $('alert').hidden = true;
  if (!validate()) return;

  const email = $('email').value.trim().toLowerCase(), pwd = $('pwd').value;
  $('submit').disabled = true;
  $('submit').textContent = 'Signing in...';

  setTimeout(() => {
    const u = USERS.find(x => x.email === email && x.password === pwd);
    if (!u) {
      $('alert').textContent = 'Incorrect email or password. Check your details and try again.';
      $('alert').hidden = false;
      $('submit').disabled = false;
      $('submit').textContent = 'Sign in';
      return;
    }
    const session = JSON.stringify({ email: u.email, name: u.name, role: u.role });
    try { ($('remember').checked ? localStorage : sessionStorage).setItem(SESSION_KEY, session); } catch (err) {}
    location.href = 'store.html';
  }, 600);
});