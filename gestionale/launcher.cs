using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

class GestionaleApp {
    [STAThread]
    static void Main() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        string exeDir  = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        string rootDir = Path.GetFullPath(Path.Combine(exeDir, ".."));
        string htmlPath = Path.Combine(exeDir, "gestionale.html");

        if (!File.Exists(htmlPath)) {
            MessageBox.Show(
                "gestionale.html non trovato in:\n" + htmlPath,
                "Errore", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        /* ── Splash di aggiornamento ─────────────────────────── */
        var splash = new Form {
            Text            = "MANBAGA Gestionale",
            FormBorderStyle = FormBorderStyle.None,
            StartPosition   = FormStartPosition.CenterScreen,
            Size            = new Size(320, 110),
            BackColor       = Color.FromArgb(13, 13, 13),
            TopMost         = true
        };

        var border = new Panel {
            Dock      = DockStyle.Fill,
            BackColor = Color.FromArgb(220, 38, 38),
            Padding   = new Padding(2)
        };
        var inner = new Panel {
            Dock      = DockStyle.Fill,
            BackColor = Color.FromArgb(13, 13, 13),
            Padding   = new Padding(22, 18, 22, 18)
        };

        var lblTitle = new Label {
            Text      = "MANBAGA Gestionale",
            ForeColor = Color.FromArgb(245, 240, 232),
            Font      = new Font("Segoe UI", 12f, FontStyle.Bold),
            AutoSize  = true,
            Location  = new Point(22, 16)
        };
        var lblStatus = new Label {
            Text      = "Controllo aggiornamenti...",
            ForeColor = Color.FromArgb(160, 155, 148),
            Font      = new Font("Segoe UI", 8.5f),
            AutoSize  = true,
            Location  = new Point(22, 44)
        };
        var bar = new Panel {
            BackColor = Color.FromArgb(220, 38, 38),
            Location  = new Point(22, 68),
            Size      = new Size(0, 3)
        };

        inner.Controls.Add(lblTitle);
        inner.Controls.Add(lblStatus);
        inner.Controls.Add(bar);
        border.Controls.Add(inner);
        splash.Controls.Add(border);

        /* Animazione barra */
        var timer = new Timer { Interval = 30 };
        int barW = 0;
        timer.Tick += (s, e) => {
            barW = Math.Min(barW + 4, 276);
            bar.Width = barW;
        };

        splash.Shown += (s, e) => {
            timer.Start();
            splash.Refresh();

            /* ── Git pull ──────────────────────────────────────── */
            bool gitOk = false;
            string gitMsg = "";
            try {
                var git = new Process();
                git.StartInfo = new ProcessStartInfo {
                    FileName               = "git",
                    Arguments              = "pull",
                    WorkingDirectory       = rootDir,
                    UseShellExecute        = false,
                    CreateNoWindow         = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true
                };
                git.Start();
                string stdout = git.StandardOutput.ReadToEnd();
                string stderr = git.StandardError.ReadToEnd();
                gitOk  = git.WaitForExit(15000);
                gitMsg = (stdout + stderr).Trim();
            } catch { /* git non installato o nessuna connessione */ }

            /* Aggiorna label status */
            if (!gitOk || string.IsNullOrEmpty(gitMsg)) {
                lblStatus.Text      = "Avvio in corso...";
                lblStatus.ForeColor = Color.FromArgb(160, 155, 148);
            } else if (gitMsg.Contains("Already up to date") || gitMsg.Contains("Già aggiornato")) {
                lblStatus.Text      = "✓  Già aggiornato";
                lblStatus.ForeColor = Color.FromArgb(74, 222, 128);
            } else if (gitMsg.StartsWith("error") || gitMsg.StartsWith("fatal")) {
                lblStatus.Text      = "⚠  Nessuna connessione — versione locale";
                lblStatus.ForeColor = Color.FromArgb(251, 191, 36);
            } else {
                lblStatus.Text      = "✓  Aggiornato!";
                lblStatus.ForeColor = Color.FromArgb(74, 222, 128);
            }

            bar.Width = 276;
            splash.Refresh();

            System.Threading.Thread.Sleep(700);

            /* ── Apri il gestionale nel browser ────────────────── */
            Process.Start(new ProcessStartInfo(htmlPath) { UseShellExecute = true });

            timer.Stop();
            splash.Close();
        };

        Application.Run(splash);
    }
}
