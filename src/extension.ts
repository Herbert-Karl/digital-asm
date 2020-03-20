// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let parseAsm = vscode.commands.registerCommand('digital-asm.parse-asm', () => {
        console.log("profit");
    });

    // adding the implementation of the commands to the context of the extension, 
    //so that the implementations will be executed, when the commands are called
    context.subscriptions.push(parseAsm);
}

// this method is called when your extension is deactivated
export function deactivate() {}