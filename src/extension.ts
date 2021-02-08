/*
Copyright © 2021 Herbert Bärschneider

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode'; // The module 'vscode' contains the VS Code extensibility API
import { RemoteInterface } from './remoteInterface';
import { AsmHoverProvider } from './asmHoverProvider';
import { AsmCompletionItemProvider } from './asmCompletionItemProvider';
import { AsmDebugTrackerFactory } from './asmDebugTracker';
import { ExtensionSettings } from './extensionSettings';

// an extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    
    vscode.workspace.onDidChangeConfiguration(() => {
        ExtensionSettings.updateValuesFromWorkspaceConfiguration();
    });

    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', commandWrapper(commandParseAsm));
    let runAsm = vscode.commands.registerCommand('digital-asm.execute-asm', commandWrapper(commandRunAsm));
    let deriveFile = vscode.commands.registerCommand('digital-asm.getFile', () => {
        return inferTargetFileFromActiveEditor().fsPath;
    });

    let completionItemProvider = vscode.languages.registerCompletionItemProvider('asm', new AsmCompletionItemProvider());
    let hoverProvider = vscode.languages.registerHoverProvider('asm', new AsmHoverProvider());
    let asmDebugConfigProvider = vscode.debug.registerDebugConfigurationProvider('digital-conn', new AsmDebugConfigurationProvider());

    let trackerFactory = vscode.debug.registerDebugAdapterTrackerFactory('digital-conn', new AsmDebugTrackerFactory());

    // adding the implementation of the commands to the context of the extension,
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm, runAsm, deriveFile);

    // adding our providers to the context of the extension
    context.subscriptions.push(completionItemProvider, hoverProvider, asmDebugConfigProvider, trackerFactory);

}

export function deactivate() {}

// expects:
// TextDocument is a .asm file
function commandParseAsm(asmFile: vscode.TextDocument) {
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
function commandRunAsm(asmFile: vscode.TextDocument) {
    try {
        commandParseAsm(asmFile);
        
        let hexPath = asmFile.uri.fsPath.replace(".asm", ".hex");

        let remoteInterface = new RemoteInterface(ExtensionSettings.simulatorHost, ExtensionSettings.simulatorPort);
        remoteInterface.start(hexPath)
            .catch( (err) => {
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
function commandWrapper(command: (td: vscode.TextDocument) => void): (Uri: vscode.Uri, ) => Promise<void> {
    return async function(Uri: vscode.Uri) {
        if(Uri===undefined) {
            Uri = inferTargetFileFromActiveEditor();
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);

        if(!isSupportedLanguage(fileToParse)) {
            let fileLanguageIdMismatchError = new Error("Language of file isn't supported.");
            notifyUserAboutError(fileLanguageIdMismatchError);
            throw fileLanguageIdMismatchError;
        }

        if(!fs.existsSync(ExtensionSettings.asm3JarPath)) {
            let asm3JarPathIsWrongError = new Error("Path for asm3.jar doesn't point to a existing file.");
            notifyUserAboutError(asm3JarPathIsWrongError);
            throw asm3JarPathIsWrongError;
        }

        // execution of the given command
        command(fileToParse);
    };
}

function inferTargetFileFromActiveEditor(): vscode.Uri {
    let activeTextEditor = vscode.window.activeTextEditor;
    if(activeTextEditor===undefined) {
        let noFileToBeInferedError = new Error("No active file to use for debugging.");
        notifyUserAboutError(noFileToBeInferedError);
        throw noFileToBeInferedError;
    }
    return activeTextEditor.document.uri;
} 

function isSupportedLanguage(file: vscode.TextDocument): boolean {
    return file.languageId==='asm';
}

function notifyUserAboutError(err: Error) {
    vscode.window.showErrorMessage(err.message);
    console.error(err.message);
}

class AsmDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    // function for supplementing missing values into the debug configuration and or modifiying existing ones
    // gets called before variables are substituted in the launch configuration
    // we use it to put necessary information for launching the debugger into the configuration
    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): Promise<vscode.DebugConfiguration | null> {

        let fileToDebug: string | undefined = debugConfiguration.file;

        // if the debug configuration isnt given a path for the file, we try to infer the file meant via the active editor
        if(fileToDebug===undefined || !fs.existsSync(fileToDebug)) {
            fileToDebug = inferTargetFileFromActiveEditor().fsPath;
        }

        // we parse the asm file to create .hex and .map files, which are up to date with the current .asm file
        commandParseAsm(await vscode.workspace.openTextDocument(vscode.Uri.file(fileToDebug)));

        debugConfiguration = this.addAsmSpecificValuesToDebugConfiguration(debugConfiguration, fileToDebug);
        return debugConfiguration;
    }

    private addAsmSpecificValuesToDebugConfiguration(debugConfiguration: vscode.DebugConfiguration, targetFile: string): vscode.DebugConfiguration {
        debugConfiguration.pathToAsmFile = targetFile;
        debugConfiguration.pathToHexFile = targetFile.replace(".asm", ".hex");
        debugConfiguration.pathToAsmHexMapping = targetFile.replace(".asm", ".map");
        debugConfiguration.setBreakpointsAtBRK = ExtensionSettings.useBRKMnemonicsAsBreakpoints;
        debugConfiguration.HostOfSimulator = ExtensionSettings.simulatorHost;
        debugConfiguration.PortOfSimulator = ExtensionSettings.simulatorPort;
        return debugConfiguration;
    }

}
