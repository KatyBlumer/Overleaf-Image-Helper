// ==UserScript==
// @name         (updated) Overleaf - Paste Images from Clipboard
// @namespace    http://sebastianhaas.de
// @version      0.5
// @description  Paste images from your clipboard directly into Overleaf (Community Edition, Cloud and Pro)
// @author       Sebastian Haas
// @match        https://www.overleaf.com/project/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.js
// @grant        none
// ==/UserScript==

// Forked from github.com/devyntk/Overleaf-Image-Helper -> cmprmsd/Overleaf-Image-Helper


var assetsFolderName = "images_pasted";

// Parse images from the clipboard
function retrieveImageFromClipboardAsBlob(pasteEvent, callback){
    if(pasteEvent.clipboardData == false){
        if(typeof(callback) == "function"){
            callback(undefined);
        }
    };

    var items = pasteEvent.clipboardData.items;

    if(items == undefined){
        if(typeof(callback) == "function"){
            callback(undefined);
        }
    };

    for (var i = 0; i < items.length; i++) {
        // Skip content if not image
        if (items[i].type.indexOf("image") == -1) continue;
        // Retrieve image on clipboard as blob
        var blob = items[i].getAsFile();

        if(typeof(callback) == "function"){
            callback(blob);
        }
    }
}

// Upload the image blob
function uploadImage(imageBlob, fname){
    try{
        var xhr = new XMLHttpRequest();
        var url = document.location.pathname + "/upload?folder_id=" + _ide.fileTreeManager.findEntityByPath(assetsFolderName).id + "&_csrf=" + csrfToken;
        let formData = new FormData();
        formData.append("qqfile", imageBlob, fname + ".png");
        xhr.open("POST", url, true);
        //xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var json = JSON.parse(xhr.responseText);
                console.log(json.entity_id + " Asset created :)");
            }
        };
        xhr.send(formData);
    }catch(e)
    {
        console.log(e)
    }
};

function checkAndCreateAssetsFolder(){
    if (_ide.fileTreeManager.findEntityByPath(assetsFolderName)){
        console.log("Assets folder exists...")
    }
    else {
        console.log("Assets folder does not exist...")
        try {
            _ide.fileTreeManager.createFolder(assetsFolderName,"/");
        } catch(e) {
            console.log(e);
        }
    }
}

function getCursorPositionInt() {
    const cursorPos = _ide.editorManager.$scope.currentPosition;
    const lines = window._ide.editorManager.getCurrentDocValue().split("\n");
    var posInt = 0;
    for (let idx = 0; idx < cursorPos.row; idx++) {
        posInt += lines[idx].length;
        posInt += 1; // for the newline
    }
    return posInt + cursorPos.column;
}

// Editor Startup
(function(e) {
    try{
        'use strict';
        // poll until editor is loaded
        const retry = setInterval(() => {
            console.log("Polling...")
            if (window._debug_editors === undefined) return
            console.log("Found editors");
            clearInterval(retry);
            // Create assets folder
            checkAndCreateAssetsFolder();
        }, 1000)
        } catch(e) {
            console.log(e);
        }
})();

function insertTextInLegacyEditor(text) {
    _ide.editorManager.$scope.editor.sharejs_doc.ace.insert(text);
    _ide.editorManager.$scope.editor.sharejs_doc.ace.selection.moveCursorBy(-1,1);
    _ide.editorManager.$scope.editor.sharejs_doc.ace.selection.selectWordRight()
}

// Currently this doesn't move the cursor, though the legacy editor function does.
function insertTextInNewEditor(text) {
    _ide.editorManager.$scope.editor.sharejs_doc.cm6.cmInsert(getCursorPositionInt(), text);
}


function getPasteEventHandler(insertTextFunc) {
    return function(e) {
        console.log("Got paste!");
        try {
            // Handle the event
            retrieveImageFromClipboardAsBlob(e, function(imageBlob){
                if(imageBlob){
                    checkAndCreateAssetsFolder();
                    var reader = new FileReader();
                    reader.readAsBinaryString(imageBlob);
                    reader.onloadend = function () {
                        var  fname = new Date().toISOString();
                        console.log("Uploading image...")
                        uploadImage(imageBlob, fname);
                        insertTextFunc("\\begin{figure}[h!]\n\
    \t\\centering\n\
    \t\\includegraphics[width=0.66\\textwidth]{" + assetsFolderName + "/" + fname + ".png}\n\
    \t\\caption{Caption}\n\
    \\end{figure}\n"
                                      );
                    };
                }
            })
        } catch (e) {
            console.log(e);
        }
    }
}

// Listen for paste events
document.querySelector('.ace_editor').addEventListener(
    'paste', getPasteEventHandler(insertTextInLegacyEditor)
);

document.querySelector('.cm-content').addEventListener(
    'paste', getPasteEventHandler(insertTextInNewEditor)
);
