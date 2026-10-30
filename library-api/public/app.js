
const API_BASE_URL = window.location.port === "5500"
  ? "http://localhost:3000"
  : "";
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" }
});

const tableBody = document.getElementById("booksTableBody");
const bookCount = document.getElementById("bookCount");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");

const loginSection = document.getElementById("loginSection");
const librarianSection = document.getElementById("librarianSection");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const actionsHeader = document.getElementById("actionsHeader");

const bookForm = document.getElementById("bookForm");
const bookIdInput = document.getElementById("bookId");
const bookTitleInput = document.getElementById("bookTitle");
const bookAuthorInput = document.getElementById("bookAuthor");
const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const formIntro = document.getElementById("formIntro");
const idHelp = document.getElementById("idHelp");
const notice = document.getElementById("notice");

let books = [];
let editingBookId = null;
let librarianToken = null;

function showNotice(message, type = "success") {
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = "";
}

function getErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === "ECONNABORTED") return "The API took too long to respond. Please try again.";
  if (!error.response) return "Could not connect to the API. Check that the backend is running.";
  return `Request failed (${error.response.status}). Please try again.`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function setLibrarianMode(isLoggedIn) {
  loginSection.hidden = isLoggedIn;
  librarianSection.hidden = !isLoggedIn;
  actionsHeader.hidden = !isLoggedIn;

  if (!isLoggedIn) {
    resetForm();
  }

  renderBooks();
}

function renderBooks() {
  const query = searchInput.value.trim().toLowerCase();

  const visibleBooks = books.filter(book =>
    String(book.id).includes(query) ||
    String(book.title).toLowerCase().includes(query) ||
    String(book.author).toLowerCase().includes(query)
  );

  bookCount.textContent = books.length;
  resultCount.textContent = `${visibleBooks.length} shown`;

  if (!visibleBooks.length) {
    tableBody.innerHTML = `<tr><td colspan="${librarianToken ? 4 : 3}" class="table-message">${books.length ? "No books match your search." : "No books found in the collection."}</td></tr>`;
    return;
  }

  tableBody.innerHTML = visibleBooks.map(book => `
    <tr>
      <td>${escapeHtml(book.id)}</td>
      <td><div class="book-title">${escapeHtml(book.title)}</div></td>
      <td><span class="book-author">${escapeHtml(book.author)}</span></td>
      ${librarianToken ? `
        <td>
          <div class="row-actions">
            <button class="action-button" type="button" data-action="edit" data-id="${escapeHtml(book.id)}">Edit</button>
            <button class="action-button delete" type="button" data-action="delete" data-id="${escapeHtml(book.id)}">Delete</button>
          </div>
        </td>
      ` : ""}
    </tr>
  `).join("");
}

async function loadBooks({ quiet = false } = {}) {
  if (!quiet) {
    tableBody.innerHTML = '<tr><td colspan="4" class="table-message">Loading your collection…</td></tr>';
  }

  try {
    const response = await api.get("/books");
    books = Array.isArray(response.data) ? response.data : [];
    renderBooks();
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="4" class="table-message">Unable to load books. Check your API connection.</td></tr>';
    bookCount.textContent = "—";
    resultCount.textContent = "";

    if (!quiet) showNotice(getErrorMessage(error), "error");
  }
}

function startEditing(book) {
  clearNotice();

  editingBookId = book.id;
  bookIdInput.value = book.id;
  bookIdInput.disabled = true;
  bookTitleInput.value = book.title;
  bookAuthorInput.value = book.author;

  document.getElementById("formTitle").textContent = "Edit book";
  formIntro.textContent = "Update the title or author, then save your changes.";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  idHelp.textContent = "The ID cannot be changed while editing.";

  bookTitleInput.focus();
  document.querySelector(".form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function resetForm() {
  editingBookId = null;
  bookForm.reset();
  bookIdInput.disabled = false;

  document.getElementById("formTitle").textContent = "Manage books";
  formIntro.textContent = "Add a new title to the library collection.";
  submitButton.textContent = "Add book";
  cancelButton.hidden = true;
  idHelp.textContent = "Use a unique positive number.";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice();

  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  loginButton.disabled = true;
  loginButton.textContent = "Logging in…";

  try {
    const response = await api.post("/login", {
      username,
      password
    });

    librarianToken = response.data.token;

    loginForm.reset();
    setLibrarianMode(true);
    showNotice("Welcome, librarian. You can now manage books.");
  } catch (error) {
    showNotice(getErrorMessage(error), "error");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});

logoutButton.addEventListener("click", () => {
  librarianToken = null;
  resetForm();
  setLibrarianMode(false);
  clearNotice();
  showNotice("You have logged out successfully.");
});

bookForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice();

  if (!librarianToken) {
    showNotice("Please log in as a librarian first.", "error");
    return;
  }

  const title = bookTitleInput.value.trim();
  const author = bookAuthorInput.value.trim();
  const id = Number(bookIdInput.value);

  if (!editingBookId && (!Number.isInteger(id) || id <= 0)) {
    showNotice("Book ID must be a positive whole number.", "error");
    bookIdInput.focus();
    return;
  }

  if (!title || !author) {
    showNotice("Please enter both the title and author.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = editingBookId ? "Saving…" : "Adding…";

  try {
    const config = {
      headers: {
        Authorization: `Bearer ${librarianToken}`
      }
    };

    let response;

    if (editingBookId) {
      response = await api.put(
        `/books/${editingBookId}`,
        { title, author },
        config
      );
    } else {
      response = await api.post(
        "/books",
        { id, title, author },
        config
      );
    }

    showNotice(response.data.message || "Book saved successfully.");
    resetForm();
    await loadBooks({ quiet: true });
  } catch (error) {
    if (error.response?.status === 401) {
      librarianToken = null;
      setLibrarianMode(false);
    }

    showNotice(getErrorMessage(error), "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = editingBookId ? "Save changes" : "Add book";
  }
});

tableBody.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button || !librarianToken) return;

  const id = Number(button.dataset.id);
  const book = books.find(item => item.id === id);

  if (!book) return;

  if (button.dataset.action === "edit") {
    startEditing(book);
    return;
  }

  const confirmed = window.confirm(
    `Delete "${book.title}" by ${book.author}? This cannot be undone.`
  );

  if (!confirmed) return;

  clearNotice();
  button.disabled = true;

  try {
    const response = await api.delete(`/books/${id}`, {
      headers: {
        Authorization: `Bearer ${librarianToken}`
      }
    });

    if (editingBookId === id) resetForm();

    showNotice(response.data.message || "Book deleted successfully.");
    await loadBooks({ quiet: true });
  } catch (error) {
    if (error.response?.status === 401) {
      librarianToken = null;
      setLibrarianMode(false);
    }

    showNotice(getErrorMessage(error), "error");
    button.disabled = false;
  }
});

searchInput.addEventListener("input", renderBooks);

cancelButton.addEventListener("click", () => {
  resetForm();
  clearNotice();
});

document.getElementById("refreshButton").addEventListener("click", () => {
  clearNotice();
  loadBooks();
});

setLibrarianMode(false);
loadBooks();
