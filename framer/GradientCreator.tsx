/**
 * Gradient Creator for Framer.
 *
 * This component holds almost nothing. It loads the studio from GitHub, through
 * jsDelivr, pinned to one release: the page and all its behaviour, styles.css and
 * the gifski engine files. It adds your design system's stylesheets on top, and
 * runs it all in a frame on your page. To change the studio, publish a new release
 * on GitHub and put its tag in the Release field in Framer's right-hand panel.
 *
 * Styling: the studio uses shadcn / Tailwind names (--background, --card,
 * --primary, --border, --ring, --radius, --font-sans...), so a design system with
 * the same names restyles it directly. Its stylesheets load after the studio's
 * own, so their values win. Values must be full colours (oklch(), hsl(), #hex),
 * not shadcn v3's bare "222 47% 11%" numbers.
 *
 * Licence: AGPL-3.0, like the studio it loads.
 * Source: https://github.com/shubhamarya-uxnai/Gradient-Creator
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 1280
 * @framerIntrinsicHeight 800
 */
import { addPropertyControls, ControlType } from "framer"
import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"

// ---- loader: plain functions, also tested outside Framer ----

const pages = new Map<string, Promise<string>>()

/** The studio's page for one release. A release never changes, so it is fetched once. */
function loadStudio(base: string): Promise<string> {
    let page = pages.get(base)
    if (!page) {
        page = fetch(base + "index.html").then((r) => {
            if (!r.ok) throw new Error("GitHub answered " + r.status)
            return r.text()
        })
        page.catch(() => pages.delete(base))
        pages.set(base, page)
    }
    return page
}

const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/**
 * One <link> per address, in the order given: https, or a design system being
 * previewed on this Mac (localhost). Anything else is ignored.
 */
function stylesheetLinks(list: string): string {
    return (list || "")
        .split(/[\s,]+/)
        .filter((u) => /^(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/)[^\s"'<>]*$/i.test(u))
        .map((u) => '<link rel="stylesheet" href="' + esc(u) + '">')
        .join("")
}

/** class and data- attributes for the page's root. Nothing else gets through. */
function rootAttributes(dark: boolean, switches: string): string {
    const classes: string[] = dark ? ["dark"] : []
    const data: string[] = []
    const pattern = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(switches || ""))) {
        const name = m[1].toLowerCase()
        if (name === "class") m[2].split(/\s+/).filter(Boolean).forEach((c) => classes.push(c))
        else if (name.startsWith("data-")) data.push(name + '="' + esc(m[2]) + '"')
    }
    const attrs = classes.length ? ['class="' + esc(classes.join(" ")) + '"'] : []
    return attrs.concat(data).join(" ")
}

/**
 * The studio's page, ready for a frame: relative addresses point at the release,
 * the design system loads after the studio's own styles, and the mode switches
 * sit on the root, where the studio's colour roles are defined.
 */
function framePage(html: string, base: string, designSystem: string, dark: boolean, switches: string): string {
    const attrs = rootAttributes(dark, switches)
    return html
        .replace(/<head>/i, '<head><base href="' + esc(base) + '">')
        .replace(/<\/head>/i, stylesheetLinks(designSystem) + "</head>")
        .replace(/<html([^>]*)>/i, (_all, rest) => "<html" + rest + (attrs ? " " + attrs : "") + ">")
}

// ---- end loader ----

interface Props {
    release: string
    designSystem: string
    dark: boolean
    switches: string
    repository: string
    style?: CSSProperties
}

export default function GradientCreator(props: Props) {
    const { release, designSystem, dark, switches, repository, style } = props
    const base = "https://cdn.jsdelivr.net/gh/" + repository.trim() + "@" + release.trim() + "/"
    const [html, setHtml] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let current = true
        setHtml(null)
        setError(null)
        loadStudio(base).then(
            (page) => current && setHtml(page),
            (e) => current && setError(e && e.message ? e.message : String(e))
        )
        return () => {
            current = false
        }
    }, [base])

    const page = useMemo(
        () => (html ? framePage(html, base, designSystem, dark, switches) : null),
        [html, base, designSystem, dark, switches]
    )

    const box: CSSProperties = {
        ...style,
        width: "100%",
        height: "100%",
        background: "#0a0b0f",
        color: "#8e95ad",
        display: "grid",
        placeItems: "center",
        font: "13px/1.5 ui-sans-serif, -apple-system, system-ui, sans-serif",
        textAlign: "center",
        padding: 24,
        boxSizing: "border-box",
    }
    if (error)
        return (
            <div style={box}>
                Gradient Creator could not load release {release} from GitHub ({error}).
                <br />
                Check the Release tag and the Repository in the right-hand panel.
            </div>
        )
    if (!page) return <div style={box}>Loading Gradient Creator...</div>

    return (
        <iframe
            title="Gradient Creator"
            srcDoc={page}
            allow="clipboard-write; local-network-access"
            style={{ ...style, width: "100%", height: "100%", border: 0, display: "block", background: "#0a0b0f" }}
        />
    )
}

addPropertyControls(GradientCreator, {
    release: {
        type: ControlType.String,
        title: "Release",
        defaultValue: "v1.0.0",
        placeholder: "v1.0.0",
        description: "A release tag on GitHub. Publish a new release there, then change this.",
    },
    designSystem: {
        type: ControlType.String,
        title: "Design system",
        defaultValue: "",
        placeholder: "https://cdn.jsdelivr.net/gh/you/design-system@v1.0.0/dist/tokens.css",
        displayTextArea: true,
        description: "Stylesheet addresses, one per line. They load after the studio's own styles.",
    },
    dark: {
        type: ControlType.Boolean,
        title: "Dark mode",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    switches: {
        type: ControlType.String,
        title: "Mode switches",
        defaultValue: "",
        placeholder: 'data-contrast="high"',
        description: "class and data- attributes for your design system's switches, set on the studio's root.",
    },
    repository: {
        type: ControlType.String,
        title: "Repository",
        defaultValue: "shubhamarya-uxnai/Gradient-Creator",
    },
})
