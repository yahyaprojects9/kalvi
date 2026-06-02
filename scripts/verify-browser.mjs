import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.CDP_PORT || 9333);
const studentUrl = process.env.STUDENT_URL || "http://127.0.0.1:5173/login";
const adminUrl = process.env.ADMIN_URL || "http://127.0.0.1:5174/login";
const userDataDir = join(tmpdir(), `kalvi-browser-check-${Date.now()}`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(250);
    }
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const callbacks = new Map();
  const handlers = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && callbacks.has(message.id)) {
      const { resolve, reject } = callbacks.get(message.id);
      callbacks.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result ?? {});
      return;
    }
    const list = handlers.get(message.method) ?? [];
    for (const handler of list) handler(message.params ?? {});
  });

  return {
    ready: new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    }),
    send(method, params = {}) {
      const callId = ++id;
      ws.send(JSON.stringify({ id: callId, method, params }));
      return new Promise((resolve, reject) => callbacks.set(callId, { resolve, reject }));
    },
    on(method, handler) {
      handlers.set(method, [...(handlers.get(method) ?? []), handler]);
    },
    close() {
      ws.close();
    },
  };
}

async function createPage(browser, url) {
  void browser;
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!target?.webSocketDebuggerUrl) throw new Error(`Could not attach to ${url}`);
  const page = connect(target.webSocketDebuggerUrl);
  await page.ready;
  await Promise.all([
    page.send("Page.enable"),
    page.send("Runtime.enable"),
    page.send("Network.enable"),
  ]);
  await page.send("Page.navigate", { url });
  await waitForLoad(page);
  return page;
}

async function waitForLoad(page) {
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 10000);
    page.on("Page.loadEventFired", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await sleep(1000);
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Evaluation failed");
  }
  return result.result?.value;
}

function collectErrors(page, label) {
  const errors = [];
  page.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    errors.push({ label, type: "runtime", text: exceptionDetails?.text ?? "Runtime exception" });
  });
  page.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type !== "error") return;
    errors.push({
      label,
      type: "console",
      text: args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") || "console.error",
    });
  });
  page.on("Network.loadingFailed", ({ errorText, requestId }) => {
    errors.push({ label, type: "network", text: `${requestId}: ${errorText}` });
  });
  page.on("Network.responseReceived", ({ response }) => {
    const url = response?.url ?? "";
    if (response?.status >= 400 && !url.includes("/auth/v1/token")) {
      errors.push({ label, type: "http", text: `${response.status} ${url}` });
    }
  });
  return errors;
}

async function passwordToggleCheck(page) {
  return evaluate(page, `new Promise((resolve) => {
    const input = document.querySelector('input[type="password"]');
    if (!input) return resolve({ ok: false, reason: 'password input not found' });
    const before = input.type;
    const button = document.querySelector('button[aria-label="Show password"]');
    if (!button) return resolve({ ok: false, reason: 'show button not found', before });
    button.click();
    setTimeout(() => {
      const afterShow = input.type;
      const hide = document.querySelector('button[aria-label="Hide password"]');
      hide?.click();
      setTimeout(() => resolve({ ok: before === 'password' && afterShow === 'text' && input.type === 'password', before, afterShow, afterHide: input.type }), 100);
    }, 100);
  })`);
}

async function adminLoginCheck(page) {
  return evaluate(page, `new Promise((resolve) => {
    const setValue = (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const email = document.querySelector('#email');
    const password = document.querySelector('#password');
    const form = document.querySelector('form');
    if (!email || !password || !form) return resolve({ ok: false, reason: 'admin login form missing' });
    setValue(email, 'admin@kalvi.test');
    setValue(password, 'admin123');
    form.requestSubmit();
    setTimeout(() => resolve({ ok: location.pathname.includes('/dashboard'), path: location.pathname, stored: Boolean(localStorage.getItem('kalvi_admin_auth')) }), 5000);
  })`);
}

async function studentLoginCheck(page) {
  return evaluate(page, `new Promise((resolve) => {
    const setValue = (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const mobile = document.querySelector('#mobile');
    const password = document.querySelector('#spw');
    const form = document.querySelector('form');
    if (!mobile || !password || !form) return resolve({ ok: false, reason: 'student login form missing' });
    setValue(mobile, '9000010001');
    setValue(password, 'student123');
    form.requestSubmit();
    setTimeout(() => {
      let auth = null;
      try { auth = JSON.parse(localStorage.getItem('kalvi_student_auth') || 'null'); } catch {}
      resolve({ ok: location.pathname.includes('/home') && Boolean(auth?.student?.id), path: location.pathname, student: auth?.student?.full_name ?? null, class: auth?.student?.class ?? null });
    }, 6000);
  })`);
}

await mkdir(userDataDir, { recursive: true });
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
], { stdio: "ignore" });

try {
  const version = await waitForChrome();
  const browser = connect(version.webSocketDebuggerUrl);
  await browser.ready;

  const studentPage = await createPage(browser, studentUrl);
  const adminPage = await createPage(browser, adminUrl);
  const errors = [
    ...collectErrors(studentPage, "student"),
    ...collectErrors(adminPage, "admin"),
  ];

  const studentToggle = await passwordToggleCheck(studentPage);
  const adminToggle = await passwordToggleCheck(adminPage);
  const adminLogin = await adminLoginCheck(adminPage);
  const studentLogin = await studentLoginCheck(studentPage);

  await sleep(1500);
  const result = {
    urls: { studentUrl, adminUrl },
    checks: { studentToggle, adminToggle, adminLogin, studentLogin },
    errors,
    passed: studentToggle.ok && adminToggle.ok && adminLogin.ok && studentLogin.ok && errors.length === 0,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
  browser.close();
  studentPage.close();
  adminPage.close();
} finally {
  chrome.kill();
  await sleep(500);
  await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
}
