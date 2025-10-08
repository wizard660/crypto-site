// server.js (replace your current file with this)
const crypto = require("crypto");
require("dotenv").config();
const fs = require("fs");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const nodemailer = require("nodemailer");

const app = express();

// ---------------- Config & Middleware ----------------
const dataFile = path.join(__dirname, "data.json");
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(morgan("dev"));

// GET forgot password
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { message: null, resetLink: null });
});

app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  let raw = fs.readFileSync("data.json", "utf8");
  let parsed = JSON.parse(raw);

  // Your users are inside the object
  let users = parsed.users;

  if (!users) {
    return res.render("forgot-password", { message: "❌ No users found in database." });
  }

  let user = users.find((u) => u.email === email);

  if (!user) {
    return res.render("forgot-password", { message: "❌ Email not found." });
  }

  // Generate new random password
  const newPassword = crypto.randomBytes(4).toString("hex"); // 8 chars
  user.password = newPassword;

  // Save updated users back to JSON
  parsed.users = users;
  fs.writeFileSync("data.json", JSON.stringify(parsed, null, 2));

  // Email new password to user
  const mailOptions = {
    from: process.env.EMAIL_USER || "no-reply@bittrust.com",
    to: email,
    subject: "Your New Password",
    text: `Hello ${user.name || "User"},\n\nYour new password is: ${newPassword}\n\nPlease keep your new password save.`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error("Email error:", err);
      return res.render("forgot-password", { message: "❌ Could not send email. Try again later." });
    }
    res.render("forgot-password", { message: " A new password has been sent to your email. Check your spam mail also to be sure" });
  });
});



app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret", // change in prod
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------------- JSON read/write helpers ----------------
function ensureDataFile() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ users: [] }, null, 2));
  }
}

function loadData() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data.json:", err);
    return { users: [] };
  }
}

function loadUsers() {
  return loadData().users || [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(dataFile, JSON.stringify({ users }, null, 2));
  } catch (err) {
    console.error("Error writing to data.json:", err);
  }
}

// ---------------- Email transporter (safe) ----------------
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  console.warn(
    "EMAIL_USER / EMAIL_PASS not set — contact form will not send emails. Set these in .env if you want email sending."
  );
}

// ---------------- Routes ----------------

// Homepage
app.get("/", (req, res) => {
  res.render("index", { title: "Crypto Investment MVP" });
});

// Dashboard - always reload users from file so admin edits show up immediately
// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  let users = loadUsers();
  const user = users.find((u) => u.email === req.session.user.email);

  if (!user) return res.redirect("/login");

  // Ensure kycStatus is always defined
  if (!user.kycStatus) {
    user.kycStatus = "none";
  }

  res.render("dashboard", {
    user, // pass the whole user object
    name: user.name,
    package: user.package || "None",
    investment: user.amount || 0,
    profit: user.profit || 0,
    kycStatus: user.kycStatus
  });
});



// Payments
// Payments
app.get("/payments", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  let users = loadUsers();
  const user = users.find((u) => u.email === req.session.user.email);

  if (!user) return res.redirect("/login");

  res.render("payments", {
    package: user.package || "None",
    amount: user.amount || 0
  });
});


// Contact (GET)
app.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact" });
});

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER || email,
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
  };

  if (transporter) {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        return res.json({ success: false, message: "Something went wrong. Try again later." });
      }
      console.log("Email sent:", info.response);
      res.json({ success: true, message: "Thank you for contacting us! We’ll reply soon." });
    });
  } else {
    console.log("Contact form (email not configured):", mailOptions);
    res.json({ success: true, message: "Message received (email not configured)." });
  }
});


// ---------------- Auth: register/login ----------------

// Show register
app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

// Handle register - writes to data.json
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const users = loadUsers();

  if (users.find((u) => u.email === email)) {
    return res.send("User already exists. Please login.");
  }

  const newUser = { name, email, password, package: "None", amount: 0, profit: 0 };
  users.push(newUser);
  saveUsers(users);

  req.session.user = newUser;
  res.redirect("/dashboard");
});

// Show login
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

// Handle login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) return res.send("Invalid email or password.");

  req.session.user = user;
  res.redirect("/dashboard");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ---------------- Start server ----------------
// Withdraw route
app.post("/withdraw", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  // For now, just show a simple message
  res.send("⚠️ Profit can only be withdrawn after the investment period is complete.");
});
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // will save in /uploads folder

// KYC upload route
// Handle KYC form submission
app.post("/kyc", upload.fields([{ name: "frontId" }, { name: "backId" }]), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  let users = loadUsers();
  const userIndex = users.findIndex((u) => u.email === req.session.user.email);

  if (userIndex !== -1) {
    users[userIndex].kycStatus = "pending"; // mark as pending
    saveUsers(users);
    req.session.user = users[userIndex];
  }

  // Redirect with ?submitted=true so popup shows
  res.redirect("/kyc?submitted=true");
});

// server.js
// KYC page
// KYC page
app.get("/kyc", (req, res) => {
  if (!req.session.user) return res.redirect("/dashboard");

  res.render("kyc", {
    user: req.session.user,
    submitted: req.query.submitted || false // show popup if KYC just submitted
  });
});
app.get("/contact", (req, res) => {
  res.render("contact");
});
// Payment routes
app.get("/starter-payments", (req, res) => {
  res.render("payments", {
    package: "Starter"
  });
});

app.get("/bronze-payments", (req, res) => {
  res.render("payments", {
    package: "Bronze"
  });
});

app.get("/silver-payments", (req, res) => {
  res.render("payments", {
    package: "Silver"
  });
});

app.get("/gold-payments", (req, res) => {
  res.render("payments", {
    package: "Gold"
  });
});










//loaderOverlay.classList.add("hidden");
