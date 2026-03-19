// supabase/functions/auth-redirect/index.ts
// Serves an HTML redirect page for email confirmation deep links.
// On mobile: auto-opens the Vestigia app via vestigia://confirm
// On desktop: shows a "please open on your phone" message

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vestigia — Confirm Email</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #050d1a;
      background-image:
        radial-gradient(ellipse 60% 50% at 10% 5%, rgba(0,128,200,0.12) 0%, transparent 70%),
        radial-gradient(ellipse 50% 45% at 90% 90%, rgba(20,176,142,0.08) 0%, transparent 70%);
      color: #e8f0fe;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: rgba(13, 25, 48, 0.7);
      border: 1px solid rgba(56, 100, 160, 0.3);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 0 40px rgba(0,128,200,0.08), 0 20px 60px rgba(0,0,0,0.5);
    }

    .logo-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: rgba(15, 30, 60, 0.5);
      border: 1.5px solid rgba(56, 130, 200, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 0 24px rgba(0,128,200,0.3);
      font-size: 36px;
    }

    .app-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #e8f0fe;
      margin-bottom: 6px;
    }

    .tagline {
      font-size: 12px;
      color: #4d6a96;
      letter-spacing: 0.4px;
      margin-bottom: 36px;
    }

    .divider {
      height: 1px;
      background: rgba(56, 100, 160, 0.3);
      margin-bottom: 28px;
    }

    /* ── Mobile state ── */
    #view-mobile { display: none; }

    .icon-check {
      font-size: 52px;
      margin-bottom: 16px;
    }

    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #e8f0fe;
      margin-bottom: 10px;
    }

    .subtext {
      font-size: 14px;
      color: #94afd4;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #1a9ee0, #0080c8);
      color: #fff;
      border: none;
      border-radius: 14px;
      padding: 16px 36px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      letter-spacing: 0.3px;
      box-shadow: 0 0 20px rgba(0,128,200,0.4);
      transition: opacity 0.2s, transform 0.1s;
    }

    .btn:hover { opacity: 0.88; }
    .btn:active { transform: scale(0.97); }

    .hint {
      font-size: 11px;
      color: #4d6a96;
      margin-top: 16px;
      line-height: 1.6;
    }

    /* ── Desktop state ── */
    #view-desktop { display: none; }

    .phone-icon {
      font-size: 52px;
      margin-bottom: 16px;
    }

    .desktop-note {
      font-size: 14px;
      color: #94afd4;
      line-height: 1.7;
      margin-bottom: 0;
    }

    .desktop-note strong {
      color: #40b4f5;
      font-weight: 600;
    }

    .badge {
      display: inline-block;
      background: rgba(0,128,200,0.12);
      border: 1px solid rgba(56,130,200,0.3);
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 11px;
      color: #40b4f5;
      letter-spacing: 0.5px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">◈</div>
    <div class="app-name">Vestigia</div>
    <div class="tagline">DIABETIC PERIPHERAL NEUROPATHY SCREENING</div>
    <div class="divider"></div>

    <!-- Mobile view -->
    <div id="view-mobile">
      <div class="icon-check">✓</div>
      <div class="heading">Email Confirmed</div>
      <p class="subtext" id="mobile-subtext">
        Your account is ready. Opening the app now…
      </p>
      <a id="open-btn" class="btn" href="#">Open Vestigia</a>
      <p class="hint">
        If the app doesn't open automatically,<br>tap the button above.
      </p>
    </div>

    <!-- Desktop view -->
    <div id="view-desktop">
      <div class="phone-icon">📱</div>
      <div class="heading">Open on Your Phone</div>
      <p class="desktop-note">
        This confirmation link is meant to be opened on your
        <strong>mobile device</strong> with the Vestigia app installed.<br><br>
        Please open this email on your phone and tap the link there.
      </p>
      <div class="badge">MOBILE APP ONLY</div>
    </div>
  </div>

  <script>
    (function () {
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Carry all tokens through to the app.
      // Implicit flow puts them in the hash (#access_token=...).
      // PKCE flow puts the code in the query string (?code=...).
      var suffix = window.location.hash || window.location.search || "";
      var deepLink = "vestigia://confirm" + suffix;

      if (isMobile) {
        document.getElementById("view-mobile").style.display = "block";
        document.getElementById("open-btn").href = deepLink;

        // Attempt to open the app immediately
        window.location.href = deepLink;

        // After 2.5s update the message in case it didn't auto-open
        setTimeout(function () {
          document.getElementById("mobile-subtext").textContent =
            "Tap the button below to open Vestigia.";
        }, 2500);
      } else {
        document.getElementById("view-desktop").style.display = "block";
      }
    })();
  </script>
</body>
</html>`;

Deno.serve(() =>
  new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }),
);
