
const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ]
}));
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

const books = [
    {
        id: 1,
        title: "The song of ice and fire",
        author: "G.R.Martin"
    },
    {
        id: 2,
        title: "Dance of dragons",
        author: "G.R.Martin"
    },
    {
        id: 3,
        title: "Game Of Throns",
        author: "G.R.Martin"
    }
];

function checkLibrarian(req, res, next) {
    if (req.query.role !== "librarian") {
        return res.status(403).json({
            message: "Access denied. Only librarians can perform this action."
        });
    }

    next();
}

app.get("/books", (req, res) => {
    res.status(200).json(books);
});

app.get("/books/:id", (req, res) => {
    const id = Number(req.params.id);

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    res.status(200).json(book);
});

app.post("/books", checkLibrarian, (req, res) => {
    const { id, title, author } = req.body;

    if (id === undefined || id === null || id === "") {
        return res.status(400).json({
            message: "ID is required"
        });
    }

    if (!title || !author) {
        return res.status(400).json({
            message: "Title and author are required"
        });
    }

    const bookId = Number(id);

    if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({
            message: "ID must be a positive integer"
        });
    }

    const existingBook = books.find(book => book.id === bookId);

    if (existingBook) {
        return res.status(409).json({
            message: "A book with this ID already exists"
        });
    }

    const newBook = {
        id: bookId,
        title: title,
        author: author
    };

    books.push(newBook);

    res.status(201).json({
        message: "Book added successfully",
        book: newBook
    });
});

app.put("/books/:id", checkLibrarian, (req, res) => {
    const id = Number(req.params.id);

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    const { title, author } = req.body;

    if (!title || !author) {
        return res.status(400).json({
            message: "Title and author are required"
        });
    }

    book.title = title;
    book.author = author;

    res.status(200).json({
        message: "Book updated successfully",
        book: book
    });
});

app.delete("/books/:id", checkLibrarian, (req, res) => {
    const id = Number(req.params.id);

    const bookIndex = books.findIndex(book => book.id === id);

    if (bookIndex === -1) {
        return res.status(404).json({
            message: "Book not found"
        });
    }

    const deletedBook = books.splice(bookIndex, 1)[0];

    res.status(200).json({
        message: "Book deleted successfully",
        book: deletedBook
    });
});

app.listen(3000, () => {
    console.log("Library API is running on port 3000");
});
