const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    console.log('Creating Electron window...');
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false, // Disable for YouTube iframes (re-enable in production if needed)
            allowRunningInsecureContent: true // Allow mixed content for API
        }
    });

    win.loadFile('index.html').then(() => {
        console.log('index.html loaded successfully');
    }).catch(error => {
        console.error('Failed to load index.html:', error);
    });

    // Relax CSP for YouTube
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ['default-src \'self\'; frame-src https://www.youtube.com; script-src \'self\' https://www.youtube.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'self\' https://www.youtube.com']
            }
        });
    });
}

app.whenReady().then(() => {
    console.log('Electron app ready');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: false,  // This allows local file:// URLs
    allowRunningInsecureContent: true
}