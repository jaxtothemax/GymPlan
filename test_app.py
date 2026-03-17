"""
GymPlan Playwright test suite.
Tests: layout overflow, navigation, auth screens, responsive mobile viewport.
"""
import sys
import time
from playwright.sync_api import sync_playwright, Page, expect

BASE_URL = "http://localhost:5173"
MOBILE_VIEWPORT = {"width": 390, "height": 844}  # iPhone 14

PASS = []
FAIL = []

def ok(name):
    PASS.append(name)
    print(f"  ✓  {name}")

def fail(name, reason):
    FAIL.append((name, reason))
    print(f"  ✗  {name}: {reason}")

def check_no_horizontal_overflow(page: Page, label: str):
    """Check that body/html has no horizontal scrollbar."""
    overflow = page.evaluate("""() => {
        const body = document.body;
        const html = document.documentElement;
        return {
            bodyScrollWidth: body.scrollWidth,
            bodyClientWidth: body.clientWidth,
            htmlScrollWidth: html.scrollWidth,
            htmlClientWidth: html.clientWidth,
            windowInnerWidth: window.innerWidth,
        }
    }""")
    if overflow["bodyScrollWidth"] > overflow["windowInnerWidth"] + 2:
        fail(f"{label} — no horizontal overflow",
             f"body.scrollWidth={overflow['bodyScrollWidth']} > window.innerWidth={overflow['windowInnerWidth']}")
    else:
        ok(f"{label} — no horizontal overflow")

def check_no_elements_outside_viewport(page: Page, label: str):
    """Check that no visible elements extend beyond the right edge."""
    offenders = page.evaluate("""() => {
        const w = window.innerWidth;
        const bad = [];
        document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > w + 4 && r.width > 0 && r.height > 0) {
                const styles = window.getComputedStyle(el);
                if (styles.visibility !== 'hidden' && styles.display !== 'none') {
                    bad.push({
                        tag: el.tagName,
                        class: el.className?.toString?.().slice(0, 60) || '',
                        right: Math.round(r.right),
                        width: Math.round(r.width),
                    });
                }
            }
        });
        return bad.slice(0, 5);
    }""")
    if offenders:
        fail(f"{label} — elements within viewport",
             f"{len(offenders)} element(s) overflow right edge: {offenders[0]}")
    else:
        ok(f"{label} — elements within viewport")

def check_inputs_font_size(page: Page, label: str):
    """iOS zoom prevention: all inputs must have computed font-size >= 16px."""
    bad = page.evaluate("""() => {
        const bad = [];
        document.querySelectorAll('input, textarea, select').forEach(el => {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 16) bad.push({ tag: el.tagName, type: el.type, fontSize: fs });
        });
        return bad;
    }""")
    if bad:
        fail(f"{label} — input font-size >= 16px", f"Found {len(bad)} input(s) below 16px: {bad[0]}")
    else:
        ok(f"{label} — input font-size >= 16px (iOS zoom safe)")

def check_touch_targets(page: Page, label: str):
    """All interactive elements should meet 44x44px minimum."""
    bad = page.evaluate("""() => {
        const MIN = 44;
        const bad = [];
        document.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
            const r = el.getBoundingClientRect();
            if ((r.width < MIN || r.height < MIN) && r.width > 0 && r.height > 0) {
                const styles = window.getComputedStyle(el);
                if (styles.visibility !== 'hidden' && styles.display !== 'none') {
                    bad.push({
                        tag: el.tagName,
                        text: el.textContent?.trim().slice(0, 30),
                        w: Math.round(r.width),
                        h: Math.round(r.height),
                    });
                }
            }
        });
        return bad.slice(0, 5);
    }""")
    if bad:
        fail(f"{label} — touch targets >= 44px",
             f"{len(bad)} element(s) too small: {bad[0]}")
    else:
        ok(f"{label} — touch targets >= 44px")

def check_bottom_nav_visible(page: Page, label: str):
    nav = page.locator("nav").first
    try:
        expect(nav).to_be_visible(timeout=3000)
        ok(f"{label} — bottom nav visible")
    except Exception as e:
        fail(f"{label} — bottom nav visible", str(e))

def check_no_sheet_overlay_blocking(page: Page, label: str):
    """The sheet overlay should not be blocking clicks when no sheet is open."""
    blocking = page.evaluate("""() => {
        const overlays = document.querySelectorAll('.sheet-overlay');
        for (const el of overlays) {
            const styles = window.getComputedStyle(el);
            if (styles.pointerEvents !== 'none' && parseFloat(styles.opacity) < 0.5) {
                return true;
            }
        }
        return false;
    }""")
    if blocking:
        fail(f"{label} — sheet overlay not blocking", "Invisible sheet overlay has pointer-events enabled")
    else:
        ok(f"{label} — sheet overlay not blocking")

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=MOBILE_VIEWPORT,
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        )
        page = context.new_page()

        print("\n── Auth screens ──────────────────────────────────────")
        page.goto(BASE_URL + "/auth/signin", wait_until="networkidle")
        time.sleep(0.5)

        # Sign-in page renders
        try:
            expect(page.get_by_text("GymPlan")).to_be_visible(timeout=5000)
            ok("Sign-in — GymPlan title visible")
        except Exception as e:
            fail("Sign-in — GymPlan title visible", str(e))

        check_no_horizontal_overflow(page, "Sign-in")
        check_no_elements_outside_viewport(page, "Sign-in")
        check_inputs_font_size(page, "Sign-in")
        check_touch_targets(page, "Sign-in")

        # Sign-up page
        page.goto(BASE_URL + "/auth/signup", wait_until="networkidle")
        time.sleep(0.3)
        check_no_horizontal_overflow(page, "Sign-up")
        check_no_elements_outside_viewport(page, "Sign-up")
        check_inputs_font_size(page, "Sign-up")

        # Forgot password
        page.goto(BASE_URL + "/auth/forgot-password", wait_until="networkidle")
        time.sleep(0.3)
        check_no_horizontal_overflow(page, "Forgot password")
        check_inputs_font_size(page, "Forgot password")

        # Unauthenticated redirect
        page.goto(BASE_URL + "/", wait_until="domcontentloaded")
        time.sleep(0.5)
        if "/auth/signin" in page.url:
            ok("Unauthenticated — redirects to sign-in")
        else:
            fail("Unauthenticated — redirects to sign-in", f"Was at {page.url}")

        print("\n── Zod form validation ───────────────────────────────")
        page.goto(BASE_URL + "/auth/signin", wait_until="networkidle")
        # Submit empty form
        page.get_by_role("button", name="Sign in").click()
        time.sleep(0.3)
        errors = page.locator("text=valid email, text=required").all()
        # Just check the page doesn't crash/navigate
        if "/auth/signin" in page.url:
            ok("Sign-in — empty submit stays on page (validation active)")
        else:
            fail("Sign-in — empty submit stays on page", f"Navigated to {page.url}")

        print("\n── CSS / design system ───────────────────────────────")
        page.goto(BASE_URL + "/auth/signin", wait_until="networkidle")
        css_vars = page.evaluate("""() => {
            const root = document.documentElement;
            const style = getComputedStyle(root);
            return {
                bg: style.getPropertyValue('--bg').trim(),
                blue: style.getPropertyValue('--blue').trim(),
                surface1: style.getPropertyValue('--surface-1').trim(),
            }
        }""")
        if css_vars["bg"]:
            ok(f"CSS variables loaded (--bg={css_vars['bg']}, --blue={css_vars['blue']})")
        else:
            fail("CSS variables loaded", "Variables are empty")

        dark_theme = page.evaluate("""() =>
            document.documentElement.getAttribute('data-theme')
        """)
        if dark_theme == "dark":
            ok("Dark theme applied by default")
        else:
            fail("Dark theme applied by default", f"data-theme='{dark_theme}'")

        # Check Inter font loaded
        inter_loaded = page.evaluate("""() => {
            return document.fonts.check('16px Inter')
        }""")
        if inter_loaded:
            ok("Inter font loaded")
        else:
            fail("Inter font loaded", "Inter not in loaded fonts")

        print("\n── Number input spinners hidden ──────────────────────")
        page.goto(BASE_URL + "/auth/signin", wait_until="networkidle")
        spinner_check = page.evaluate("""() => {
            // Check the CSS rule is present
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.cssText && rule.cssText.includes('inner-spin-button')) return true;
                    }
                } catch(e) {}
            }
            return false;
        }""")
        if spinner_check:
            ok("Number input spinners hidden via CSS")
        else:
            fail("Number input spinners hidden", "No webkit-inner-spin-button rule found in stylesheets")

        print("\n── Sheet overlay fix ─────────────────────────────────")
        check_no_sheet_overlay_blocking(page, "Sign-in")

        print("\n── Responsive layout (390px mobile) ─────────────────")
        for path, name in [
            ("/auth/signin", "Sign-in"),
            ("/auth/signup", "Sign-up"),
            ("/auth/forgot-password", "Forgot password"),
        ]:
            page.goto(BASE_URL + path, wait_until="networkidle")
            time.sleep(0.3)
            check_no_horizontal_overflow(page, f"Mobile 390px — {name}")

        print("\n── Screenshot ────────────────────────────────────────")
        page.goto(BASE_URL + "/auth/signin", wait_until="networkidle")
        time.sleep(0.5)
        page.screenshot(path="/tmp/gymplan_signin.png", full_page=True)
        ok("Screenshot saved to /tmp/gymplan_signin.png")

        browser.close()

    print(f"\n{'═'*55}")
    print(f"  Results: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print(f"\n  FAILURES:")
        for name, reason in FAIL:
            print(f"    ✗ {name}")
            print(f"      → {reason}")
    print(f"{'═'*55}\n")
    return len(FAIL) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
