// public/js/script.js

// Wait until DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("Client-side script loaded ✅");

  // --- Validate Login Form ---
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      const email = loginForm.querySelector("input[name='email']").value.trim();
      const password = loginForm.querySelector("input[name='password']").value.trim();

      if (!email || !password) {
        e.preventDefault();
        alert("⚠️ Please enter both email and password.");
      }
    });
  }

  // --- Validate Register Form ---
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      const name = registerForm.querySelector("input[name='name']").value.trim();
      const email = registerForm.querySelector("input[name='email']").value.trim();
      const password = registerForm.querySelector("input[name='password']").value.trim();

      if (!name || !email || !password) {
        e.preventDefault();
        alert("⚠️ All fields are required.");
      }
    });
  }

  // --- Validate Contact Form ---
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      const name = contactForm.querySelector("input[name='name']").value.trim();
      const email = contactForm.querySelector("input[name='email']").value.trim();
      const message = contactForm.querySelector("textarea[name='message']").value.trim();

      if (!name || !email || !message) {
        e.preventDefault();
        alert("⚠️ Please fill in all fields.");
      }
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chat-notification");

  // Random usernames + amounts
  const users = [
    "Alice_W", "CryptoKing", "Investor99", "Liam_P", "Sophia_T",
    "ElonX", "Maya_Trader", "JakeM", "Olivia_C", "DanielZ","chris155",
    "lisabecks","darell","johnson22","emilylockwood","tyla001","elinafords","richard",
    "jasonmiller1","norah555"
  ];

  function getRandomUser() {
    const name = users[Math.floor(Math.random() * users.length)];
    const amount = Math.floor(Math.random() * (50000 - 1000 + 1)) + 1000;
    return `${name} just withdrew $${amount.toLocaleString()}`;
  }

  function showNotification() {
    chatBox.textContent = getRandomUser();
    chatBox.style.opacity = "1"; // fade in

    // Hide after 10s
    setTimeout(() => {
      chatBox.style.opacity = "0"; // fade out
    }, 10000);

    // Schedule next notification with random delay (5–15s)
    const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    setTimeout(showNotification, 10000 + delay);
  }

  // Start first notification after 2s
  setTimeout(showNotification, 2000);
});
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader-overlay");

  // Hide loader once page fully loads
  window.addEventListener("load", () => {
    loader.style.display = "none";
  });

  // Show loader when clicking links or submitting forms
  document.querySelectorAll("a, form").forEach(el => {
    if (el.tagName === "A") {
      el.addEventListener("click", () => {
        loader.style.display = "flex";
      });
    } else if (el.tagName === "FORM") {
      el.addEventListener("submit", () => {
        loader.style.display = "flex";
      });
    }
  });

  // Custom buttons (add class="trigger-loader" to any button or link you want)
  document.querySelectorAll(".trigger-loader").forEach(button => {
    button.addEventListener("click", () => {
      loader.style.display = "flex";
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");
  const confirmationCard = document.getElementById("confirmationCard");
  const closeConfirmation = document.getElementById("closeConfirmation");
  const loaderOverlay = document.getElementById("loader-overlay");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);

      // Show loader
      loaderOverlay.classList.remove("hidden");

      try {
        const response = await fetch("/contact", {
          method: "POST",
          body: formData
        });

        const result = await response.json();

        // Hide loader after response
        loaderOverlay.classList.add("hidden");

        if (result.success) {
          confirmationCard.querySelector("p").textContent = result.message;
          confirmationCard.classList.remove("hidden");
          contactForm.reset();
        } else {
          alert(result.message || "❌ Something went wrong.");
        }
      } catch (err) {
        loaderOverlay.classList.add("hidden");
        alert("⚠️ Network error, please try again.");
      }
    });
  }

  if (closeConfirmation) {
    closeConfirmation.addEventListener("click", () => {
      confirmationCard.classList.add("hidden");
      loaderOverlay.classList.add("hidden"); // stop loader glow
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const faqCards = document.querySelectorAll(".faq-card");

  faqCards.forEach((card) => {
    card.addEventListener("click", () => {
      // close other open cards
      faqCards.forEach((c) => c.classList.remove("active"));
      // open clicked one
      card.classList.add("active");
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const returnBtn = document.querySelector(".return-btn");

  if (returnBtn) {
    returnBtn.addEventListener("click", () => {
      window.history.back();
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const confirmBtn = document.getElementById("confirmPaymentBtn");
  const transferAmount = document.getElementById("transferAmount");
  const confirmationBox = document.getElementById("confirmationBox");
  const finalAmount = document.getElementById("finalAmount");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const amount = transferAmount.value;
      if (amount && amount > 0) {
        finalAmount.textContent = `$${amount}`;
        confirmationBox.classList.remove("hidden");
      } else {
        alert("⚠ Please enter a valid amount.");
      }
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const paymentBtn = document.getElementById("paymentSentBtn");
  const modal = document.getElementById("paymentModal");
  const doneBtn = document.getElementById("doneBtn");

  // Show modal when "Payment Sent" is clicked
  if (paymentBtn) {
    paymentBtn.addEventListener("click", () => {
      modal.style.display = "flex";
    });
  }

  // Redirect to dashboard on "Done"
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      window.location.href = "/dashboard"; // adjust your dashboard route
    });
  }

  // Optional: close modal if user clicks outside card
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const popup = document.querySelector(".popup");
  const closeBtn = document.querySelector(".popup-close");

  if (popup && closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.classList.remove("active");
    });
  }
});








//loaderOverlay.classList.add("hidden");
