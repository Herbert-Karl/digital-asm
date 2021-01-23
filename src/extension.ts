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

// extension settings
let asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
let simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "localhost");
let simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);
let brkHandling = vscode.workspace.getConfiguration().get<boolean>('asm.brkHandling', true);

// an extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // if the configuration of the workspace changes, we simply override our values referencing the extension settings
    vscode.workspace.onDidChangeConfiguration(() => {
        asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
        simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "localhost");
        simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);
        brkHandling = vscode.workspace.getConfiguration().get<boolean>('asm.brkHandling', true);
    });

    // registering commands
    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', commandFrame(commandParseAsm));
    let runAsm = vscode.commands.registerCommand('digital-asm.execute-asm', commandFrame(commandRunAsm));
    //
    let deriveFile = vscode.commands.registerCommand('digital-asm.getFile', () => {
        // returns the fs path to the file currently in the text editor
        let help = vscode.window.activeTextEditor;
        if(help===undefined) {
            // if there is neither a given path nor an active text editor, we return while showing an error message
            vscode.window.showErrorMessage("No active file.");
            console.error("No active file.");
            return null;
        }
        return help.document.uri.fsPath;
    });

    // registering our provider for completions
    let completionProvider = vscode.languages.registerCompletionItemProvider('asm', new AsmCompletionItemProvider());

    // registering our provider for hovers
    let hoverProvider = vscode.languages.registerHoverProvider('asm', new AsmHoverProvider());

    // passing our debug configuration provider for our debugger type
    let asmDebugConfigProvider = vscode.debug.registerDebugConfigurationProvider('digital-conn', new AsmConfigurationProvider());

    // creating our tracker object for our asm debug session
    let tracker = vscode.debug.registerDebugAdapterTrackerFactory('digital-conn', new AsmDebugTrackerFactory());

    // adding the implementation of the commands to the context of the extension,
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm, runAsm, deriveFile);

    // adding our providers to the context of the extension
    context.subscriptions.push(completionProvider, hoverProvider, asmDebugConfigProvider, tracker);

}

export function deactivate() {}

// function implementing the parsing of a .asm file into a .hex file
// for this, the function uses spawns a child process which executes the jar file with the given asm file
// we wait for the process to finish in order to ensure that following steps have the .hex and .lst files written to the file system
// params:
// the function takes the file, that shall be parsed, as a TextDocument
// return:
// if there is an error, an error is thrown
// if the function ended successful, `null` will be returned
// expects:
// TextDocument is a .asm file
function commandParseAsm(td: vscode.TextDocument) {
    try {
        let pathToAsm = td.uri.path;
        let child = spawnSync('java', ["-jar", asm3JarPath, pathToAsm]);
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        throw ex;
    }
}

// function implementing the execution of a .asm file
// for this, the function uses a remoteInterface to access the digital simulator
// the .asm file is parsed before running it
// params:
// the function takes the file, that shall be run, as a TextDocument
// return:
// if there is an error, an error is thrown
// if the function ended successful, `null` will be returned
// futhermore the content of the file will start to run in the digitial simulator
// expects:
// TextDocument is a .asm file
// digital simulator program is run on the local machine
function commandRunAsm(td: vscode.TextDocument) {
    try {
        commandParseAsm(td);
        
        let hexPath = td.uri.fsPath.replace(".asm", ".hex");

        let remoteInterface = new RemoteInterface(simulatorHost, simulatorPort);
        remoteInterface.start(hexPath)
            .catch( (err) => {
                vscode.window.showErrorMessage(err.message);
                console.error(err);
                throw err;
            });
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        throw ex;
    }
}

// function implementing checks before executing a given command
// params:
// function implementing the command, which shall be executed with the given file
// return:
// an asyncronise function which wraps the command with checks for the given Uri, language of the File and the asm3 jar file
function commandFrame(Command: (td: vscode.TextDocument) => void): (Uri: vscode.Uri, ) => Promise<void> {
    return async function(Uri: vscode.Uri) {
        if(Uri===undefined) {
            Uri = inferTargetFileFromActiveEditor();
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);

        if(fileToParse.languageId!=='asm') {
            // if the file doesn't match the asm languageId, we don't try to work with it and stop while showing an error message
            vscode.window.showErrorMessage("Language of file isn't supported.");
            console.error("Language of file isn't supported.");
            throw new Error("Language of file isn't supported.");
        }

        if(!fs.existsSync(asm3JarPath)) {
            // if we don't find a file at the given path for the asm3.jar, we alert the user and abort
            // continuing would creating errors when trying to use the jar file
            vscode.window.showErrorMessage("Path for asm3.jar doesn't point to a existing file.");
            console.error("Path for asm3.jar doesn't point to a existing file.");
            throw new Error("Path for asm3.jar doesn't point to a existing file.");
        }

        // execution of the given command
        Command(fileToParse);
    };

    function inferTargetFileFromActiveEditor(): vscode.Uri {
        let activeTextEditor = vscode.window.activeTextEditor;
        if(activeTextEditor===undefined) {
            // if there is neither a given URI nor an active text editor, we stop while showing an error message
            vscode.window.showErrorMessage("No given or active file.");
            console.error("No given or active file.");
            throw new Error("No given or active file for Debugging.");
        }
        return activeTextEditor.document.uri;
    } 

}

class AsmConfigurationProvider implements vscode.DebugConfigurationProvider {

    // function for supplementing missing values into the debug configuration and or modifiying existing ones
    // gets called before variables are substituted in the launch configuration
    // we use it to put necessary information for launching the debugger into the configuration
    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): Promise<vscode.DebugConfiguration | null> {

        let fileToDebug: string | undefined = debugConfiguration.file;

        // if the debug configuration isnt given a path for the file, we try to infer the file meant via the active editor
        if(fileToDebug===undefined || !fs.existsSync(fileToDebug)) {
            let activeTextEditor = vscode.window.activeTextEditor;
            if(activeTextEditor===undefined) {
                // if there is neither a given path nor an active text editor, we return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                console.error("No given or active file.");
                return null;
            }
            fileToDebug = activeTextEditor.document.uri.fsPath;
        }

        // we parse the asm file to create .hex and .map files, which are up to date with the current .asm file
        commandParseAsm(await vscode.workspace.openTextDocument(vscode.Uri.file(fileToDebug)));

        debugConfiguration.pathToAsmFile = fileToDebug;
        debugConfiguration.pathToHexFile = fileToDebug.replace(".asm", ".hex");
        debugConfiguration.pathToAsmHexMapping = fileToDebug.replace(".asm", ".map");
        debugConfiguration.setBreakpointsAtBRK = brkHandling;
        debugConfiguration.IPofSimulator = simulatorHost;
        debugConfiguration.PortOfSimulator = simulatorPort;

        return debugConfiguration;
    }

}
