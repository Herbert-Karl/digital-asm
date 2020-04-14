/*
Copyright © 2020 Herbert Bärschneider

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
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { RemoteInterface } from './remoteInterface';
import { mnemonicsArray, AsmMnemonic } from './mnemonics';

// extension settings
let asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
let simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "localhost");
let simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);
let brkHandling = vscode.workspace.getConfiguration().get<boolean>('asm.brkHandling', true);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
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

// this method is called when your extension is deactivated
export function deactivate() {}

// function implementing the parsing of a .asm file into a .hex file
// for this, the function uses spawns a child process which executes the jar file with the given asm file
// we wait for the process to finish in order to ensure that following steps have the .hex and .lst files written to the file system
// params:
// the function takes the file, that shall be parsed, as a TextDocument
// return:
// if there is an error, an error message is returned as string
// if the function ended successful, `null` will be returned
// expects:
// TextDocument is a .asm file
function commandParseAsm(td: vscode.TextDocument): string | null {
    try {
        let pathToAsm = td.uri.path;
        let child = spawnSync('java', ["-jar", asm3JarPath, pathToAsm]);
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        return ex.message;
    }
    return null;
}

// function implementing the execution of a .asm file
// for this, the function uses a remoteInterface to access the digital simulator
// the .asm file is parsed before running it
// params:
// the function takes the file, that shall be run, as a TextDocument
// return:
// if there is an error, an error message is returned as string
// if the function ended successful, `null` will be returned
// futhermore the content of the file will start to run in the digitial simulator
// expects:
// TextDocument is a .asm file
// digital simulator program is run on the local machine
function commandRunAsm(td: vscode.TextDocument): string | null {
    try {
        let error = commandParseAsm(td);
        if (error !== null) {
            return error;
        }
        let hexPath = td.uri.fsPath.replace(".asm", ".hex");

        let remoteInterface = new RemoteInterface(simulatorHost, simulatorPort);
        remoteInterface.start(hexPath)
            .catch( (err) => {
                vscode.window.showErrorMessage(err.message);
                console.error(err);
            });
    } catch (ex) {
        vscode.window.showErrorMessage(ex.message);
        console.error(ex);
        return ex.message;
    }
    return null;
}

// function implementing checks before executing a given command
// params:
// function implementing the command, which shall be executed with the given file
// return:
// an asyncronise function which wraps the command with checks for the given Uri, language of the File and the asm3 jar file
function commandFrame(Command: (td: vscode.TextDocument) => string | null): (Uri: vscode.Uri, ) => Promise<string | null> {
    return async function(Uri: vscode.Uri) {
        if(Uri===undefined) {
            // if the command isnt given an URI for the file, we try to infer the file meant via the active editor
            let help = vscode.window.activeTextEditor;
            if(help===undefined) {
                // if there is neither a given URI nor an active text editor, we return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                console.error("No given or active file.");
                return "No given or active file.";
            }
            Uri = help.document.uri;
        }

        let fileToParse = await vscode.workspace.openTextDocument(Uri);

        if(fileToParse.languageId!=='asm') {
            // if the file doesn't match the asm languageId, we don't try to work with it and return while showing an error message
            vscode.window.showErrorMessage("Language of file isn't supported.");
            console.error("Language of file isn't supported.");
            return "Language of file isn't supported.";
        }

        if(!fs.existsSync(asm3JarPath)) {
            // if we don't find a file at the given path for the asm3.jar, we alert the user and abort
            // continuing would creating errors when trying to access the classes contained in the jar file
            vscode.window.showErrorMessage("Path for asm3.jar doesn't point to a existing file.");
            console.error("Path for asm3.jar doesn't point to a existing file.");
            return "Path for asm3.jar doesn't point to a existing file.";
        }

        // execution of the given command
        return Command(fileToParse);
    };
}

// class containing our provided completions for asm files
class AsmCompletionItemProvider implements vscode.CompletionItemProvider {

    // for collecting all of our completions for the mnemonics of the assembler
    private mnemonicCompletionItems: Array<vscode.CompletionItem>;

    constructor() {
        // because the mnemonic completion items are static, we create them once and store them
        this.mnemonicCompletionItems = new Array<vscode.CompletionItem>();
         // putting all of our mnemonics into the array of completion items
         mnemonicsArray.forEach((elem: AsmMnemonic) => {
            this.mnemonicCompletionItems.push(createCompletionItem(elem.label, elem.detail, elem.doc, vscode.CompletionItemKind.Keyword));
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        return this.mnemonicCompletionItems;
    }

}

// helper function
// used to create CompletionItems and set wanted attributes
function createCompletionItem(label: string, detail: string, doc: string, kind: vscode.CompletionItemKind): vscode.CompletionItem {
    let newCompletionItem = new vscode.CompletionItem(label, kind);
    newCompletionItem.detail = detail;
    newCompletionItem.documentation = doc;
    return newCompletionItem;
}

// class implementing hovers for our asm mnemonics
class AsmHoverProvider implements vscode.HoverProvider {

    private hoverMap: Map<string, vscode.Hover>;

    constructor() {
        this.hoverMap = new Map<string, vscode.Hover>();
        // creating hovers for each mnemonic and putting all of them into the map with the mnemonic as key for easy retrieval
        mnemonicsArray.forEach((elem: AsmMnemonic) => {
            let newHover = new vscode.Hover(elem.detail+"\n\n"+elem.doc);
            this.hoverMap.set(elem.label, newHover);
        });
    }

    public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let range = document.getWordRangeAtPosition(position);
        let word = document.getText(range);

        return this.hoverMap.get(word);
    }

}

class AsmConfigurationProvider implements vscode.DebugConfigurationProvider {

    // function for supplementing missing values into the debug configuration and or modifiying existing ones
    // gets called before variables are substituted in the launch configuration
    // we use it to put necessary information for launching the debugger into the configuration
    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken | undefined): Promise<vscode.DebugConfiguration | null> {

        let file: string | undefined = debugConfiguration.file;

        // if the debug configuration isnt given a path for the file, we try to infer the file meant via the active editor
        if(file===undefined || !fs.existsSync(file)) {
            let help = vscode.window.activeTextEditor;
            if(help===undefined) {
                // if there is neither a given path nor an active text editor, we return while showing an error message
                vscode.window.showErrorMessage("No given or active file.");
                console.error("No given or active file.");
                return null;
            }
            file = help.document.uri.fsPath;
        }

        // we parse the asm file to create .hex and .map files, which are up to date with the current .asm file
        commandParseAsm(await vscode.workspace.openTextDocument(vscode.Uri.file(file)));

        // putting our needed information into the debugConfiguration
        debugConfiguration.pathToAsmFile = file;
        debugConfiguration.pathToHexFile = file.replace(".asm", ".hex");
        debugConfiguration.pathToAsmHexMapping = file.replace(".asm", ".map");
        debugConfiguration.setBreakpointsAtBRK = brkHandling;
        debugConfiguration.IPofSimulator = simulatorHost;
        debugConfiguration.PortOfSimulator = simulatorPort;

        return debugConfiguration;
    }

}

// class implemented to log the messages of the debug adapter protocol between the vscode generic debug ui and a running debug adapter
// useful for checking, which requests and responses are send between those two as well as the content of those messages
// the messages are written to a read-only outputchannel
class AsmDebugTracker implements vscode.DebugAdapterTracker {

    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel("digital-asm DAP log");
    }

    public onWillStartSession() {
        this.channel.appendLine("Session with debug adapter starting ...");
    }

    public onWillReceiveMessage(message: any) {
        this.channel.appendLine("From VS Code: "+JSON.stringify(message));
    }

    public onDidSendMessage(message: any) {
        this.channel.appendLine("To VS Code: "+JSON.stringify(message));
    }

    public onWillStopSession() {
        this.channel.appendLine("Session with debug adapter ended");
    }

    // clean up function to free ressources associated with the output channel
    dispose() {
        this.channel.dispose();
    }

}

// factory class for producing a tracker for a given debug session
class AsmDebugTrackerFactory implements vscode.DebugAdapterTrackerFactory {

    // because we use the tracker only to log the messages exchanges in the debug session, we do not use the debug session object
    public createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new AsmDebugTracker();
    }

}
