using System;
using System.Diagnostics;
using System.IO;

class GestionaleApp {
    [STAThread]
    static void Main() {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string htmlPath = Path.Combine(exeDir, "gestionale.html");

        if (!File.Exists(htmlPath)) {
            System.Windows.Forms.MessageBox.Show(
                "gestionale.html non trovato in:\n" + htmlPath,
                "Errore", System.Windows.Forms.MessageBoxButtons.OK,
                System.Windows.Forms.MessageBoxIcon.Error);
            return;
        }

        Process.Start(new ProcessStartInfo(htmlPath) { UseShellExecute = true });
    }
}
