const fs = require('fs');
let content = fs.readFileSync('src/app/(shop)/login/page.tsx', 'utf8');

const oldHandler = `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Clear any stale auth cookies
      await fetch("/api/clear-cookies", { method: "POST", credentials: "same-origin" }).catch(() => {});

      // Step 2: Get CSRF token directly
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      // Step 3: Submit credentials directly via fetch (bypass nextAuthSignIn)
      const formData = new URLSearchParams();
      formData.append("csrfToken", csrfToken);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("redirect", "false");
      formData.append("json", "true");

      const callbackRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        redirect: "manual",
      });

      // A successful login returns 302 redirect
      if (callbackRes.type === "opaqueredirect" || callbackRes.status === 302) {
        toast.success("Signed in successfully");
        // Give cookies a moment to propagate
        await new Promise((r) => setTimeout(r, 500));

        // Verify session and route based on role
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        if (role === "ADMIN") {
          window.location.href = "/admin/dashboard";
        } else if (["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"].includes(role)) {
          window.location.href = "/staff/dashboard";
        } else {
          window.location.href = callbackUrl.startsWith("/account")
            ? callbackUrl
            : "/account";
        }
      } else {
        // Try json response for error
        const body = await callbackRes.json().catch(() => null);
        if (body?.error) {
          toast.error("Invalid email or password");
        } else {
          toast.error("Invalid email or password");
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Failed to sign in");
      setLoading(false);
    }
  };`;

const newHandler = `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clear any stale auth cookies first
      await fetch("/api/clear-cookies", { method: "POST", credentials: "same-origin" }).catch(() => {});

      // Use nextAuthSignIn with redirect: false (it handles CSRF + cookie setting internally)
      const result = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/admin/dashboard",
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      // Success — check session to determine role
      await new Promise((r) => setTimeout(r, 1000));
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;

      if (role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else if (["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"].includes(role)) {
        window.location.href = "/staff/dashboard";
      } else {
        window.location.href = callbackUrl.startsWith("/account")
          ? callbackUrl
          : "/account";
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Failed to sign in");
      setLoading(false);
    }
  };`;

if (content.includes(oldHandler)) {
  content = content.replace(oldHandler, newHandler);
  fs.writeFileSync('src/app/(shop)/login/page.tsx', content);
  console.log('Login rewritten with nextAuthSignIn + session check');
} else {
  console.log('ERROR: old handler not found');
}
