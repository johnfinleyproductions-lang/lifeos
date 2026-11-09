// LifeOS for the Mac.
//
// A plain window onto LifeOS with its own Dock icon. It works one of two ways,
// decided by the settings file:
//
//   - LIFEOS_URL is set: the window opens that address. Use this once LifeOS
//     is deployed somewhere, so the Mac and the phone share one server.
//   - otherwise: the app starts the LifeOS server that is packed inside it,
//     on this Mac only (127.0.0.1), and opens that. Data still lives in
//     NoCodeBackend, so nothing is stored in the app itself.
//
// Settings: ~/Library/Application Support/LifeOS/lifeos.env
// Log:      ~/Library/Logs/LifeOS/server.log
//
// Built by mac/build-app.sh with:
//   swiftc -O -swift-version 5 LifeOS.swift -framework Cocoa -framework WebKit

import Cocoa
import WebKit

// MARK: - Paths

let home = FileManager.default.homeDirectoryForCurrentUser
let settingsURL = home.appendingPathComponent("Library/Application Support/LifeOS/lifeos.env")
let logURL = home.appendingPathComponent("Library/Logs/LifeOS/server.log")

/// The cream of the page, so the window never flashes white.
let paper = NSColor(srgbRed: 239 / 255, green: 230 / 255, blue: 209 / 255, alpha: 1)

// MARK: - Settings file

/// Reads KEY=VALUE lines. Blank lines and lines starting with # are skipped.
/// One pair of matching quotes around a value is removed.
func readSettings() -> [String: String]? {
    guard let text = try? String(contentsOf: settingsURL, encoding: .utf8) else { return nil }
    var out: [String: String] = [:]
    for rawLine in text.components(separatedBy: .newlines) {
        let line = rawLine.trimmingCharacters(in: .whitespaces)
        if line.isEmpty || line.hasPrefix("#") { continue }
        guard let eq = line.firstIndex(of: "=") else { continue }
        let key = String(line[line.startIndex..<eq]).trimmingCharacters(in: .whitespaces)
        var value = String(line[line.index(after: eq)...]).trimmingCharacters(in: .whitespaces)
        if value.count >= 2 {
            let first = value.first!
            let last = value.last!
            if (first == "'" && last == "'") || (first == "\"" && last == "\"") {
                value = String(value.dropFirst().dropLast())
            }
        }
        if !key.isEmpty { out[key] = value }
    }
    return out
}

// MARK: - Pages the app shows itself

func page(_ title: String, _ body: String, retry: Bool = true) -> String {
    let button = retry ? "<p><a class=\"b\" href=\"lifeos-retry://now\">Try again</a></p>" : ""
    return """
    <!doctype html><html><head><meta charset="utf-8"><style>
    html,body{height:100%;margin:0;background:#efe6d1;color:#1a1611;
      font:16px/1.55 -apple-system,BlinkMacSystemFont,sans-serif}
    main{max-width:560px;margin:0 auto;padding:18vh 32px 0}
    h1{font-size:30px;line-height:1.1;margin:0 0 14px;font-weight:800;letter-spacing:-.01em}
    p{margin:0 0 14px;color:#4d4437} code{font:13px ui-monospace,Menlo,monospace;
      background:#f7f0e0;border:1.5px solid #1a1611;padding:2px 6px;word-break:break-all}
    .b{display:inline-block;margin-top:8px;padding:9px 16px;border:1.5px solid #1a1611;
      background:#fdf9ee;color:#1a1611;text-decoration:none;font-weight:700;
      box-shadow:3px 3px 0 #1a1611}
    </style></head><body><main><h1>\(title)</h1>\(body)\(button)</main></body></html>
    """
}

// MARK: - The app

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var server: Process?
    var base = URL(string: "http://127.0.0.1:3187")!
    var attempt = 0

    // MARK: launch

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildWindow()
        start()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        stopServer()
    }

    func stopServer() {
        if let running = server, running.isRunning {
            running.terminate()
        }
        server = nil
    }

    // MARK: window

    func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = WKWebsiteDataStore.default()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        if #available(macOS 12.0, *) {
            webView.underPageBackgroundColor = paper
        }

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "LifeOS"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = paper
        window.minSize = NSSize(width: 380, height: 560)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("LifeOSMainWindow")
        window.makeKeyAndOrderFront(nil)
    }

    func show(_ html: String) {
        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: starting up

    func start() {
        attempt += 1
        let thisAttempt = attempt

        guard let settings = readSettings() else {
            show(page(
                "No settings yet.",
                "<p>LifeOS keeps its settings in one file, and it is not there:</p>"
                    + "<p><code>\(settingsURL.path)</code></p>"
                    + "<p>Run <code>mac/build-app.sh</code> from the LifeOS folder. It asks a few questions and writes the file.</p>"
            ))
            return
        }

        // A deployed LifeOS: just open it.
        if let remote = settings["LIFEOS_URL"], !remote.isEmpty, let url = URL(string: remote) {
            base = url
            webView.load(URLRequest(url: url))
            return
        }

        let port = settings["LIFEOS_PORT"].flatMap { Int($0) } ?? 3187
        base = URL(string: "http://127.0.0.1:\(port)")!

        show(page("Opening the log.", "<p>One moment.</p>", retry: false))

        // If a server from an earlier launch is still up, use it.
        health { [weak self] state in
            guard let self = self, thisAttempt == self.attempt else { return }
            if state != .down {
                self.opened(state)
                return
            }
            if let problem = self.launchServer(settings: settings, port: port) {
                self.show(page("LifeOS could not start.", problem))
                return
            }
            self.waitForServer(deadline: Date().addingTimeInterval(25), attempt: thisAttempt)
        }
    }

    enum Health { case up, storeDown, down }

    /// Asks the local server how it is. Always answers on the main thread.
    func health(_ done: @escaping (Health) -> Void) {
        var request = URLRequest(url: base.appendingPathComponent("api/health"))
        request.timeoutInterval = 6
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let task = URLSession.shared.dataTask(with: request) { _, response, _ in
            let state: Health
            if let http = response as? HTTPURLResponse {
                state = http.statusCode == 200 ? .up : .storeDown
            } else {
                state = .down
            }
            DispatchQueue.main.async { done(state) }
        }
        task.resume()
    }

    func waitForServer(deadline: Date, attempt thisAttempt: Int) {
        health { [weak self] state in
            guard let self = self, thisAttempt == self.attempt else { return }
            if state != .down {
                self.opened(state)
                return
            }
            if let running = self.server, !running.isRunning {
                self.show(page(
                    "LifeOS stopped while starting.",
                    "<p>The reason is at the end of the log:</p><p><code>\(logURL.path)</code></p>"
                        + "<p>The usual causes are a setting missing from <code>lifeos.env</code>, or another program already using this port.</p>"
                ))
                return
            }
            if Date() > deadline {
                self.show(page(
                    "LifeOS is taking too long to start.",
                    "<p>The log may say why:</p><p><code>\(logURL.path)</code></p>"
                ))
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                self.waitForServer(deadline: deadline, attempt: thisAttempt)
            }
        }
    }

    func opened(_ state: Health) {
        if state == .storeDown {
            show(page(
                "LifeOS cannot reach its data.",
                "<p>The app is running, but NoCodeBackend did not answer. Check that this Mac is online, and that <code>NCB_INSTANCE</code> in <code>lifeos.env</code> is right.</p>"
            ))
            return
        }
        webView.load(URLRequest(url: base))
    }

    /// Starts the packed server. Returns a message if it could not.
    func launchServer(settings: [String: String], port: Int) -> String? {
        guard let resources = Bundle.main.resourceURL else {
            return "<p>The app is damaged: it has no resources folder. Build it again.</p>"
        }
        let appDir = resources.appendingPathComponent("app")
        let entry = appDir.appendingPathComponent("server.js")
        guard FileManager.default.fileExists(atPath: entry.path) else {
            return "<p>The app is missing its server. Build it again with <code>mac/build-app.sh</code>.</p>"
        }

        // Where node was when the app was built, then the usual places.
        var candidates: [String] = []
        if let recorded = try? String(contentsOf: resources.appendingPathComponent("node-path"), encoding: .utf8) {
            candidates.append(recorded.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        candidates += ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
        guard let node = candidates.first(where: { !$0.isEmpty && FileManager.default.isExecutableFile(atPath: $0) }) else {
            return "<p>Node.js was not found. It was at a different place when the app was built. Build the app again with <code>mac/build-app.sh</code>.</p>"
        }

        try? FileManager.default.createDirectory(
            at: logURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        // Start each launch with a fresh log so the end of it is about now.
        try? Data().write(to: logURL)
        guard let log = try? FileHandle(forWritingTo: logURL) else {
            return "<p>Could not open the log file at <code>\(logURL.path)</code>.</p>"
        }

        var env = ProcessInfo.processInfo.environment
        for (key, value) in settings { env[key] = value }
        env["PORT"] = String(port)
        // This Mac only. Nothing else on the network can reach it.
        env["HOSTNAME"] = "127.0.0.1"
        env["NODE_ENV"] = "production"
        env["LIFEOS_APP_URL"] = base.absoluteString
        // Plain http on the same machine: see lib/http/cookie-flags.ts.
        env["LIFEOS_INSECURE_COOKIES"] = "1"

        let process = Process()
        process.executableURL = URL(fileURLWithPath: node)
        process.arguments = ["server.js"]
        process.currentDirectoryURL = appDir
        process.environment = env
        process.standardOutput = log
        process.standardError = log
        do {
            try process.run()
        } catch {
            return "<p>Could not start Node.js at <code>\(node)</code>: \(error.localizedDescription)</p>"
        }
        server = process
        return nil
    }

    // MARK: navigation

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if url.scheme == "lifeos-retry" {
            decisionHandler(.cancel)
            stopServer()
            start()
            return
        }
        let scheme = url.scheme ?? ""
        if scheme == "about" || scheme == "data" || scheme == "blob" {
            decisionHandler(.allow)
            return
        }
        // LifeOS stays in the window. Anything else opens in the browser.
        if url.host == base.host && (url.port ?? -1) == (base.port ?? -1) {
            decisionHandler(.allow)
        } else if scheme == "http" || scheme == "https" || scheme == "mailto" {
            decisionHandler(.cancel)
            NSWorkspace.shared.open(url)
        } else {
            decisionHandler(.cancel)
        }
    }

    /// Links that ask for a new window open in the browser instead.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            if url.host == base.host && (url.port ?? -1) == (base.port ?? -1) {
                webView.load(URLRequest(url: url))
            } else {
                NSWorkspace.shared.open(url)
            }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let code = (error as NSError).code
        if code == NSURLErrorCancelled { return }
        show(page(
            "LifeOS did not answer.",
            "<p>\(error.localizedDescription)</p><p>Address: <code>\(base.absoluteString)</code></p>"
        ))
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    // MARK: menu

    @objc func reloadPage(_ sender: Any?) {
        if webView.url == nil || webView.url?.scheme == "about" {
            stopServer()
            start()
        } else {
            webView.reload()
        }
    }

    @objc func goHome(_ sender: Any?) {
        webView.load(URLRequest(url: base))
    }

    @objc func goBack(_ sender: Any?) {
        if webView.canGoBack { webView.goBack() }
    }

    @objc func goForward(_ sender: Any?) {
        if webView.canGoForward { webView.goForward() }
    }

    @objc func zoomIn(_ sender: Any?) {
        webView.pageZoom = min(webView.pageZoom + 0.1, 2.0)
    }

    @objc func zoomOut(_ sender: Any?) {
        webView.pageZoom = max(webView.pageZoom - 0.1, 0.6)
    }

    @objc func zoomReset(_ sender: Any?) {
        webView.pageZoom = 1.0
    }

    @objc func openSettingsFile(_ sender: Any?) {
        if FileManager.default.fileExists(atPath: settingsURL.path) {
            NSWorkspace.shared.open(
                [settingsURL],
                withApplicationAt: URL(fileURLWithPath: "/System/Applications/TextEdit.app"),
                configuration: NSWorkspace.OpenConfiguration(),
                completionHandler: nil
            )
        } else {
            NSWorkspace.shared.open(settingsURL.deletingLastPathComponent())
        }
    }

    @objc func openLog(_ sender: Any?) {
        NSWorkspace.shared.open(logURL)
    }

    func item(_ title: String, _ action: Selector?, _ key: String, _ mask: NSEvent.ModifierFlags = [.command]) -> NSMenuItem {
        let menuItem = NSMenuItem(title: title, action: action, keyEquivalent: key)
        menuItem.keyEquivalentModifierMask = mask
        return menuItem
    }

    func buildMenu() {
        let main = NSMenu()

        // LifeOS
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(item("About LifeOS", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""))
        appMenu.addItem(.separator())
        let settings = item("Open Settings File", #selector(openSettingsFile(_:)), ",")
        settings.target = self
        appMenu.addItem(settings)
        let log = item("Show Log", #selector(openLog(_:)), "")
        log.target = self
        appMenu.addItem(log)
        appMenu.addItem(.separator())
        appMenu.addItem(item("Hide LifeOS", #selector(NSApplication.hide(_:)), "h"))
        appMenu.addItem(item("Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]))
        appMenu.addItem(.separator())
        appMenu.addItem(item("Quit LifeOS", #selector(NSApplication.terminate(_:)), "q"))
        appItem.submenu = appMenu
        main.addItem(appItem)

        // Edit: without these, copy and paste do nothing in a window like this.
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(item("Undo", Selector(("undo:")), "z"))
        editMenu.addItem(item("Redo", Selector(("redo:")), "z", [.command, .shift]))
        editMenu.addItem(.separator())
        editMenu.addItem(item("Cut", #selector(NSText.cut(_:)), "x"))
        editMenu.addItem(item("Copy", #selector(NSText.copy(_:)), "c"))
        editMenu.addItem(item("Paste", #selector(NSText.paste(_:)), "v"))
        editMenu.addItem(item("Select All", #selector(NSText.selectAll(_:)), "a"))
        editItem.submenu = editMenu
        main.addItem(editItem)

        // View
        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        let entries: [(String, Selector, String)] = [
            ("Today", #selector(goHome(_:)), "1"),
            ("Reload", #selector(reloadPage(_:)), "r"),
            ("Back", #selector(goBack(_:)), "["),
            ("Forward", #selector(goForward(_:)), "]"),
            ("Bigger", #selector(zoomIn(_:)), "="),
            ("Smaller", #selector(zoomOut(_:)), "-"),
            ("Actual Size", #selector(zoomReset(_:)), "0"),
        ]
        for (index, entry) in entries.enumerated() {
            if index == 2 || index == 4 { viewMenu.addItem(.separator()) }
            let menuItem = item(entry.0, entry.1, entry.2)
            menuItem.target = self
            viewMenu.addItem(menuItem)
        }
        viewItem.submenu = viewMenu
        main.addItem(viewItem)

        // Window
        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(item("Minimize", #selector(NSWindow.performMiniaturize(_:)), "m"))
        windowMenu.addItem(item("Zoom", #selector(NSWindow.performZoom(_:)), ""))
        windowMenu.addItem(item("Close", #selector(NSWindow.performClose(_:)), "w"))
        windowItem.submenu = windowMenu
        main.addItem(windowItem)
        NSApp.windowsMenu = windowMenu

        NSApp.mainMenu = main
    }
}

// MARK: - Entry

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()
