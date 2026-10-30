using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace AsistenteAdaptado
{
    static class Program
    {
        private static HttpListener _httpListener;
        private static Thread _serverThread;
        private static volatile bool _isRunning = false;
        private static int _port = 5050;
        private static string _appUrl = "";
        private static string _distPath = "";

        public static event Action<string> OnServerLog;

        public static void Log(string msg)
        {
            string line = "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg;
            if (OnServerLog != null)
            {
                try { OnServerLog(line); } catch { }
            }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            _distPath = Path.Combine(baseDir, "dist");

            if (!Directory.Exists(_distPath))
            {
                string searchDir = Path.Combine(baseDir, "TIC APPS", "dist");
                if (Directory.Exists(searchDir))
                {
                    _distPath = searchDir;
                }
            }

            if (!Directory.Exists(_distPath))
            {
                MessageBox.Show(
                    "No se encontró la carpeta 'dist' con los archivos compilados de la aplicación.\n\n" +
                    "Asegúrate de que 'dist' esté en la misma carpeta que este ejecutable.",
                    "Asistente Adaptado con IA - Archivos no encontrados",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            _port = GetFreePort(5050);
            _appUrl = "http://localhost:" + _port + "/";

            if (!StartHttpServer())
            {
                return;
            }

            Application.Run(new ControlForm(_appUrl, _port, _distPath));

            StopHttpServer();
        }

        private static int GetFreePort(int startPort)
        {
            for (int p = startPort; p < startPort + 50; p++)
            {
                try
                {
                    TcpListener tcp = new TcpListener(IPAddress.Loopback, p);
                    tcp.Start();
                    tcp.Stop();
                    return p;
                }
                catch { }
            }
            return startPort;
        }

        private static bool StartHttpServer()
        {
            try
            {
                _httpListener = new HttpListener();
                _httpListener.Prefixes.Add("http://localhost:" + _port + "/");
                _httpListener.Prefixes.Add("http://127.0.0.1:" + _port + "/");
                _httpListener.Start();
                _isRunning = true;

                _serverThread = new Thread(() =>
                {
                    while (_isRunning)
                    {
                        try
                        {
                            HttpListenerContext ctx = _httpListener.GetContext();
                            ThreadPool.QueueUserWorkItem((state) => HandleRequest(ctx));
                        }
                        catch (Exception ex)
                        {
                            if (!_isRunning) break;
                            Log("WARN Listener: " + ex.Message);
                        }
                    }
                });
                _serverThread.IsBackground = true;
                _serverThread.Start();
                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al iniciar el servidor local en " + _appUrl + ":\n" + ex.Message,
                    "Error de Servidor",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }
        }

        private static void StopHttpServer()
        {
            _isRunning = false;
            try
            {
                if (_httpListener != null && _httpListener.IsListening)
                {
                    _httpListener.Stop();
                    _httpListener.Close();
                }
            }
            catch { }
        }

        private static void HandleRequest(HttpListenerContext ctx)
        {
            try
            {
                string rawUrl = ctx.Request.Url.AbsolutePath;
                rawUrl = Uri.UnescapeDataString(rawUrl).TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                string filePath = Path.Combine(_distPath, rawUrl.Replace('/', Path.DirectorySeparatorChar));

                if (!File.Exists(filePath))
                {
                    Log("SPA Fallback: /" + rawUrl + " -> index.html");
                    filePath = Path.Combine(_distPath, "index.html");
                }

                if (File.Exists(filePath))
                {
                    byte[] data = File.ReadAllBytes(filePath);
                    string mime = GetMimeType(filePath);
                    ctx.Response.ContentType = mime;
                    ctx.Response.ContentLength64 = data.Length;
                    ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                    ctx.Response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate");
                    ctx.Response.StatusCode = 200;
                    ctx.Response.OutputStream.Write(data, 0, data.Length);
                    ctx.Response.OutputStream.Flush();
                    Log("HTTP 200 GET /" + rawUrl + " (" + data.Length + " bytes) [" + mime + "]");
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    byte[] err = Encoding.UTF8.GetBytes("404 - Archivo no encontrado.");
                    ctx.Response.OutputStream.Write(err, 0, err.Length);
                    ctx.Response.OutputStream.Flush();
                    Log("ERROR 404 GET /" + rawUrl + " - No encontrado");
                }
            }
            catch (Exception ex)
            {
                Log("ERROR sirviendo petición: " + ex.Message);
            }
            finally
            {
                try { ctx.Response.Close(); } catch { }
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": case ".htm": return "text/html; charset=utf-8";
                case ".js": case ".mjs": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json; charset=utf-8";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".gif": return "image/gif";
                case ".ico": return "image/x-icon";
                case ".webp": return "image/webp";
                case ".woff": return "font/woff";
                case ".woff2": return "font/woff2";
                case ".ttf": return "font/ttf";
                default: return "application/octet-stream";
            }
        }

        public static void OpenAppWindow(string url)
        {
            string edge = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edge))
            {
                edge = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            if (File.Exists(edge))
            {
                try
                {
                    Log("Abriendo ventana de aplicación con Microsoft Edge: " + url);
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = edge,
                        Arguments = "--app=" + url,
                        UseShellExecute = true
                    });
                    return;
                }
                catch (Exception ex)
                {
                    Log("ERROR lanzando Edge: " + ex.Message);
                }
            }

            string chrome = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chrome))
            {
                chrome = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }
            if (File.Exists(chrome))
            {
                try
                {
                    Log("Abriendo ventana de aplicación con Google Chrome: " + url);
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = chrome,
                        Arguments = "--app=" + url,
                        UseShellExecute = true
                    });
                    return;
                }
                catch (Exception ex)
                {
                    Log("ERROR lanzando Chrome: " + ex.Message);
                }
            }

            OpenInBrowser(url);
        }

        public static void OpenInBrowser(string url)
        {
            try
            {
                Log("Abriendo en navegador web predeterminado: " + url);
                Process.Start(new ProcessStartInfo("cmd.exe", "/c start \"\" \"" + url + "\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                });
            }
            catch (Exception ex)
            {
                Log("ERROR abriendo navegador: " + ex.Message);
            }
        }
    }

    public class ControlForm : Form
    {
        private string _localUrl;
        private int _port;
        private TextBox _txtConsole;
        private bool _consoleVisible = false;

        public ControlForm(string localUrl, int port, string distPath)
        {
            _localUrl = localUrl;
            _port = port;

            this.Text = "Asistente Adaptado con IA - Lanzador";
            this.ClientSize = new Size(540, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(18, 18, 18);
            this.ForeColor = Color.FromArgb(255, 255, 0);
            this.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;

            Label lblTitle = new Label();
            lblTitle.Text = "ASISTENTE ADAPTADO MULTIMODAL";
            lblTitle.Font = new Font("Segoe UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(255, 255, 0);
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;
            lblTitle.Location = new Point(20, 15);
            lblTitle.Size = new Size(500, 35);
            this.Controls.Add(lblTitle);

            Label lblStatus = new Label();
            lblStatus.Text = "ESTADO: SERVIDOR LOCAL ACTIVO (" + _localUrl + ")\n" +
                             "Dentro de la web también tienes el botón 'Consola Dev' (Tecla D).";
            lblStatus.TextAlign = ContentAlignment.MiddleCenter;
            lblStatus.ForeColor = Color.FromArgb(100, 255, 100);
            lblStatus.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            lblStatus.Location = new Point(20, 52);
            lblStatus.Size = new Size(500, 50);
            this.Controls.Add(lblStatus);

            Button btnReopenApp = CreateAccessibleButton("ABRIR APLICACIÓN (MODO VENTANA)", Color.FromArgb(255, 255, 0), Color.Black);
            btnReopenApp.Location = new Point(30, 112);
            btnReopenApp.Size = new Size(480, 58);
            btnReopenApp.Click += (s, e) => Program.OpenAppWindow(_localUrl);
            this.Controls.Add(btnReopenApp);

            Button btnBrowser = CreateAccessibleButton("ABRIR EN NAVEGADOR WEB NORMAL", Color.FromArgb(30, 41, 59), Color.White);
            btnBrowser.Location = new Point(30, 180);
            btnBrowser.Size = new Size(480, 58);
            btnBrowser.Click += (s, e) => Program.OpenInBrowser(_localUrl);
            this.Controls.Add(btnBrowser);

            // Botón Secundario exclusivo para Desarrolladores
            Button btnDevConsole = CreateAccessibleButton("🛠️ CONSOLA PARA DESARROLLADORES (LOGS)", Color.FromArgb(8, 51, 68), Color.FromArgb(34, 211, 238));
            btnDevConsole.FlatAppearance.BorderColor = Color.FromArgb(34, 211, 238);
            btnDevConsole.Location = new Point(30, 248);
            btnDevConsole.Size = new Size(480, 52);
            btnDevConsole.Click += (s, e) => ToggleDevConsole();
            this.Controls.Add(btnDevConsole);

            Button btnExit = CreateAccessibleButton("CERRAR ASISTENTE Y SALIR", Color.FromArgb(180, 30, 30), Color.White);
            btnExit.Location = new Point(30, 310);
            btnExit.Size = new Size(480, 52);
            btnExit.Click += (s, e) => this.Close();
            this.Controls.Add(btnExit);

            // Área de Consola de Desarrollador (oculta inicialmente hasta pulsar el botón secundario)
            _txtConsole = new TextBox();
            _txtConsole.Multiline = true;
            _txtConsole.ReadOnly = true;
            _txtConsole.ScrollBars = ScrollBars.Vertical;
            _txtConsole.BackColor = Color.Black;
            _txtConsole.ForeColor = Color.FromArgb(0, 255, 200);
            _txtConsole.Font = new Font("Consolas", 9.5F, FontStyle.Regular);
            _txtConsole.Location = new Point(20, 378);
            _txtConsole.Size = new Size(500, 210);
            _txtConsole.Visible = false;
            this.Controls.Add(_txtConsole);

            Program.OnServerLog += AppendLogLine;

            Program.Log("Servidor inicializado en puerto " + _port);
            Program.Log("Sirviendo archivos desde: " + distPath);

            this.Shown += (s, e) =>
            {
                System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
                timer.Interval = 250;
                timer.Tick += (ts, te) =>
                {
                    timer.Stop();
                    Program.OpenAppWindow(_localUrl);
                };
                timer.Start();
            };
        }

        private void ToggleDevConsole()
        {
            _consoleVisible = !_consoleVisible;
            _txtConsole.Visible = _consoleVisible;
            this.ClientSize = _consoleVisible ? new Size(540, 605) : new Size(540, 380);
        }

        private void AppendLogLine(string line)
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action<string>(AppendLogLine), line); } catch { }
                return;
            }
            _txtConsole.AppendText(line + Environment.NewLine);
        }

        private Button CreateAccessibleButton(string text, Color bg, Color fg)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.BackColor = bg;
            btn.ForeColor = fg;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderSize = 3;
            btn.FlatAppearance.BorderColor = Color.FromArgb(255, 255, 0);
            btn.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            btn.Cursor = Cursors.Hand;
            return btn;
        }
    }
}
