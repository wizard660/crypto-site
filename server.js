// ------------------ Imports & Config ------------------
require("dotenv").config();
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const multer = require("multer");
const mongoose = require("mongoose");

const crypto = require("crypto");

const app = express();
const SibApiV3Sdk = require("sib-api-v3-sdk");
const Account = require("./models/User"); // renamed to avoid conflict


const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY; // from your .env (xkeysib...)
const brevoApi = new SibApiV3Sdk.TransactionalEmailsApi();

// ------------------ Middleware ------------------

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(morgan("dev"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

// ------------------ MongoDB Setup ------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Define schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  package: String,
  amount: Number,
  profit: Number,
  kycStatus: String,
  frontId: String,
  backId: String,
});

const User = mongoose.model("User", userSchema);

// ------------------ Brevo SMTP Setup ------------------
/*const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true, // use TLS
  auth: {
    user: process.env.EMAIL_USER, // your Brevo login email
    pass: process.env.EMAIL_PASS, // your Brevo SMTP key
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP connection successful!");
  }
});*/



// ------------------ KYC Upload ------------------
const upload = multer({ dest: "uploads/" });

// ------------------ Routes ------------------

// Homepage
app.get("/", (req, res) => res.render("index", { title: "Crypto Investment" }));

// Register
app.get("/register", (req, res) => res.render("register", { title: "Register" }));
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.send("User already exists. Please login.");

  const newUser = new User({ name, email, password, package: "None", amount: 0, profit: 0 });
  await newUser.save();
  req.session.user = newUser;
  res.redirect("/dashboard");
});

// Login
app.get("/login", (req, res) => res.render("login", { title: "Login" }));
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.send("Invalid email or password.");
  req.session.user = user;
  res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const user = await User.findOne({ email: req.session.user.email });
  if (!user) return res.redirect("/login");
  res.render("dashboard", {
    user, // pass the whole user object
    name: user.name,
    package: user.package || "None",
    investment: user.amount || 0,
    profit: user.profit || 0,
    kycStatus: user.kycStatus
  });
});

// KYC Upload
app.get("/kyc", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("kyc", { user: req.session.user, submitted: req.query.submitted || false });
});

app.post("/kyc", upload.fields([{ name: "frontId" }, { name: "backId" }]), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const user = await User.findOne({ email: req.session.user.email });
  if (!user) return res.redirect("/login");

  user.kycStatus = "pending";
  if (req.files["frontId"]) user.frontId = req.files["frontId"][0].filename;
  if (req.files["backId"]) user.backId = req.files["backId"][0].filename;
  await user.save();

  req.session.user = user;
  res.redirect("/kyc?submitted=true");
});

// Dependencies

// ======================
// ✅ FORGOT PASSWORD
// ======================
app.get("/forgot-password", (req, res) =>
  res.render("forgot-password", { message: null })
);

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await Account.findOne({ email });

  if (!user)
    return res.render("forgot-password", { message: "❌ Email not found." });

  const newPassword = crypto.randomBytes(4).toString("hex");
  user.password = newPassword;
  await user.save();

  const emailData = {
    sender: { email: process.env.EMAIL_FROM, name: "BitTrust" },
    to: [{ email }],
    subject: "Your New Password",
    htmlContent: `
      <p>Hello ${user.name || "User"},</p>
      <p>Your new password is: <strong>${newPassword}</strong></p>
      <p>Please log in and change it immediately for security reasons.</p>
      <br>
      <p>– The BitTrust Team</p>
    `,
  };

  try {
    await brevoApi.sendTransacEmail(emailData);
    res.render("forgot-password", {
      message: "✅ A new password has been sent to your email.",
    });
  } catch (err) {
    console.error("❌ Brevo send error:", err);
    res.render("forgot-password", {
      message: "❌ Failed to send email. Try again later.",
    });
  }
});

// ======================
// ✅ CONTACT FORM (server.js)
// ======================
app.use(express.static("public"));

app.get("/contact", (req, res) =>
  res.render("contact", { title: "Contact" })
);

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  const emailData = {
    sender: { email: process.env.EMAIL_FROM, name: "BitTrust Contact Form" },
    to: [{ email: process.env.EMAIL_USER }],
    subject: `New Contact Form Submission from ${name}`,
    htmlContent: `
      <h3>New Message from ${name}</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  };

  try {
    await brevoApi.sendTransacEmail(emailData);
    console.log("✅ Contact email sent successfully");
    res.json({
      success: true,
      message: "Thank you for contacting us! We’ll reply soon.",
    });
  } catch (err) {
    console.error("❌ Contact form error:", err);
    res.json({
      success: false,
      message: "Something went wrong. Try again later.",
    });
  }
});




// Withdraw
app.post("/withdraw", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.send("⚠️ Profit can only be withdrawn after investment period is complete.");
});

// Payment Routes
app.get("/starter-payments", (req, res) => res.render("payments", { package: "Starter" }));
app.get("/bronze-payments", (req, res) => res.render("payments", { package: "Bronze" }));
app.get("/silver-payments", (req, res) => res.render("payments", { package: "Silver" }));
app.get("/gold-payments", (req, res) => res.render("payments", { package: "Gold" }));

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
