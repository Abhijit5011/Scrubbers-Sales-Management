// Submit form
document.getElementById('form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const name = this.name.value;
  const email = this.email.value;

  await fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });

  this.reset();
  loadData(); // reload the list
});

// Load submitted data from backend
async function loadData() {
  const res = await fetch('/data');
  const data = await res.json();

  const list = document.getElementById('data-list');
  list.innerHTML = ''; // clear old list

  data.forEach(entry => {
    const item = document.createElement('li');
    item.textContent = `${entry.name} - ${entry.email}`;
    list.appendChild(item);
  });
}

// Load data on page load
loadData();
