import { spawnSync } from 'child_process';
import * as fs from 'fs';
var java = require("java"); // used to interface with jar files
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { RemoteInterface } from './remoteInterface';

// plugin settings
let asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
let simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "127.0.0.1");
let simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {  
    // if the configuration of the workspace changes, we simply override our values referencing the plugin settings
    vscode.workspace.onDidChangeConfiguration(() => {
        asm3JarPath = vscode.workspace.getConfiguration().get<string>('asm.assembler', "./asm3.jar");
        simulatorHost = vscode.workspace.getConfiguration().get<string>('asm.simulatorHost', "127.0.0.1");
        simulatorPort = vscode.workspace.getConfiguration().get<number>('asm.simulatorPort', 41114);
    });

    // registering commands 
    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', commandFrame(commandParseAsm));
    let runAsm = vscode.commands.registerCommand('digital-asm.execute-asm', commandFrame(commandRunAsm));

    // adding the implementation of the commands to the context of the extension, 
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm, runAsm);
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
        let pathToHex = td.uri.path;
        let child = spawnSync('java', ["-jar", asm3JarPath, pathToHex]);
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

        java.classpath.push(path.join(asm3JarPath));

        // execution of the given command
        return await Command(fileToParse);
    };
}