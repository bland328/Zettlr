/* Wrapper class for BrowserWindow (reduce clutter in main class) */

const {dialog, BrowserWindow} = require('electron')
const url                     = require('url');
const path                    = require('path');

class ZettlrWindow
{
    constructor(parent)
    {
        this.parent = parent;
        this.window = null;
    }

    // Create and open a new main window
    open()
    {
        if(this.window != null) {
            // There is still a window active, so don't do anything (one-window app)
            return;
        }

        // First create a new browserWindow
        this.window = new BrowserWindow({
            width: 1000,
            height: 600,
            show: false,
            icon: 'icons/png/64x64.png',
            backgroundColor: '#fff',
            scrollBounce: true, // The nice scrolling effect for macOS
            defaultEncoding: 'utf8', // Why the hell does this default to ISO?
            // devTools: false, ---- TODO: ACTIVATE WHEN READY WITH DEVELOPING
        });

        // Save this object as a parent to the browser window
        // this.window.parent = this;

        // Then activate listeners.
        // and load the index.html of the app.
        this.window.loadURL(url.format({
            pathname: path.join(__dirname, '../renderer/assets/index.htm'),
            protocol: 'file:',
            slashes: true
        }));

        // EVENT LISTENERS

        // Only show window once it is completely initialized + maximize it
        this.window.once('ready-to-show', () => {
            this.window.show();
            this.window.maximize();
            this.parent.afterWindowStart();
        });

        // Emitted when the window is closed.
        this.window.on('closed', () => {
            this.close();
        });

        // Emitted when the user wants to close the window.
        this.window.on('close', (event) => {
            // Only check, if we can close. Unless we can, abort closing process.
            if(!this.canClose()) {
                event.preventDefault();
                // Parent's (ZettlrWindow) parent (Zettlr)
                this.parent.saveAndClose();
            } else {
                // We can close - so clear down the cache in any case
                let ses = this.window.webContents.session;
                // Do not "clearCache" because that would only delete my own index files
                ses.clearStorageData({
                    storages: [
                        'appcache',
                        'cookies',          // Nobody needs cookies except for downloading pandoc etc
                        'localstorage',
                        'shadercache',      // Should never contain anything
                        'websql'
                    ]
                });
            }
        });

        // Prevent closing if unable to comply
        this.window.beforeunload = (e) => {
            if(!this.canClose()) {
                // Prevent closing for now.
                e.returnValue = false;
                // And ask the user to save changes. The parent will then re-
                // emit the close-event which in the second round will not
                // trigger this event.
                this.parent.saveAndClose();
            }
        };

        // Set the application menu
        require('./main-menu.js');
    }
    // END this.open

    setTitle(newTitle)
    {
        this.window.setTitle(newTitle);
    }

    getTitle()
    {
        return this.window.getTitle();
    }

    setModified()
    {
        // Set the modified flag on the window if the file is edited (macOS only)
        // Function does nothing if not on macOS
        if(this.window != null) {
            this.window.setDocumentEdited(true);
        }
        // Indicate in title (for all OS)
        let title = this.window.getTitle();
        if(title.substr(0, 1) != "*") {
            this.window.setTitle('*' + title);
        }
    }

    clearModified()
    {
        // Clear the modified flag on the window if the file is edited (macOS only)
        if(this.window != null) {
            this.window.setDocumentEdited(false);
        }
        // Indicate in title
        let title = this.window.getTitle();
        if(title.substr(0, 1) == "*") {
            this.window.setTitle(title.substr(1));
        }
    }

    getWindow()
    {
        return this.window;
    }

    // FUNCTIONS CALLED FROM WITHIN EVENT LISTENERS
    close()
    {
        // Dereference the window.
        this.window = null;
    }

    // The window asks if it can close itself - so lets's ask our main process
    // whether it's okay.
    canClose()
    {
        return this.parent.canClose();
    }

    // This function belongs to the window because the dialog is attached to the
    // window. It asks the user whether or not he wants to save, omit or cancel.
    askSaveChanges()
    {
        let ret = dialog.showMessageBox(this.window, {
            type: "question",
            title: 'Omit unsaved changes?',
            message: 'There are unsaved changes to the current file. Do you want to omit them or save?',
            buttons: [
                'Cancel',
                'Save',
                'Omit changes'
            ],
            cancelId: 0
        });

        // ret can have three status: cancel = 0, save = 1, omit = 2.
        // To keep up with semantics, the function "askSaveChanges" would
        // naturally return "true" if the user wants to save changes and "false"
        // - so how deal with "omit" changes?
        // Well I don't want to create some constants so let's just leave it
        // with these three values.
        return ret;
    }

    // Show dialog to open another folder.
    askDir(startDir)
    {
        return dialog.showOpenDialog(this.window, {
            title: 'Open project folder',
            defaultPath: startDir,
            properties: [
                'openDirectory',
                'createDirectory' // macOS only
            ]
        });
    }

    // This function prompts the user with information.
    prompt(options)
    {
        dialog.showMessageBox(this.window, {
            type: options.type,
            buttons: [ 'Ok' ],
            defaultId: 0,
            title: options.title,
            message: options.message
        });
    }

    // Ask to remove the given obj
    confirmRemove(obj)
    {
        let ret = dialog.showMessageBox(this.window, {
            type: 'warning',
            buttons: [ 'Ok', 'Cancel' ],
            defaultId: 1,
            title: 'Really delete?',
            message: 'Do you really want to remove ' + obj.type + ' ' + obj.name + '?'
        });

        return (ret == 0);
    }
}

module.exports = ZettlrWindow;