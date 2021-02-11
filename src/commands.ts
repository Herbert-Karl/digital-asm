import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { RemoteInterface } from './debugging/remoteInterface';
import { ExtensionSettings } from './extensionSettings';
import { inferTargetFileFromActiveEditor, notifyUserAboutError, isSupportedLanguage } from './utility';

// expects:
// TextDocument is a .asm file
export function commandParseAsm(asmFile: vscode.TextDocument) {
    try {
        let pathToAsm = asmFile.uri.path;
        // we wait for the process to finish in order to ensure that following steps have the .hex and .lst files written to the file system
        let _ = spawnSync('java', ["-jar", ExtensionSettings.asm3JarPath, pathToAsm]);
    } catch (ex) {
        notifyUserAboutError(ex);
        throw ex;
    }
}

// expects:
// TextDocument is a .asm file
// digital simulator program is run on the local machine (true?)
export function commandRunAsm(asmFile: vscode.TextDocument) {
    try {
        commandParseAsm(asmFile);

        let hexPath = asmFile.uri.fsPath.replace(".asm", ".hex");

        let remoteInterface = new RemoteInterface(ExtensionSettings.simulatorHost, ExtensionSettings.simulatorPort);
        remoteInterface.start(hexPath)
            .catch((err) => {
                notifyUserAboutError(err);
                throw err;
            });
    } catch (ex) {
        notifyUserAboutError(ex);
        throw ex;
    }
}

// function implementing checks before executing a given command
// params:
// function implementing the command, which shall be executed with the given file
// return:
// an asyncronise function which wraps the command with checks for the given Uri, language of the File and the asm3 jar file
export function commandWrapper(command: (td: vscode.TextDocument) => void): (Uri: vscode.Uri) => Promise<void> {
    return async function (Uri: vscode.Uri) {
        if (Uri === undefined) {
            Uri = inferTargetFileFromActiveEditor();
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);

        if (!isSupportedLanguage(fileToParse)) {
            let fileLanguageIdMismatchError = new Error("Language of file isn't supported.");
            notifyUserAboutError(fileLanguageIdMismatchError);
            throw fileLanguageIdMismatchError;
        }

        if (!fs.existsSync(ExtensionSettings.asm3JarPath)) {
            let asm3JarPathIsWrongError = new Error("Path for asm3.jar doesn't point to a existing file.");
            notifyUserAboutError(asm3JarPathIsWrongError);
            throw asm3JarPathIsWrongError;
        }

        // execution of the given command
        command(fileToParse);
    };
}
