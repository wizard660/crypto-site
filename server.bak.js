require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const nodemailer = require("nodemailer");

const app = express();

// ---------------- Middleware ----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(morgan("dev"));
app.use(
  session({
    secret: "supersecret", // ⚠️ use a stronger secret in production
    resave: false,
    saveUninitialized: true,
  })
);

// ---------------- View Engine ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------------- Email Transporter ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------- In-memory Users ----------------
let users = []; // { name, email, password, package, amount, profit }

// ---------------- Routes ----------------

// Homepage
app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.render("dashboard", {
    title: "Dashboard",
    user: req.session.user,
  });
});

// Payments
app.get("/payments", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.render("payments", {
    title: "Payments",
    user: req.session.user,
    btcWallet: "bc1qexamplebtcwalletaddress",
    ethWallet: "0xExampleEthWalletAddress123",
  });
});

// Contact
app.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact" });
});

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER,
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err);
      return res.send("❌ Something went wrong. Please try again later.");
    }
    console.log("Email sent:", info.response);
    res.send("✅ Thank you for contacting us! We’ll reply soon.");
  });
});

// ---------------- Auth ----------------

// Login page
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) return res.send("❌ Invalid email or password.");

  // ✅ Save user in session
  req.session.user = user;
  res.redirect("/dashboard");
});

// Register page
app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (users.find((u) => u.email === email)) {
    return res.send("⚠️ User already exists. Please login.");
  }

  const newUser = { name, email, password, package: "None", amount: 0, profit: 0 };
  users.push(newUser);

  // ✅ Save user in session
  req.session.user = newUser;

  res.redirect("/dashboard");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ---------------- Server ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
